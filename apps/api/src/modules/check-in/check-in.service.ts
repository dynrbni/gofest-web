import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import type { ScanTicketInput } from '@gofest/shared';
import { prisma } from '../../lib/prisma';
import { sha256 } from '../../lib/crypto';
import { ForbiddenError, NotFoundError } from '../../lib/errors';
import { logger } from '../../lib/logger';

const SCAN_MESSAGES = {
  VALID: 'Tiket valid. Check-in berhasil.',
  ALREADY_USED: 'Tiket ini sudah pernah dipakai.',
  INVALID: 'Kode tiket tidak ditemukan atau tidak sah.',
  CANCELLED: 'Tiket ini sudah dibatalkan atau di-refund.',
  WRONG_EVENT: 'Tiket ini bukan untuk event yang sedang dibuka.',
} as const;

type ScanResult = keyof typeof SCAN_MESSAGES;

export interface ScanAccess {
  event: {
    id: string;
    title: string;
    organizerId: string;
  };
  accessRole: 'OWNER' | 'CHECK_IN' | 'MANAGER';
}

async function findEventAccess(eventId: string, userId: string): Promise<ScanAccess> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      organizerId: true,
      organizer: { select: { userId: true } },
      staff: {
        where: { userId },
        select: { role: true },
        take: 1,
      },
    },
  });
  if (!event) throw new NotFoundError('Event tidak ditemukan', 'EVENT_NOT_FOUND');

  if (event.organizer.userId === userId) {
    return {
      event: { id: event.id, title: event.title, organizerId: event.organizerId },
      accessRole: 'OWNER',
    };
  }
  const staff = event.staff[0];
  if (!staff) {
    throw new ForbiddenError(
      'Kamu tidak ditugaskan sebagai petugas event ini',
      'CHECK_IN_NOT_ASSIGNED',
    );
  }
  return {
    event: { id: event.id, title: event.title, organizerId: event.organizerId },
    accessRole: staff.role,
  };
}

export async function listStaffEvents(userId: string) {
  const events = await prisma.event.findMany({
    where: {
      OR: [{ organizer: { userId } }, { staff: { some: { userId } } }],
    },
    orderBy: [{ startsAt: 'asc' }],
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      startsAt: true,
      endsAt: true,
      timezone: true,
      venueName: true,
      city: true,
      organizer: { select: { organizationName: true } },
      staff: { where: { userId }, select: { role: true }, take: 1 },
    },
  });

  const eventIds = events.map((event) => event.id);
  const counts = eventIds.length
    ? await prisma.ticket.groupBy({
        by: ['eventId', 'status'],
        where: { eventId: { in: eventIds } },
        _count: { _all: true },
      })
    : [];

  const countMap = new Map<string, Record<string, number>>();
  for (const row of counts) {
    const bucket = countMap.get(row.eventId) ?? {};
    bucket[row.status] = row._count._all;
    countMap.set(row.eventId, bucket);
  }

  return events.map((event) => {
    const status = event.staff[0];
    const isOwner = !status;
    const buckets = countMap.get(event.id) ?? {};
    return {
      ...event,
      staff: undefined,
      accessRole: isOwner ? 'OWNER' : status!.role,
      ticketCounts: {
        valid: buckets.VALID ?? 0,
        checkedIn: buckets.CHECKED_IN ?? 0,
        cancelled: buckets.CANCELLED ?? 0,
        refunded: buckets.REFUNDED ?? 0,
      },
    };
  });
}

interface ScanTicketRecord {
  id: string;
  eventId: string;
  ticketCode: string;
  holderName: string;
  status: 'VALID' | 'CHECKED_IN' | 'CANCELLED' | 'REFUNDED';
  checkedInAt: Date | null;
  ticketType: { name: string };
  order: { orderCode: string };
}

function serializeScannedTicket(ticket: ScanTicketRecord) {
  return {
    id: ticket.id,
    ticketCode: ticket.ticketCode,
    holderName: ticket.holderName,
    status: ticket.status,
    checkedInAt: ticket.checkedInAt,
    ticketTypeName: ticket.ticketType.name,
    orderCode: ticket.order.orderCode,
  };
}

interface PreviousLog {
  result: ScanResult;
  scannedAt: Date;
  ticket: ScanTicketRecord | null;
}

function replayLog(log: PreviousLog) {
  return {
    result: log.result,
    accepted: log.result === 'VALID',
    message: SCAN_MESSAGES[log.result],
    scannedAt: log.scannedAt,
    ticket: log.ticket ? serializeScannedTicket(log.ticket) : null,
    replayed: true,
  };
}

const scanTicketSelect = {
  id: true,
  eventId: true,
  ticketCode: true,
  holderName: true,
  status: true,
  checkedInAt: true,
  ticketType: { select: { name: true } },
  order: { select: { orderCode: true } },
} as const;

