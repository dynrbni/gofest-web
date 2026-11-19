import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { writeAudit } from '../../lib/audit';
import { NotFoundError } from '../../lib/errors';
import type { ListQuery } from '../finance/finance.schemas';
import { notifyAdmins, notifyUser } from '../notifications/inbox.service';

export const contentSchema = z.object({
  kind: z.enum(['HOMEPAGE', 'BANNER', 'CAMPAIGN']),
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(2000).nullable().optional(),
  imageUrl: z.string().url().max(1000).nullable().optional(),
  targetUrl: z
    .string()
    .max(1000)
    .refine(
      (value) => (value.startsWith('/') && !value.startsWith('//')) || /^https?:\/\//.test(value),
      'Gunakan URL http(s) atau path internal',
    )
    .nullable()
    .optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});
export const supportSchema = z.object({
  subject: z.string().trim().min(5).max(150),
  message: z.string().trim().min(10).max(5000),
});
export const supportReplySchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']),
  reply: z.string().trim().min(5).max(5000),
});
const meta = (query: ListQuery, total: number) => ({
  page: query.page,
  limit: query.limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / query.limit)),
});
const paging = (query: ListQuery) => ({ take: query.limit, skip: (query.page - 1) * query.limit });

export async function listContent(query: ListQuery, kind?: string) {
  const where = {
    ...(kind ? { kind } : {}),
    ...(query.q ? { title: { contains: query.q, mode: 'insensitive' as const } } : {}),
  };
  const [total, data] = await Promise.all([
    prisma.contentItem.count({ where }),
    prisma.contentItem.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      ...paging(query),
    }),
  ]);
  return { data, meta: meta(query, total) };
}
export async function saveContent(
  id: string | undefined,
  input: z.infer<typeof contentSchema>,
  req: Request,
) {
  return prisma.$transaction(async (tx) => {
    if (id && !(await tx.contentItem.findUnique({ where: { id } }))) throw new NotFoundError();
    const item = id
      ? await tx.contentItem.update({ where: { id }, data: input })
      : await tx.contentItem.create({ data: input });
    await writeAudit(
      {
        actorUserId: req.auth!.userId,
        action: id ? 'CONTENT_UPDATED' : 'CONTENT_CREATED',
        resourceType: 'CONTENT',
        resourceId: item.id,
        metadata: input,
        req,
      },
      tx,
    );
    return item;
  });
}
export async function deleteContent(id: string, req: Request) {
  await prisma.$transaction(async (tx) => {
    if (!(await tx.contentItem.findUnique({ where: { id } }))) throw new NotFoundError();
    await tx.contentItem.delete({ where: { id } });
    await writeAudit(
      {
        actorUserId: req.auth!.userId,
        action: 'CONTENT_DELETED',
        resourceType: 'CONTENT',
        resourceId: id,
        req,
      },
      tx,
    );
  });
  return { deleted: true };
}

export async function listSupport(query: ListQuery, userId?: string) {
  const where = {
    ...(userId ? { userId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.q ? { subject: { contains: query.q, mode: 'insensitive' as const } } : {}),
  };
  const [total, data] = await Promise.all([
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { updatedAt: 'desc' },
      ...paging(query),
    }),
  ]);
  return { data, meta: meta(query, total) };
}
export async function createSupport(input: z.infer<typeof supportSchema>, req: Request) {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.supportTicket.create({ data: { ...input, userId: req.auth!.userId } });
    await notifyAdmins(tx, {
      category: 'SUPPORT',
      title: 'Tiket bantuan baru',
      message: input.subject,
      href: '/admin/support',
    });
    return ticket;
  });
}
export async function replySupport(
  id: string,
  input: z.infer<typeof supportReplySchema>,
  req: Request,
) {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundError();
    const result = await tx.supportTicket.update({ where: { id }, data: input });
    await notifyUser(tx, {
      category: 'SUPPORT',
      userId: ticket.userId,
      title: 'Balasan dukungan GOFEST',
      message: input.reply,
      href: '/creator/support',
    });
    await writeAudit(
      {
        actorUserId: req.auth!.userId,
        action: 'SUPPORT_REPLIED',
        resourceType: 'SUPPORT',
        resourceId: id,
        metadata: { status: input.status },
        req,
      },
      tx,
    );
    return result;
  });
}

type EventOperationsQuery = ListQuery & { eventId?: string };

export async function checkInMonitoring(query: EventOperationsQuery, organizerId?: string) {
  const event: Prisma.EventWhereInput = {
    id: query.eventId,
    ...(organizerId ? { organizerId } : {}),
    ...(query.q ? { title: { contains: query.q, mode: 'insensitive' } } : {}),
  };
  const [tickets, results, total, data, staff, staffTotal] = await Promise.all([
    prisma.ticket.groupBy({ by: ['status'], where: { event }, _count: { _all: true } }),
    prisma.checkInLog.groupBy({ by: ['result'], where: { event }, _count: { _all: true } }),
    prisma.checkInLog.count({ where: { event } }),
    prisma.checkInLog.findMany({
      where: { event },
      ...paging(query),
      orderBy: { scannedAt: 'desc' },
      include: {
        event: { select: { id: true, title: true } },
        ticket: { select: { ticketCode: true, holderName: true, eventId: true } },
        staff: { select: { id: true, name: true } },
      },
    }),
    prisma.eventStaff.findMany({
      where: { event },
      orderBy: { assignedAt: 'desc' },
      ...paging(query),
      include: {
        user: { select: { id: true, name: true, email: true, status: true } },
        event: { select: { id: true, title: true } },
      },
    }),
    prisma.eventStaff.count({ where: { event } }),
  ]);
  const count = Object.fromEntries(tickets.map((row) => [row.status, row._count._all]));
  const scans = Object.fromEntries(results.map((row) => [row.result, row._count._all]));
  return {
    data: data.map((row) => ({
      ...row,
      ticket: row.ticket?.eventId === row.eventId ? row.ticket : null,
      ticketId: row.ticket?.eventId === row.eventId ? row.ticketId : null,
    })),
    staff,
    staffMeta: meta(query, staffTotal),
    summary: {
      totalAttendees: (count.VALID ?? 0) + (count.CHECKED_IN ?? 0),
      checkedIn: count.CHECKED_IN ?? 0,
      notCheckedIn: count.VALID ?? 0,
      invalid: (scans.INVALID ?? 0) + (scans.CANCELLED ?? 0) + (scans.WRONG_EVENT ?? 0),
      duplicateAttempts: scans.ALREADY_USED ?? 0,
    },
    meta: meta(query, total),
  };
}

export async function listAttendees(query: EventOperationsQuery, organizerId?: string) {
  const where: Prisma.TicketWhereInput = {
    eventId: query.eventId,
    ...(organizerId ? { event: { organizerId } } : {}),
    ...(query.q
      ? {
          OR: [
            { holderName: { contains: query.q, mode: 'insensitive' } },
            { holderEmail: { contains: query.q, mode: 'insensitive' } },
            { ticketCode: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const [total, data] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      ...paging(query),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ticketCode: true,
        holderName: true,
        holderEmail: true,
        status: true,
        checkedInAt: true,
        event: { select: { id: true, title: true } },
        ticketType: { select: { name: true } },
      },
    }),
  ]);
  return { data, meta: meta(query, total) };
}
