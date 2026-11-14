import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ACCESS_COOKIE, verifyAccessToken } from '../lib/tokens';
import { ForbiddenError, UnauthorizedError } from '../lib/errors';

async function resolveAuth(req: Request): Promise<void> {
  const token = req.cookies?.[ACCESS_COOKIE] as string | undefined;
  if (!token) {
    throw new UnauthorizedError('Sesi tidak ditemukan. Silakan masuk.', 'SESSION_NOT_FOUND');
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new UnauthorizedError('Sesi sudah berakhir. Silakan masuk lagi.', 'SESSION_EXPIRED');
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
  };
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
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

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) {
    throw new UnauthorizedError('Sesi tidak ditemukan. Silakan masuk.', 'SESSION_NOT_FOUND');
  }
  if (req.auth.role !== 'ADMIN') {
    throw new ForbiddenError('Akses ini hanya untuk admin', 'ADMIN_ONLY');
  }
  return next();
}

export function requireActiveOrganizer(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) {
    throw new UnauthorizedError('Sesi tidak ditemukan. Silakan masuk.', 'SESSION_NOT_FOUND');
  }
  if (!req.auth.organizerId || req.auth.organizerStatus !== 'ACTIVE') {
    throw new ForbiddenError(
      'Akun organizer belum aktif atau belum disetujui',
      'ORGANIZER_NOT_ACTIVE',
    );
  }
  return next();
}
