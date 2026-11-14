import type { Prisma } from '@prisma/client';
import type { TicketListQuery } from '@gofest/shared';
import { prisma } from '../../lib/prisma';
import { ForbiddenError, NotFoundError } from '../../lib/errors';

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
