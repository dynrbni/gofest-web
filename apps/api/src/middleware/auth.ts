import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ACCESS_COOKIE, verifyAccessToken, verifyReauthToken } from '../lib/tokens';
import { ForbiddenError, UnauthorizedError } from '../lib/errors';
import { verifyPassword } from '../lib/password';
import { isOperationalAdmin } from '@gofest/shared';

function extractToken(req: Request): string | undefined {
  const authHeader = req.get('authorization') || req.headers.authorization;
  if (authHeader && typeof authHeader === 'string') {
    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() === 'bearer' && token) {
      return token.trim();
    }
  }
  return req.cookies?.[ACCESS_COOKIE] as string | undefined;
}

async function resolveAuth(req: Request): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    throw new UnauthorizedError('Sesi tidak ditemukan. Silakan masuk.', 'SESSION_NOT_FOUND');
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new UnauthorizedError('Sesi sudah berakhir. Silakan masuk lagi.', 'SESSION_EXPIRED');
  }

  if (payload.sessionId) {
    const session = await prisma.refreshSession.findUnique({
      where: { id: payload.sessionId },
      select: { id: true, revokedAt: true, expiresAt: true, familyId: true },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedError(
        'Sesi sudah dicabut atau berakhir. Silakan masuk lagi.',
        'SESSION_REVOKED',
      );
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { organizerProfile: { select: { id: true, status: true } } },
  });

  if (!user || user.status !== 'ACTIVE') {
    throw new UnauthorizedError('Sesi tidak valid. Silakan masuk lagi.', 'SESSION_INVALID');
  }

  req.auth = {
    userId: user.id,
    role: user.role,
    organizerId: user.organizerProfile?.id ?? null,
    organizerStatus: user.organizerProfile?.status ?? null,
    sessionId: payload.sessionId,
    familyId: payload.familyId,
  };
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (req.auth) return next();
  await resolveAuth(req);
  return next();
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    await resolveAuth(req);
  } catch {
    req.auth = undefined;
  }
  return next();
}

export async function requireReauth(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) {
    await resolveAuth(req);
  }
  const userId = req.auth!.userId;

  // 1. Check header x-reauth-token
  const headerToken = req.get('x-reauth-token');
  if (headerToken) {
    try {
      const decoded = verifyReauthToken(headerToken);
      if (decoded.sub === userId) {
        return next();
      }
    } catch {
      // Invalid or expired re-auth token; fall through to other checks
    }
  }

  // 2. Check inline password if supplied in request body
  const inlinePassword = req.body?.reauthPassword || req.body?.password;
  if (inlinePassword && typeof inlinePassword === 'string') {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user && (await verifyPassword(user.passwordHash, inlinePassword))) {
      return next();
    }
  }

  // 3. Check session recency (grace period: active session created/reauthed within 15 mins)
  if (req.auth?.sessionId) {
    const session = await prisma.refreshSession.findUnique({
      where: { id: req.auth.sessionId },
      select: { createdAt: true, lastReauthAt: true },
    });
    if (session) {
      const authTime = session.lastReauthAt ?? session.createdAt;
      const ageMs = Date.now() - authTime.getTime();
      if (ageMs < 15 * 60 * 1000) {
        return next();
      }
    }
  }

  throw new ForbiddenError(
    'Tindakan ini memerlukan re-autentikasi password untuk keamanan.',
    'REAUTH_REQUIRED',
  );
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) {
    throw new UnauthorizedError('Sesi tidak ditemukan. Silakan masuk.', 'SESSION_NOT_FOUND');
  }
  if (!isOperationalAdmin(req.auth.role)) {
    throw new ForbiddenError('Akses ini hanya untuk admin', 'ADMIN_ONLY');
  }
  return next();
}

export function requireSuperadmin(req: Request, _res: Response, next: NextFunction) {
  if (req.auth?.role !== 'SUPERADMIN') {
    throw new ForbiddenError('Akses ini hanya untuk Superadmin', 'SUPERADMIN_ONLY');
  }
  return next();
}

export async function requireActiveOrganizer(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) {
    throw new UnauthorizedError('Sesi tidak ditemukan. Silakan masuk.', 'SESSION_NOT_FOUND');
  }
  if (
    isOperationalAdmin(req.auth.role) ||
    !req.auth.organizerId ||
    req.auth.organizerStatus !== 'ACTIVE'
  ) {
    throw new ForbiddenError(
      'Akun organizer belum aktif atau belum disetujui',
      'ORGANIZER_NOT_ACTIVE',
    );
  }
  const path = req.path;
  const permission = /payouts|bank-accounts/.test(path)
    ? 'payouts'
    : /financial|event-reports|analytics|ledger/.test(path)
      ? 'finance'
      : /check-in|staff/.test(path)
        ? 'check-in'
        : /orders|attendees/.test(path)
          ? 'orders'
          : /ticket-types|coupons/.test(path)
            ? 'tickets'
            : /support/.test(path)
              ? 'support'
              : /events/.test(path)
                ? 'events'
                : null;
  if (permission) {
    const rule = await prisma.rolePermission.findUnique({
      where: { role_permission: { role: 'CREATOR', permission } },
    });
    if (rule?.enabled === false)
      throw new ForbiddenError('Modul ini dinonaktifkan untuk Creator', 'PERMISSION_DISABLED');
  }
  return next();
}
