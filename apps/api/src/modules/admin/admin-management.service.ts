import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { hashPassword } from '../../lib/password';
import { writeAudit } from '../../lib/audit';
import { BadRequestError, ConflictError, NotFoundError } from '../../lib/errors';
import type { ListQuery } from '../finance/finance.schemas';

const adminFields = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().email().toLowerCase(),
  role: z.enum(['ADMIN', 'SUPERADMIN']).default('ADMIN'),
  status: z.enum(['ACTIVE', 'SUSPENDED']).default('ACTIVE'),
});
export const createAdminSchema = adminFields.extend({ password: z.string().min(8).max(128) });
export const updateAdminSchema = adminFields.partial();
export const resetAdminSchema = z.object({ password: z.string().min(8).max(128) });
const selectAdmin = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listAdmins(query: ListQuery) {
  const where: Prisma.UserWhereInput = {
    role: { in: ['ADMIN', 'SUPERADMIN'] },
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { email: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const [total, data] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: selectAdmin,
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      skip: (query.page - 1) * query.limit,
    }),
  ]);
  return {
    data,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}
export async function getAdmin(id: string) {
  const admin = await prisma.user.findFirst({
    where: { id, role: { in: ['ADMIN', 'SUPERADMIN'] } },
    select: selectAdmin,
  });
  if (!admin) throw new NotFoundError('Admin tidak ditemukan');
  return admin;
}
export async function createAdmin(input: z.infer<typeof createAdminSchema>, req: Request) {
  const passwordHash = await hashPassword(input.password);
  return prisma.$transaction(async (tx) => {
    if (await tx.user.findUnique({ where: { email: input.email } }))
      throw new ConflictError('Email sudah terdaftar');
    const { password: _password, ...data } = input;
    const admin = await tx.user.create({
      data: { ...data, passwordHash, emailVerifiedAt: new Date() },
      select: selectAdmin,
    });
    await writeAudit(
      {
        actorUserId: req.auth!.userId,
        action: 'ADMIN_CREATED',
        resourceType: 'ADMIN',
        resourceId: admin.id,
        metadata: { name: admin.name, email: admin.email, role: admin.role },
        req,
      },
      tx,
    );
    return admin;
  });
}
export async function updateAdmin(
  id: string,
  input: z.infer<typeof updateAdminSchema>,
  req: Request,
) {
  return prisma.$transaction(async (tx) => {
    // Lock in a stable order so two simultaneous demotions cannot remove the last Superadmin.
    await tx.$queryRaw`SELECT id FROM users WHERE role::text IN ('ADMIN', 'SUPERADMIN') ORDER BY id FOR UPDATE`;
    const current = await tx.user.findUnique({ where: { id }, select: selectAdmin });
    if (!current || !['ADMIN', 'SUPERADMIN'].includes(current.role))
      throw new NotFoundError('Admin tidak ditemukan');
    if (
      current.role === 'SUPERADMIN' &&
      current.status === 'ACTIVE' &&
      (input.role === 'ADMIN' || input.status === 'SUSPENDED')
    ) {
      const active = await tx.user.count({ where: { role: 'SUPERADMIN', status: 'ACTIVE' } });
      if (active <= 1)
        throw new ConflictError(
          'Superadmin aktif terakhir tidak dapat dinonaktifkan atau diturunkan rolenya',
          'LAST_SUPERADMIN',
        );
    }
    if (
      input.email &&
      input.email !== current.email &&
      (await tx.user.findUnique({ where: { email: input.email } }))
    )
      throw new ConflictError('Email sudah terdaftar');
    const admin = await tx.user.update({ where: { id }, data: input, select: selectAdmin });
    await tx.refreshSession.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await writeAudit(
      {
        actorUserId: req.auth!.userId,
        action: 'ADMIN_MODIFIED',
        resourceType: 'ADMIN',
        resourceId: id,
        metadata: { before: current, after: input },
        req,
      },
      tx,
    );
    return admin;
  });
}
export async function resetAdminPassword(id: string, password: string, req: Request) {
  await getAdmin(id);
  const passwordHash = await hashPassword(password);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { passwordHash } });
    await tx.refreshSession.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await writeAudit(
      {
        actorUserId: req.auth!.userId,
        action: 'ADMIN_PASSWORD_RESET',
        resourceType: 'ADMIN',
        resourceId: id,
        req,
      },
      tx,
    );
  });
  return { reset: true };
}

export const PERMISSIONS = [
  'events',
  'tickets',
  'orders',
  'check-in',
  'finance',
  'payouts',
  'content',
  'support',
  'users',
  'organizers',
] as const;
export const permissionSchema = z.object({
  role: z.enum(['CREATOR', 'ADMIN', 'SUPERADMIN']),
  permission: z.enum(PERMISSIONS),
  enabled: z.boolean(),
});
export async function listPermissions() {
  const rows = await prisma.rolePermission.findMany();
  return ['SUPERADMIN', 'ADMIN', 'CREATOR'].flatMap((role) =>
    PERMISSIONS.map((permission) => ({
      role,
      permission,
      enabled:
        role !== 'CREATOR' ||
        permission === 'organizers' ||
        (rows.find((row) => row.role === role && row.permission === permission)?.enabled ??
          !['content', 'users', 'organizers'].includes(permission)),
      scope: role === 'CREATOR' ? 'OWN_ORGANIZER' : 'GLOBAL',
      editable: role === 'CREATOR' && !['content', 'users', 'organizers'].includes(permission),
    })),
  );
}
export async function updatePermission(input: z.infer<typeof permissionSchema>, req: Request) {
  if (input.role !== 'CREATOR' || ['content', 'users', 'organizers'].includes(input.permission))
    throw new BadRequestError(
      'Hak operasional Admin dan Superadmin dikunci sama; Creator tidak dapat memperoleh akses global',
    );
  return prisma.$transaction(async (tx) => {
    const permission = await tx.rolePermission.upsert({
      where: { role_permission: { role: input.role, permission: input.permission } },
      create: input,
      update: { enabled: input.enabled },
    });
    await writeAudit(
      {
        actorUserId: req.auth!.userId,
        action: 'ROLE_PERMISSION_UPDATED',
        resourceType: 'ROLE_PERMISSION',
        resourceId: permission.id,
        metadata: input,
        req,
      },
      tx,
    );
    return permission;
  });
}
