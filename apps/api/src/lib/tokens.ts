import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import type { CookieOptions } from 'express';
import { env } from '../config/env';
import type { AccessTokenPayload } from '../modules/auth/auth.types';

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

export function signAccessToken(userId: string, role: AccessTokenPayload['role']): string {
  const payload: AccessTokenPayload = { sub: userId, role, type: 'access' };
  return jwt.sign(payload, env.AUTH_ACCESS_TOKEN_SECRET, {
    expiresIn: env.AUTH_ACCESS_TOKEN_TTL as SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.AUTH_ACCESS_TOKEN_SECRET, { algorithms: ['HS256'] });
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
    type: 'access',
  };
}

export function authCookieOptions(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export function clearCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export const accessTtlMs = () => durationToMs(env.AUTH_ACCESS_TOKEN_TTL);
export const refreshTtlMs = () => durationToMs(env.AUTH_REFRESH_TOKEN_TTL);
