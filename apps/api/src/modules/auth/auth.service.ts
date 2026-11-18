import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { assertOwnedImage, normalizeImageKey } from '../uploads/upload.service';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { hashPassword, verifyPassword } from '../../lib/password';
import { randomToken, sha256 } from '../../lib/crypto';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../lib/errors';
import {
  parseDeviceInfo,
  refreshTtlMs,
  signAccessToken,
  signRefreshToken,
  signReauthToken,
  verifyRefreshToken,
} from '../../lib/tokens';
import type { AuthUser, UserRole } from '@gofest/shared';
import { writeAudit } from '../../lib/audit';
import { enqueueEmail } from '../notifications/email.service';
import { env } from '../../config/env';

interface SessionResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

function requestMeta(req: Request) {
  const userAgent = req.get('user-agent') ?? null;
  return {
    ip: req.ip ?? null,
    userAgent,
    deviceInfo: parseDeviceInfo(userAgent),
  };
}

function toAuthUser(user: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarKey: string | null;
  role: UserRole;
  organizerProfile: { slug: string; status: string } | null;
  staffAssignments?: { id: string }[];
}): AuthUser {
  const roles: string[] = ['USER'];
  if (user.role === 'ADMIN' || user.role === 'SUPERADMIN') roles.push(user.role);
  if (!['ADMIN', 'SUPERADMIN'].includes(user.role) && user.organizerProfile?.status === 'ACTIVE')
    roles.push('ORGANIZER', 'CREATOR');
  if (user.staffAssignments && user.staffAssignments.length > 0) roles.push('STAFF');
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatarKey: user.avatarKey,
    roles,
    organizerStatus: user.organizerProfile?.status ?? null,
    organizerSlug: user.organizerProfile?.slug ?? null,
  };
}

function getEffectiveRole(authUser: AuthUser): UserRole | 'CREATOR' {
  if (authUser.roles.includes('SUPERADMIN')) return 'SUPERADMIN';
  if (authUser.roles.includes('ADMIN')) return 'ADMIN';
  if (authUser.roles.includes('CREATOR') || authUser.roles.includes('ORGANIZER')) return 'CREATOR';
  return 'USER';
}

async function createSession(
  userId: string,
  role: UserRole | 'CREATOR',
  req: Request,
  existingFamilyId?: string,
): Promise<SessionResult> {
  const sessionId = randomUUID();
  const familyId = existingFamilyId ?? randomUUID();
  const refreshToken = signRefreshToken(userId, role, sessionId, familyId);
  const meta = requestMeta(req);
  const now = new Date();

  // Check if this user has previously logged in from this device
  if (meta.deviceInfo) {
    const priorDevice = await prisma.refreshSession.findFirst({
      where: { userId, deviceInfo: meta.deviceInfo },
      select: { id: true },
    });
    if (!priorDevice) {
      await writeAudit({
        actorUserId: userId,
        action: 'NEW_DEVICE_LOGIN',
        resourceType: 'SESSION',
        resourceId: sessionId,
        metadata: { deviceInfo: meta.deviceInfo, ip: meta.ip },
        req,
      });
    }
  }

  await prisma.refreshSession.create({
    data: {
      id: sessionId,
      userId,
      familyId,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + refreshTtlMs(role)),
      ip: meta.ip,
      userAgent: meta.userAgent,
      deviceInfo: meta.deviceInfo,
      lastUsedAt: now,
      createdAt: now,
    },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { organizerProfile: true, staffAssignments: { select: { id: true }, take: 1 } },
  });

  return {
    user: toAuthUser(user),
    accessToken: signAccessToken(user.id, role, sessionId, familyId),
    refreshToken,
  };
}

