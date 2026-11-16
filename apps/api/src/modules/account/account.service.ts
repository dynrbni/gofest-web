import { Prisma } from '@prisma/client';
import type { AccountHistoryQuery, AccountTicketQuery } from '@gofest/shared';
import { prisma } from '../../lib/prisma';
import { orderInclude, serializeOrder } from '../orders/order.service';

const paidStatuses = ['PAID', 'PARTIALLY_REFUNDED', 'REFUND_PENDING'] as const;
const eventSelect = {
  id: true,
  title: true,
  slug: true,
  coverKey: true,
  startsAt: true,
  endsAt: true,
  timezone: true,
  type: true,
  venueName: true,
  city: true,
  status: true,
} as const;
const ticketSelect = {
  id: true,
  ticketCode: true,
  holderName: true,
  status: true,
  checkedInAt: true,
  issuedAt: true,
  ticketType: { select: { id: true, name: true } },
} as const;

function dateRange(query: { dateFrom?: string; dateTo?: string }) {
  return {
    ...(query.dateFrom ? { gte: new Date(`${query.dateFrom}T00:00:00+07:00`) } : {}),
    ...(query.dateTo
      ? { lt: new Date(new Date(`${query.dateTo}T00:00:00+07:00`).getTime() + 86_400_000) }
      : {}),
  };
}

