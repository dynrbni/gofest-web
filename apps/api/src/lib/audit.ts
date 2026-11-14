import type { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { prisma } from './prisma';

type DbClient = Prisma.TransactionClient | typeof prisma;

export interface AuditInput {
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  req?: Request;
}

export async function writeAudit(input: AuditInput, db: DbClient = prisma) {
  return db.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      ip: input.req?.ip ?? null,
      userAgent: input.req?.get('user-agent') ?? null,
      requestId: input.req?.id ? String(input.req.id) : null,
    },
  });
}