export async function register(
  input: {
    name: string;
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
          name: input.name,
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

  await writeAudit({
    actorUserId: user.id,
    action: 'REGISTER_SUCCESS',
    resourceType: 'USER',
    resourceId: user.id,
    req,
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
    await writeAudit({
      action: 'LOGIN_FAILED',
      resourceType: 'USER',
      resourceId: input.email,
      metadata: { reason: 'INVALID_CREDENTIALS' },
      req,
    });
    throw new UnauthorizedError('Email atau password salah', 'INVALID_CREDENTIALS');
  }
  if (user.status === 'SUSPENDED') {
    await writeAudit({
      actorUserId: user.id,
      action: 'LOGIN_FAILED',
      resourceType: 'USER',
      resourceId: user.id,
      metadata: { reason: 'ACCOUNT_SUSPENDED' },
      req,
    });
    throw new ForbiddenError('Akun ini sedang ditangguhkan', 'ACCOUNT_SUSPENDED');
  }
  if (user.status === 'DELETED') {
    await writeAudit({
      actorUserId: user.id,
      action: 'LOGIN_FAILED',
      resourceType: 'USER',
      resourceId: user.id,
      metadata: { reason: 'ACCOUNT_DELETED' },
      req,
    });
    throw new UnauthorizedError('Email atau password salah', 'INVALID_CREDENTIALS');
  }
  if (user.status !== 'ACTIVE') {
    await writeAudit({
      actorUserId: user.id,
      action: 'LOGIN_FAILED',
      resourceType: 'USER',
      resourceId: user.id,
      metadata: { reason: 'ACCOUNT_INACTIVE' },
      req,
    });
    throw new ForbiddenError('Akun belum aktif', 'ACCOUNT_INACTIVE');
  }
  await writeAudit({
    actorUserId: user.id,
    action: 'LOGIN',
    resourceType: 'USER',
    resourceId: user.id,
    req,
  });
  const authUser = toAuthUser(user);
  return createSession(user.id, getEffectiveRole(authUser), req);
}

const inFlightRefreshes = new Map<string, Promise<SessionResult>>();

export async function refresh(rawToken: string | undefined, req: Request): Promise<SessionResult> {
  if (!rawToken) {
    throw new UnauthorizedError('Sesi tidak ditemukan', 'SESSION_NOT_FOUND');
  }

  // Cryptographically verify the refresh token JWT
  try {
    verifyRefreshToken(rawToken);
  } catch {
    throw new UnauthorizedError('Sesi sudah berakhir. Silakan masuk lagi.', 'SESSION_EXPIRED');
  }

  const tokenHash = sha256(rawToken);

  // If a concurrent refresh for the same token is already in-flight, await and share the result
  const existingFlight = inFlightRefreshes.get(tokenHash);
  if (existingFlight) {
    return existingFlight;
  }

  const refreshPromise = (async () => {
    const session = await prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: { organizerProfile: true, staffAssignments: { select: { id: true }, take: 1 } },
        },
      },
    });

    if (!session || session.expiresAt <= new Date()) {
      throw new UnauthorizedError('Sesi sudah berakhir. Silakan masuk lagi.', 'SESSION_EXPIRED');
    }

    // Refresh Token Rotation & Reuse Detection
    if (session.revokedAt) {
      // Replay attack! Revoke entire token family to prevent theft!
      await prisma.refreshSession.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date(), revocationReason: 'REUSE_DETECTED' },
      });

      await writeAudit({
        actorUserId: session.userId,
        action: 'REFRESH_TOKEN_REUSE_DETECTED',
        resourceType: 'SESSION',
        resourceId: session.id,
        metadata: { familyId: session.familyId, ip: req.ip },
        req,
      });

      throw new UnauthorizedError('Sesi sudah dipakai. Silakan masuk lagi.', 'SESSION_REUSED');
    }

    if (session.user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Akun tidak aktif', 'ACCOUNT_INACTIVE');
    }

    // Atomic database rotation in transaction
    const now = new Date();
    const nextSessionId = randomUUID();
    const authUser = toAuthUser(session.user);
    const effectiveRole = getEffectiveRole(authUser);
    const nextRefreshToken = signRefreshToken(
      session.userId,
      effectiveRole,
      nextSessionId,
      session.familyId,
    );
    const nextTokenHash = sha256(nextRefreshToken);
    const meta = requestMeta(req);

    await prisma.$transaction(async (tx) => {
      const updateResult = await tx.refreshSession.updateMany({
        where: { id: session.id, revokedAt: null },
        data: {
          revokedAt: now,
          revocationReason: 'ROTATED',
          lastUsedAt: now,
          rotatedToId: nextSessionId,
        },
      });
      if (updateResult.count !== 1) {
        throw new UnauthorizedError('Sesi sudah dipakai. Silakan masuk lagi.', 'SESSION_REUSED');
      }
      await tx.refreshSession.create({
        data: {
          id: nextSessionId,
          userId: session.userId,
          familyId: session.familyId,
          tokenHash: nextTokenHash,
          expiresAt: new Date(Date.now() + refreshTtlMs(effectiveRole)),
          ip: meta.ip,
          userAgent: meta.userAgent,
          deviceInfo: meta.deviceInfo,
          lastUsedAt: now,
          createdAt: now,
        },
      });
    });

    await writeAudit({
      actorUserId: session.userId,
      action: 'TOKEN_REFRESH',
      resourceType: 'SESSION',
      resourceId: nextSessionId,
      req,
    });

    return {
      user: authUser,
      accessToken: signAccessToken(
        session.userId,
        effectiveRole,
        nextSessionId,
        session.familyId,
      ),
      refreshToken: nextRefreshToken,
    };
  })();

  inFlightRefreshes.set(tokenHash, refreshPromise);
  try {
    return await refreshPromise;
  } finally {
    inFlightRefreshes.delete(tokenHash);
  }
}

