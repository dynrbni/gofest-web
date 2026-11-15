import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { hashPassword, verifyPassword } from '../../lib/password';
import { randomToken, sha256 } from '../../lib/crypto';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../lib/errors';
import { refreshTtlMs, signAccessToken } from '../../lib/tokens';
import type { AuthUser } from '@gofest/shared';
import { enqueueEmail } from '../notifications/email.service';

interface SessionResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

function requestMeta(req: Request) {
  return {
    ip: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
  };
}

function toAuthUser(user: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'USER' | 'ADMIN';
  organizerProfile: { slug: string; status: string } | null;
  staffAssignments?: { id: string }[];
}): AuthUser {
  const roles: string[] = ['USER'];
  if (user.role === 'ADMIN') roles.push('ADMIN');
  if (user.organizerProfile?.status === 'ACTIVE') roles.push('ORGANIZER');
  if (user.staffAssignments && user.staffAssignments.length > 0) roles.push('STAFF');
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    roles,
    organizerStatus: user.organizerProfile?.status ?? null,
    organizerSlug: user.organizerProfile?.slug ?? null,
  };
}

async function createSession(
  userId: string,
  role: 'USER' | 'ADMIN',
  req: Request,
): Promise<SessionResult> {
  const refreshToken = randomToken(48);
  const meta = requestMeta(req);
  await prisma.refreshSession.create({
    data: {
      userId,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + refreshTtlMs()),
      ip: meta.ip,
      userAgent: meta.userAgent,
    },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { organizerProfile: true, staffAssignments: { select: { id: true }, take: 1 } },
  });

  return {
    user: toAuthUser(user),
    accessToken: signAccessToken(user.id, role),
    refreshToken,
  };
}

export async function register(
  input: {
    username: string;
    email: string;
    phone?: string;
    password: string;
    verificationToken: string;
  },
  req: Request,
): Promise<SessionResult> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError('Email sudah terdaftar', 'EMAIL_ALREADY_REGISTERED');
  }
  if (await prisma.user.findUnique({ where: { username: input.username } })) {
    throw new ConflictError('Username sudah digunakan. Pilih username lain.', 'USERNAME_TAKEN');
  }
  const passwordHash = await hashPassword(input.password);
  const user = await prisma
    .$transaction(async (tx) => {
      const now = new Date();
      const proof = await tx.registrationChallenge.deleteMany({
        where: {
          email: input.email,
          proofHash: sha256(input.verificationToken),
          verifiedAt: { not: null },
          proofExpiresAt: { gt: now },
        },
      });
      if (proof.count !== 1)
        throw new BadRequestError(
          'Verifikasi email sudah berakhir. Minta kode baru untuk melanjutkan.',
          undefined,
          'REGISTRATION_VERIFICATION_REQUIRED',
        );
      return tx.user.create({
        data: {
          name: input.username,
          username: input.username,
          email: input.email,
          phone: input.phone ?? null,
          passwordHash,
          emailVerifiedAt: now,
        },
      });
    })
    .catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = error.meta?.target;
        if (Array.isArray(target) && target.includes('username')) {
          throw new ConflictError(
            'Username sudah digunakan. Pilih username lain.',
            'USERNAME_TAKEN',
          );
        }
        if (Array.isArray(target) && target.includes('email')) {
          throw new ConflictError('Email sudah terdaftar', 'EMAIL_ALREADY_REGISTERED');
        }
      }
      throw error;
    });
  return createSession(user.id, user.role, req);
}

export async function login(
  input: { email: string; password: string },
  req: Request,
): Promise<SessionResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { organizerProfile: true, staffAssignments: { select: { id: true }, take: 1 } },
  });
  if (!user || !(await verifyPassword(user.passwordHash, input.password))) {
    throw new UnauthorizedError('Email atau password salah', 'INVALID_CREDENTIALS');
  }
  if (user.status === 'SUSPENDED') {
    throw new ForbiddenError('Akun ini sedang ditangguhkan', 'ACCOUNT_SUSPENDED');
  }
  if (user.status === 'DELETED') {
    throw new UnauthorizedError('Email atau password salah', 'INVALID_CREDENTIALS');
  }
  return createSession(user.id, user.role, req);
}

export async function refresh(rawToken: string | undefined, req: Request): Promise<SessionResult> {
  if (!rawToken) {
    throw new UnauthorizedError('Sesi tidak ditemukan', 'SESSION_NOT_FOUND');
  }
  const session = await prisma.refreshSession.findUnique({
    where: { tokenHash: sha256(rawToken) },
    include: {
      user: {
        include: { organizerProfile: true, staffAssignments: { select: { id: true }, take: 1 } },
      },
    },
  });
  if (!session || session.expiresAt <= new Date()) {
    throw new UnauthorizedError('Sesi sudah berakhir. Silakan masuk lagi.', 'SESSION_EXPIRED');
  }
  if (session.revokedAt) {
    // A revoked refresh token being replayed suggests theft: revoke every active session.
    await prisma.refreshSession.updateMany({
      where: { userId: session.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new UnauthorizedError('Sesi sudah dipakai. Silakan masuk lagi.', 'SESSION_REUSED');
  }
  if (session.user.status !== 'ACTIVE') {
    throw new UnauthorizedError('Akun tidak aktif', 'ACCOUNT_INACTIVE');
  }
  const revoked = await prisma.refreshSession.updateMany({
    where: { id: session.id, revokedAt: null },
    data: { revokedAt: new Date(), lastUsedAt: new Date() },
  });
  if (revoked.count !== 1) {
    throw new UnauthorizedError('Sesi sudah dipakai. Silakan masuk lagi.', 'SESSION_REUSED');
  }
  return createSession(session.userId, session.user.role, req);
}

export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  await prisma.refreshSession.updateMany({
    where: { tokenHash: sha256(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== 'ACTIVE') {
    return;
  }
  const token = randomToken(32);
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });
  const resetUrl = `${env.WEB_URL}/reset-password?token=${encodeURIComponent(token)}`;
  await enqueueEmail({
    to: user.email,
    subject: 'Atur ulang password Gofest',
    template: 'PASSWORD_RESET',
    payload: {
      name: user.name,
      resetUrl,
      expiresMinutes: 30,
    },
  });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });
  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    throw new NotFoundError(
      'Token reset tidak valid atau sudah kedaluwarsa',
      'INVALID_RESET_TOKEN',
    );
  }
  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.refreshSession.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export async function getMe(userId: string): Promise<AuthUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { organizerProfile: true, staffAssignments: { select: { id: true }, take: 1 } },
  });
  if (!user) {
    throw new UnauthorizedError('Sesi tidak valid', 'SESSION_INVALID');
  }
  return toAuthUser(user);
}

export async function updateProfile(
  userId: string,
  input: { name: string; phone?: string },
): Promise<AuthUser> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name: input.name, phone: input.phone ?? null },
    include: { organizerProfile: true, staffAssignments: { select: { id: true }, take: 1 } },
  });
  return toAuthUser(user);
}
