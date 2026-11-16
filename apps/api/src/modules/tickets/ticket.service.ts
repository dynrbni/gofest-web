import type { Prisma } from '@prisma/client';
import type { Request } from 'express';
import type { TicketListQuery } from '@gofest/shared';
import { prisma } from '../../lib/prisma';
import { sha256, safeCompare } from '../../lib/crypto';
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../lib/errors';

export async function listEventTickets(
  eventId: string,
  organizerId: string,
  query: TicketListQuery,
) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organizerId: true, title: true, slug: true },
  });
  if (!event) throw new NotFoundError('Event tidak ditemukan', 'EVENT_NOT_FOUND');
  if (event.organizerId !== organizerId) {
    throw new ForbiddenError('Event ini bukan milik organizer kamu', 'EVENT_NOT_OWNED');
  }

  const where: Prisma.TicketWhereInput = {
    eventId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.q
      ? {
          OR: [
            { ticketCode: { contains: query.q, mode: 'insensitive' } },
            { holderName: { contains: query.q, mode: 'insensitive' } },
            { holderEmail: { contains: query.q, mode: 'insensitive' } },
            { order: { orderCode: { contains: query.q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [total, tickets] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      orderBy: { issuedAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        ticketCode: true,
        holderName: true,
        holderEmail: true,
        status: true,
        issuedAt: true,
        checkedInAt: true,
        ticketType: { select: { name: true, price: true } },
        order: { select: { orderCode: true, status: true } },
        checkedInBy: { select: { name: true } },
      },
    }),
  ]);

  return {
    event,
    data: tickets.map((ticket) => ({
      ...ticket,
      checkedInByName: ticket.checkedInBy?.name ?? null,
      checkedInBy: undefined,
    })),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

function accessTokenFromRequest(req: Request): string | undefined {
  const header = req.get('x-order-token');
  if (header) return header.trim();
  const queryToken = req.query.token;
  if (typeof queryToken === 'string' && queryToken.length > 0) return queryToken;
  return undefined;
}

const ticketAccessSelect = {
  id: true,
  ticketCode: true,
  holderName: true,
  holderEmail: true,
  status: true,
  issuedAt: true,
  checkedInAt: true,
  qrImageKey: true,
  ticketType: { select: { name: true, price: true } },
  order: {
    select: {
      id: true,
      orderCode: true,
      userId: true,
      accessTokenHash: true,
      status: true,
    },
  },
  event: {
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      startsAt: true,
      endsAt: true,
      timezone: true,
      type: true,
      venueName: true,
      address: true,
      city: true,
      onlineAccessUrl: true,
      onlineAccessNote: true,
      organizer: { select: { organizationName: true, slug: true } },
    },
  },
} as const;

async function loadTicketForAccess(ticketCode: string, req: Request) {
  const ticket = await prisma.ticket.findUnique({
    where: { ticketCode: ticketCode.toUpperCase() },
    select: ticketAccessSelect,
  });
  if (!ticket) throw new NotFoundError('Tiket tidak ditemukan', 'TICKET_NOT_FOUND');

  const token = accessTokenFromRequest(req);
  const tokenMatches = token ? safeCompare(sha256(token), ticket.order.accessTokenHash) : false;
  const allowed =
    req.auth?.role === 'ADMIN' ||
    (Boolean(req.auth) && ticket.order.userId === req.auth!.userId) ||
    tokenMatches;

  if (!allowed) {
    throw new UnauthorizedError(
      'Token akses tiket tidak valid. Buka tautan dari email konfirmasi.',
      'ORDER_ACCESS_DENIED',
    );
  }
  return { ticket, tokenMatches };
}

export async function getTicketByCode(ticketCode: string, req: Request) {
  const { ticket } = await loadTicketForAccess(ticketCode, req);
  const paid = ['PAID', 'PARTIALLY_REFUNDED', 'REFUND_PENDING'].includes(ticket.order.status);
  const requestToken = accessTokenFromRequest(req);
  const qrUrl = requestToken
    ? `/api/v1/tickets/${encodeURIComponent(ticket.ticketCode)}/qr?token=${encodeURIComponent(requestToken)}`
    : `/api/v1/tickets/${encodeURIComponent(ticket.ticketCode)}/qr`;

  return {
    ticket: {
      ...ticket,
      qrImageKey: undefined,
      order: undefined,
      orderCode: ticket.order.orderCode,
      event: {
        ...ticket.event,
        onlineAccessUrl: paid ? ticket.event.onlineAccessUrl : null,
        onlineAccessNote: paid ? ticket.event.onlineAccessNote : null,
      },
      qrUrl,
    },
  };
}

export async function getTicketQrByCode(ticketCode: string, req: Request) {
  const { ticket } = await loadTicketForAccess(ticketCode, req);
  if (!['PAID', 'PARTIALLY_REFUNDED', 'REFUND_PENDING'].includes(ticket.order.status)) {
    throw new ConflictError('QR hanya tersedia untuk tiket yang telah dibayar', 'TICKET_UNPAID');
  }
  if (ticket.event.status === 'CANCELLED') {
    throw new ConflictError('Event ini telah dibatalkan', 'TICKET_INVALID');
  }
  if (ticket.status === 'CANCELLED' || ticket.status === 'REFUNDED') {
    throw new ConflictError('Tiket ini sudah tidak berlaku', 'TICKET_INVALID');
  }
  return { ticket, qrImageKey: ticket.qrImageKey };
}