export async function logout(rawToken: string | undefined, req?: Request): Promise<void> {
  if (!rawToken) return;
  const tokenHash = sha256(rawToken);
  const session = await prisma.refreshSession.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true },
  });
  if (session) {
    await prisma.refreshSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date(), revocationReason: 'LOGOUT' },
    });
    await writeAudit({
      actorUserId: session.userId,
      action: 'LOGOUT',
      resourceType: 'SESSION',
      resourceId: session.id,
      req,
    });
  }
}

export async function logoutAll(userId: string, req: Request): Promise<void> {
  await prisma.refreshSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date(), revocationReason: 'ALL_SESSIONS_REVOKED' },
  });
  await writeAudit({
    actorUserId: userId,
    action: 'LOGOUT_ALL',
    resourceType: 'USER',
    resourceId: userId,
    req,
  });
}

export async function listSessions(userId: string, currentSessionId?: string) {
  const sessions = await prisma.refreshSession.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  return sessions.map((s) => ({
    id: s.id,
    ip: s.ip,
    userAgent: s.userAgent,
    deviceInfo: s.deviceInfo ?? parseDeviceInfo(s.userAgent),
    createdAt: s.createdAt.toISOString(),
    lastActivity: (s.lastUsedAt ?? s.createdAt).toISOString(),
    expiresAt: s.expiresAt.toISOString(),
    isCurrent: Boolean(currentSessionId && s.id === currentSessionId),
  }));
}

export async function revokeSession(
  userId: string,
  sessionId: string,
  req: Request,
): Promise<{ revoked: boolean }> {
  const session = await prisma.refreshSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!session) {
    throw new NotFoundError('Sesi tidak ditemukan atau bukan milik akun Anda.');
  }
  await prisma.refreshSession.update({
    where: { id: sessionId },
    data: { revokedAt: new Date(), revocationReason: 'USER_REVOKED' },
  });
  await writeAudit({
    actorUserId: userId,
    action: 'SESSION_REVOCATION',
    resourceType: 'SESSION',
    resourceId: sessionId,
    req,
  });
  return { revoked: true };
}

export async function reauthenticate(
  userId: string,
  password: string,
  req: Request,
): Promise<{ success: boolean; reauthToken: string; expiresAt: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    await writeAudit({
      actorUserId: userId,
      action: 'REAUTHENTICATION_FAILED',
      resourceType: 'USER',
      resourceId: userId,
      req,
    });
    throw new UnauthorizedError('Password salah untuk re-autentikasi.', 'INVALID_REAUTH_PASSWORD');
  }

  // Update session reauth timestamp if sessionId available
  if (req.auth?.sessionId) {
    await prisma.refreshSession.update({
      where: { id: req.auth.sessionId },
      data: { lastReauthAt: new Date() },
    });
  }

  await writeAudit({
    actorUserId: userId,
    action: 'REAUTHENTICATION_SUCCESS',
    resourceType: 'USER',
    resourceId: userId,
    req,
  });

  const reauthToken = signReauthToken(userId, user.role);
  return {
    success: true,
    reauthToken,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  };
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
      data: { revokedAt: new Date(), revocationReason: 'CREDENTIALS_CHANGED' },
    }),
  ]);

  await writeAudit({
    actorUserId: record.userId,
    action: 'PASSWORD_RESET',
    resourceType: 'USER',
    resourceId: record.userId,
  });
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
  input: { name: string; phone?: string; avatarKey?: string | null },
): Promise<AuthUser> {
  await assertOwnedImage(input.avatarKey, userId, 'avatars');
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      phone: input.phone ?? null,
      ...(input.avatarKey !== undefined
        ? { avatarKey: input.avatarKey ? normalizeImageKey(input.avatarKey) : null }
        : {}),
    },
    include: { organizerProfile: true, staffAssignments: { select: { id: true }, take: 1 } },
  });
  return toAuthUser(user);
}