export async function scanTicket(input: ScanTicketInput, userId: string, req: Request) {
  const access = await findEventAccess(input.eventId, userId);

  if (input.idempotencyKey) {
    const existing = await prisma.checkInLog.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: {
        result: true,
        scannedAt: true,
        ticket: { select: scanTicketSelect },
      },
    });
    if (existing) {
      return replayLog(existing);
    }
  }

  let ticket: ScanTicketRecord | null = null;
  if (input.token) {
    ticket = await prisma.ticket.findUnique({
      where: { qrTokenHash: sha256(input.token) },
      select: scanTicketSelect,
    });
  } else if (input.ticketCode) {
    ticket = await prisma.ticket.findUnique({
      where: { ticketCode: input.ticketCode.toUpperCase() },
      select: scanTicketSelect,
    });
  }

  let result: ScanResult;
  let accepted = false;
  let scannedAt = new Date();

  if (!ticket) {
    result = 'INVALID';
  } else if (ticket.eventId !== access.event.id) {
    result = 'WRONG_EVENT';
  } else if (ticket.status === 'CANCELLED' || ticket.status === 'REFUNDED') {
    result = 'CANCELLED';
  } else if (ticket.status === 'CHECKED_IN') {
    result = 'ALREADY_USED';
  } else {
    // A conditional update guarantees only one device can move VALID -> CHECKED_IN.
    const now = new Date();
    const updated = await prisma.ticket.updateMany({
      where: { id: ticket.id, status: 'VALID' },
      data: {
        status: 'CHECKED_IN',
        checkedInAt: now,
        checkedInByUserId: userId,
      },
    });
    if (updated.count === 1) {
      result = 'VALID';
      accepted = true;
      scannedAt = now;
      ticket = { ...ticket, status: 'CHECKED_IN', checkedInAt: now };
    } else {
      const refreshed = await prisma.ticket.findUniqueOrThrow({
        where: { id: ticket.id },
        select: scanTicketSelect,
      });
      ticket = refreshed;
      result = refreshed.status === 'CHECKED_IN' ? 'ALREADY_USED' : 'CANCELLED';
    }
  }

  let logId: string | null = null;
  try {
    const log = await prisma.checkInLog.create({
      data: {
        ticketId: ticket?.id ?? null,
        eventId: access.event.id,
        staffId: userId,
        result,
        gate: input.gate ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        requestId: req.id ? String(req.id) : null,
        scannedAt,
      },
      select: { id: true },
    });
    logId = log.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await prisma.checkInLog.findUnique({
        where: { idempotencyKey: input.idempotencyKey! },
        select: {
          result: true,
          scannedAt: true,
          ticket: { select: scanTicketSelect },
        },
      });
      if (existing) {
        return replayLog(existing);
      }
    }
    throw error;
  }

  logger.info(
    {
      checkInLogId: logId,
      eventId: access.event.id,
      ticketId: ticket?.id ?? null,
      result,
      staffId: userId,
      gate: input.gate ?? null,
    },
    'Check-in diproses',
  );

  return {
    result,
    accepted,
    message: SCAN_MESSAGES[result],
    scannedAt,
    ticket: ticket ? serializeScannedTicket(ticket) : null,
    replayed: false,
  };
}

export async function getCheckInSummary(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      startsAt: true,
      endsAt: true,
      timezone: true,
      venueName: true,
      city: true,
    },
  });
  if (!event) throw new NotFoundError('Event tidak ditemukan', 'EVENT_NOT_FOUND');

  const [groups, recentScans, lastScan] = await Promise.all([
    prisma.ticket.groupBy({
      by: ['status'],
      where: { eventId },
      _count: { _all: true },
    }),
    prisma.checkInLog.findMany({
      where: { eventId },
      orderBy: { scannedAt: 'desc' },
      take: 12,
      select: {
        id: true,
        result: true,
        gate: true,
        scannedAt: true,
        staff: { select: { name: true } },
        ticket: { select: { ticketCode: true, holderName: true } },
      },
    }),
    prisma.checkInLog.findFirst({
      where: { eventId, result: 'VALID' },
      orderBy: { scannedAt: 'desc' },
      select: { scannedAt: true },
    }),
  ]);

  const counts: Record<string, number> = {};
  for (const group of groups) counts[group.status] = group._count._all;
  const issued = (counts.VALID ?? 0) + (counts.CHECKED_IN ?? 0);
  const checkedIn = counts.CHECKED_IN ?? 0;

  return {
    event,
    counts: {
      valid: counts.VALID ?? 0,
      checkedIn,
      cancelled: counts.CANCELLED ?? 0,
      refunded: counts.REFUNDED ?? 0,
    },
    issued,
    attendanceRate: issued === 0 ? 0 : Math.round((checkedIn / issued) * 1000) / 10,
    lastScanAt: lastScan?.scannedAt ?? null,
    recentScans: recentScans.map((scan) => ({
      id: scan.id,
      result: scan.result,
      gate: scan.gate,
      scannedAt: scan.scannedAt,
      staffName: scan.staff.name,
      ticketCode: scan.ticket?.ticketCode ?? null,
      holderName: scan.ticket?.holderName ?? null,
    })),
  };
}

export async function getOrganizerCheckInSummary(
  eventId: string,
  organizerId: string,
) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organizerId: true },
  });
  if (!event) throw new NotFoundError('Event tidak ditemukan', 'EVENT_NOT_FOUND');
  if (event.organizerId !== organizerId) {
    throw new ForbiddenError('Event ini bukan milik organizer kamu', 'EVENT_NOT_OWNED');
  }
  return getCheckInSummary(eventId);
}

export async function getStaffCheckInSummary(eventId: string, userId: string) {
  await findEventAccess(eventId, userId);
  return getCheckInSummary(eventId);
}