function meta(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getAccountDashboard(userId: string) {
  const usable: Prisma.TicketWhereInput = {
    status: 'VALID',
    order: { userId, status: { in: [...paidStatuses] } },
  };
  const upcoming: Prisma.EventWhereInput = {
    status: 'PUBLISHED',
    endsAt: { gt: new Date() },
    tickets: { some: usable },
  };
  const [totalTickets, totalOrders, upcomingEvents, events] = await Promise.all([
    prisma.ticket.count({ where: { order: { userId } } }),
    prisma.order.count({ where: { userId } }),
    prisma.event.count({ where: upcoming }),
    prisma.event.findMany({
      where: upcoming,
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      take: 3,
      select: {
        ...eventSelect,
        tickets: { where: usable, select: ticketSelect, orderBy: { issuedAt: 'asc' } },
      },
    }),
  ]);
  return { summary: { totalTickets, upcomingEvents, totalOrders }, upcoming: events };
}

export async function listAccountTickets(userId: string, query: AccountTicketQuery) {
  const now = new Date();
  const eligible: Prisma.TicketWhereInput = {
    status: { in: ['VALID', 'CHECKED_IN'] },
    order: { status: { in: [...paidStatuses] } },
    event: { status: { not: 'CANCELLED' } },
  };
  const period: Prisma.TicketWhereInput =
    query.period === 'invalid'
      ? {
          OR: [
            { status: { in: ['CANCELLED', 'REFUNDED'] } },
            { event: { status: 'CANCELLED' } },
            { order: { status: { notIn: [...paidStatuses] } } },
          ],
        }
      : {
          AND: [
            eligible,
            query.period === 'upcoming'
              ? { status: 'VALID', event: { endsAt: { gt: now }, status: 'PUBLISHED' } }
              : {
                  OR: [
                    { status: 'CHECKED_IN' },
                    { event: { endsAt: { lte: now } } },
                    { event: { status: 'COMPLETED' } },
                  ],
                },
          ],
        };
  const where: Prisma.TicketWhereInput = {
    AND: [
      { order: { userId } },
      period,
      {
        event: {
          ...(query.q ? { title: { contains: query.q, mode: 'insensitive' } } : {}),
          startsAt: dateRange(query),
        },
      },
    ],
  };
  const [total, data] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      select: {
        ...ticketSelect,
        event: { select: eventSelect },
        order: { select: { id: true, orderCode: true, status: true } },
      },
      orderBy: [{ event: { startsAt: query.period === 'past' ? 'desc' : 'asc' } }, { id: 'asc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return { data, meta: meta(query.page, query.limit, total) };
}

export async function listAccountHistory(userId: string, query: AccountHistoryQuery) {
  const conditions: Prisma.Sql[] = [Prisma.sql`o."userId" = ${userId}`];
  if (query.status) conditions.push(Prisma.sql`o."status"::text = ${query.status}`);
  if (query.q)
    conditions.push(
      Prisma.sql`(o."orderCode" ILIKE ${`%${query.q}%`} OR e."title" ILIKE ${`%${query.q}%`})`,
    );
  const dates = dateRange(query);
  if (dates.gte) conditions.push(Prisma.sql`o."createdAt" >= ${dates.gte}`);
  if (dates.lt) conditions.push(Prisma.sql`o."createdAt" < ${dates.lt}`);
  if (query.paymentStatus)
    conditions.push(Prisma.sql`(
    SELECT p."status"::text FROM "payments" p WHERE p."orderId" = o."id"
    ORDER BY p."createdAt" DESC, p."id" DESC LIMIT 1
  ) = ${query.paymentStatus}`);
  const from = Prisma.sql`FROM "orders" o JOIN "events" e ON e."id" = o."eventId" WHERE ${Prisma.join(conditions, ' AND ')}`;
  const [counts, ids] = await Promise.all([
    prisma.$queryRaw<{ total: number }[]>(Prisma.sql`SELECT count(*)::int AS total ${from}`),
    prisma.$queryRaw<{ id: string }[]>(
      Prisma.sql`SELECT o."id" ${from} ORDER BY o."createdAt" DESC, o."id" DESC LIMIT ${query.limit} OFFSET ${(query.page - 1) * query.limit}`,
    ),
  ]);
  const orders = await prisma.order.findMany({
    where: { userId, id: { in: ids.map((row) => row.id) } },
    include: {
      ...orderInclude,
      payments: { ...orderInclude.payments, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] },
      event: { select: { ...orderInclude.event.select, coverKey: true, status: true } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  return {
    data: orders.map((order) => ({
      ...serializeOrder(order),
      event: {
        ...serializeOrder(order).event,
        coverKey: order.event.coverKey,
        status: order.event.status,
      },
    })),
    meta: meta(query.page, query.limit, counts[0]?.total ?? 0),
  };
}

export async function getAccountRecommendations() {
  // Compare inventory columns in SQL; the shared catalog's quota-only filter does not cover sale windows.
  const ids = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT e."id" FROM "events" e JOIN "organizer_profiles" o ON o."id" = e."organizerId"
    WHERE e."status" = 'PUBLISHED' AND o."status" = 'ACTIVE' AND e."endsAt" > now()
      AND (e."salesStartAt" IS NULL OR e."salesStartAt" <= now())
      AND (e."salesEndAt" IS NULL OR e."salesEndAt" > now())
      AND EXISTS (SELECT 1 FROM "ticket_types" t WHERE t."eventId" = e."id" AND t."isActive" = true
        AND t."quotaTotal" > t."quantitySold" + t."quantityReserved"
        AND (t."salesStartAt" IS NULL OR t."salesStartAt" <= now())
        AND (t."salesEndAt" IS NULL OR t."salesEndAt" > now()))
    ORDER BY e."startsAt" ASC, e."id" ASC LIMIT 4
  `);
  const now = new Date();
  const events = await prisma.event.findMany({
    where: { id: { in: ids.map((row) => row.id) } },
    orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    select: {
      ...eventSelect,
      summary: true,
      isDemo: true,
      category: { select: { id: true, name: true, slug: true } },
      organizer: { select: { id: true, organizationName: true, slug: true, logoKey: true } },
      ticketTypes: {
        where: {
          isActive: true,
          AND: [
            { OR: [{ salesStartAt: null }, { salesStartAt: { lte: now } }] },
            { OR: [{ salesEndAt: null }, { salesEndAt: { gt: now } }] },
          ],
        },
        select: { price: true, quotaTotal: true, quantitySold: true, quantityReserved: true },
      },
    },
  });
  return {
    events: events.flatMap(({ ticketTypes, ...event }) => {
      const available = ticketTypes.filter(
        (ticket) => ticket.quotaTotal > ticket.quantitySold + ticket.quantityReserved,
      );
      return available.length
        ? [
            {
              ...event,
              priceFrom: Math.min(...available.map((ticket) => ticket.price)),
              isSoldOut: false,
            },
          ]
        : [];
    }),
  };
}
