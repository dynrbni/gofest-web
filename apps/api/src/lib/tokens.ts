import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import type { CookieOptions } from 'express';
import { env } from '../config/env';
import type {
  AccessTokenPayload,
  RefreshTokenPayload,
  ReauthTokenPayload,
} from '../modules/auth/auth.types';
import type { UserRole } from '@gofest/shared';

export const ACCESS_COOKIE = 'gf_access';
export const REFRESH_COOKIE = 'gf_refresh';

export function durationToMs(value: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value.trim());
  if (!match) {
    throw new Error(`Durasi tidak valid: ${value}`);
  }
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return amount * (multipliers[unit!] ?? 0);
}

export interface JwtRoleTtl {
  accessTtl: string;
  refreshTtl: string;
  accessTtlMs: number;
  refreshTtlMs: number;
}

export function getJwtConfig(role?: UserRole | string): JwtRoleTtl {
  switch (role) {
    case 'SUPERADMIN':
      return {
        accessTtl: env.JWT_SUPERADMIN_ACCESS_EXPIRES_IN,
        refreshTtl: env.JWT_SUPERADMIN_REFRESH_EXPIRES_IN,
        accessTtlMs: durationToMs(env.JWT_SUPERADMIN_ACCESS_EXPIRES_IN),
        refreshTtlMs: durationToMs(env.JWT_SUPERADMIN_REFRESH_EXPIRES_IN),
      };
    case 'ADMIN':
      return {
        accessTtl: env.JWT_ADMIN_ACCESS_EXPIRES_IN,
        refreshTtl: env.JWT_ADMIN_REFRESH_EXPIRES_IN,
        accessTtlMs: durationToMs(env.JWT_ADMIN_ACCESS_EXPIRES_IN),
        refreshTtlMs: durationToMs(env.JWT_ADMIN_REFRESH_EXPIRES_IN),
      };
    case 'CREATOR':
    case 'USER':
    default:
      return {
        accessTtl: env.JWT_ACCESS_EXPIRES_IN,
        refreshTtl: env.JWT_REFRESH_EXPIRES_IN,
        accessTtlMs: durationToMs(env.JWT_ACCESS_EXPIRES_IN),
        refreshTtlMs: durationToMs(env.JWT_REFRESH_EXPIRES_IN),
      };
  }
}

export function signAccessToken(
  userId: string,
  role: UserRole,
  sessionId?: string,
  familyId?: string,
): string {
  const ttl = getJwtConfig(role);
  const payload: AccessTokenPayload = {
    sub: userId,
    role,
    ...(sessionId ? { sessionId } : {}),
    ...(familyId ? { familyId } : {}),
    type: 'access',
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: ttl.accessTtl as SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
  if (typeof decoded === 'string') {
    throw new Error('Token payload tidak valid');
  }
  const payload = decoded as JwtPayload & Partial<AccessTokenPayload>;
  if (
    !payload.sub ||
    payload.type !== 'access' ||
    !payload.role ||
    !['USER', 'ADMIN', 'SUPERADMIN', 'CREATOR'].includes(payload.role)
  ) {
    throw new Error('Token payload tidak valid');
  }
  return {
    sub: payload.sub,
    role: payload.role,
    sessionId: payload.sessionId,
    familyId: payload.familyId,
    type: 'access',
  };
}

export function signRefreshToken(
  userId: string,
  role: UserRole,
  sessionId?: string,
  familyId?: string,
): string {
  const ttl = getJwtConfig(role);
  const payload: RefreshTokenPayload = {
    sub: userId,
    role,
    ...(sessionId ? { sessionId } : {}),
    ...(familyId ? { familyId } : {}),
    type: 'refresh',
  };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: ttl.refreshTtl as SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] });
  if (typeof decoded === 'string') {
    throw new Error('Token payload tidak valid');
  }
  const payload = decoded as JwtPayload & Partial<RefreshTokenPayload>;
  if (
    !payload.sub ||
    payload.type !== 'refresh' ||
    !payload.role ||
    !['USER', 'ADMIN', 'SUPERADMIN', 'CREATOR'].includes(payload.role)
  ) {
    throw new Error('Token payload tidak valid');
  }
  return {
    sub: payload.sub,
    role: payload.role,
    sessionId: payload.sessionId,
    familyId: payload.familyId,
    type: 'refresh',
  };
}

export function signReauthToken(userId: string, role: UserRole): string {
  const payload: ReauthTokenPayload = {
    sub: userId,
    role,
    type: 'reauth',
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: '10m',
    algorithm: 'HS256',
  });
}

export function verifyReauthToken(token: string): ReauthTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
  if (typeof decoded === 'string') {
    throw new Error('Token payload tidak valid');
  }
  const payload = decoded as JwtPayload & Partial<ReauthTokenPayload>;
  if (!payload.sub || payload.type !== 'reauth' || !payload.role) {
    throw new Error('Token re-autentikasi tidak valid');
  }
  return {
    sub: payload.sub,
    role: payload.role,
    type: 'reauth',
  };
}

export function authCookieOptions(maxAgeMs: number, path = '/'): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path,
    maxAge: maxAgeMs,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export function refreshCookieOptions(maxAgeMs: number): CookieOptions {
  return authCookieOptions(maxAgeMs, '/api/v1/auth');
}

export function clearCookieOptions(path = '/'): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export function parseDeviceInfo(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  let browser = 'Browser';
  if (/edg/i.test(userAgent)) browser = 'Edge';
  else if (/chrome|crios/i.test(userAgent)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(userAgent)) browser = 'Firefox';
  else if (/safari/i.test(userAgent)) browser = 'Safari';
  else if (/postman/i.test(userAgent)) browser = 'Postman';
  else if (/curl/i.test(userAgent)) browser = 'cURL';

  let os = 'Unknown OS';
  if (/windows/i.test(userAgent)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(userAgent)) os = 'macOS';
  else if (/iphone|ipad|ipod/i.test(userAgent)) os = 'iOS';
  else if (/android/i.test(userAgent)) os = 'Android';
  else if (/linux/i.test(userAgent)) os = 'Linux';

  let device = 'Desktop';
  if (/tablet|ipad/i.test(userAgent)) device = 'Tablet';
  else if (/mobile|iphone|android/i.test(userAgent)) device = 'Mobile';

  return `${browser} on ${os} (${device})`;
}

export const accessTtlMs = (role?: UserRole | string) => getJwtConfig(role).accessTtlMs;
export const refreshTtlMs = (role?: UserRole | string) => getJwtConfig(role).refreshTtlMs;

