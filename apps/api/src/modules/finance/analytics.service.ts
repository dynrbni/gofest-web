import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../lib/errors';
import type { EventReportsQuery, PeriodQuery, ListQuery } from './finance.schemas';
import { moneyNumber } from './money';

export async function listLedger(
  query: ListQuery & { from?: string; to?: string; eventId?: string },
  organizerId?: string,
) {
  const where: Prisma.FinancialLedgerWhereInput = {
    ...(organizerId ? { organizerId } : {}),
    ...(query.eventId ? { order: { eventId: query.eventId } } : {}),
    ...(query.from || query.to ? { createdAt: { gte: query.from, lte: query.to } } : {}),
    ...(query.status ? { transactionType: query.status } : {}),
    ...(query.q
      ? {
          OR: [
            { referenceId: { contains: query.q, mode: 'insensitive' } },
            { description: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const [total, data] = await Promise.all([
    prisma.financialLedger.count({ where }),
    prisma.financialLedger.findMany({
      where,
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

export function periodRange(query: PeriodQuery) {
  const now = new Date();
  if (query.period === 'all') return { from: new Date(0), to: now };
  if (query.period === 'custom') return { from: new Date(query.from!), to: new Date(query.to!) };
  const jakarta = new Date(now.getTime() + 7 * 3600000);
  const today = new Date(
    Date.UTC(jakarta.getUTCFullYear(), jakarta.getUTCMonth(), jakarta.getUTCDate()) - 7 * 3600000,
  );
  const days = query.period === 'today' ? 1 : Number.parseInt(query.period);
  return { from: new Date(today.getTime() - (days - 1) * 86400000), to: now };
}

export async function financialOverview(query: PeriodQuery, organizerId?: string) {
  const range = periodRange(query);
  const where: Prisma.FinancialLedgerWhereInput = {
    ...(organizerId ? { organizerId } : {}),
    ...(query.eventId ? { order: { eventId: query.eventId } } : {}),
    createdAt: { gte: range.from, lte: range.to },
  };
  if (
    query.eventId &&
    organizerId &&
    !(await prisma.event.findFirst({
      where: { id: query.eventId, organizerId },
      select: { id: true },
    }))
  )
    throw new NotFoundError('Event tidak ditemukan');
  const [groups, wallet, recentLedger, payouts] = await Promise.all([
    prisma.financialLedger.groupBy({ by: ['transactionType'], where, _sum: { amount: true } }),
    prisma.organizerWallet.aggregate({
      where: organizerId ? { organizerId } : {},
      _sum: { available: true, reserved: true, pending: true, withdrawn: true },
    }),
    prisma.financialLedger.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: {
        id: true,
        orderId: true,
        payoutId: true,
        transactionType: true,
        debit: true,
        credit: true,
        amount: true,
        referenceId: true,
        description: true,
        createdAt: true,
      },
    }),
    prisma.payoutRequest.count({
      where: { ...(organizerId ? { organizerId } : {}), status: 'PENDING' },
    }),
  ]);
  const sum = Object.fromEntries(groups.map((row) => [row.transactionType, row._sum.amount ?? 0]));
  const grossTicketSales = sum.TICKET_SALE ?? 0;
  const serviceFeeRevenue = sum.SERVICE_FEE ?? 0;
  const ticketRefunds = sum.TICKET_REFUND ?? 0;
  const feeRefunds = sum.FEE_REFUND ?? 0;
  const gatewayCosts = sum.PAYMENT_GATEWAY_COST ?? null;
  return {
    range,
    grossTicketSales,
    serviceFeeRevenue,
    ticketRefunds,
    feeRefunds,
    totalRefunds: ticketRefunds + feeRefunds,
    paymentGatewayCosts: gatewayCosts,
    gatewayConfigured: gatewayCosts !== null,
    netFeeIncome: serviceFeeRevenue - feeRefunds - (gatewayCosts ?? 0),
    netFeeIncomeProvisional: gatewayCosts === null,
    organizerProceeds: grossTicketSales - ticketRefunds,
    availableBalance: moneyNumber(wallet._sum.available),
    reservedBalance: moneyNumber(wallet._sum.reserved),
    pendingBalance: moneyNumber(wallet._sum.pending),
    totalWithdrawn: moneyNumber(wallet._sum.withdrawn),
    outstandingOrganizerFunds: moneyNumber(
      (wallet._sum.available ?? 0n) + (wallet._sum.reserved ?? 0n) + (wallet._sum.pending ?? 0n),
    ),
    pendingPayouts: payouts,
    recentLedger,
    workflow: 'INTERNAL',
    settlementPolicy: 'PAID_PROCEEDS_AVAILABLE_IMMEDIATELY',
  };
}

export async function eventFinancialReports(
  query: EventReportsQuery & { eventId?: string },
  organizerId?: string,
) {
  const where: Prisma.EventWhereInput = {
    ...(organizerId ? { organizerId } : {}),
    ...(query.eventId ? { id: query.eventId } : {}),
    ...(query.q ? { title: { contains: query.q, mode: 'insensitive' } } : {}),
    ...(query.withSales
      ? {
          orders: {
            some: {
              ledgerEntries: { some: { transactionType: 'TICKET_SALE', amount: { gt: 0 } } },
            },
          },
        }
      : {}),
  };
  const [total, events] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      skip: (query.page - 1) * query.limit,
      select: {
        id: true,
        title: true,
        status: true,
        organizer: { select: { id: true, organizationName: true } },
      },
    }),
  ]);
  if (query.eventId && !events.length) throw new NotFoundError('Laporan event tidak ditemukan');
  const ids = events.map((event) => event.id);
  const totals = ids.length
    ? await prisma.$queryRaw<
        {
          eventId: string;
          gross: bigint;
          fee: bigint;
          ticketRefund: bigint;
          feeRefund: bigint;
          paidOut: bigint;
        }[]
      >(Prisma.sql`
    SELECT o."eventId", COALESCE(SUM(l.amount) FILTER (WHERE l."transactionType" = 'TICKET_SALE'),0)::bigint AS gross,
      COALESCE(SUM(l.amount) FILTER (WHERE l."transactionType" = 'SERVICE_FEE'),0)::bigint AS fee,
      COALESCE(SUM(l.amount) FILTER (WHERE l."transactionType" = 'TICKET_REFUND'),0)::bigint AS "ticketRefund",
      COALESCE(SUM(l.amount) FILTER (WHERE l."transactionType" = 'FEE_REFUND'),0)::bigint AS "feeRefund",
      COALESCE(SUM(l.amount) FILTER (WHERE l."transactionType" = 'PAYOUT_COMPLETED'),0)::bigint AS "paidOut"
    FROM financial_ledger l JOIN orders o ON o.id = l."orderId" WHERE o."eventId" IN (${Prisma.join(ids)}) GROUP BY o."eventId"
  `)
    : [];
  const [discounts, ticketGroups] = ids.length
    ? await Promise.all([
        prisma.order.groupBy({
          by: ['eventId'],
          where: {
            eventId: { in: ids },
            ledgerEntries: { some: { transactionType: 'TICKET_SALE' } },
          },
          _sum: { discount: true },
        }),
        prisma.ticket.groupBy({
          by: ['eventId'],
          where: { eventId: { in: ids } },
          _count: { _all: true },
        }),
      ])
    : [[], []];
  const eventTickets = new Map(ticketGroups.map((row) => [row.eventId, row._count._all]));
  const data = events.map((event) => {
    const row = totals.find((value) => value.eventId === event.id);
    const gross = moneyNumber(row?.gross);
    const ticketRefund = moneyNumber(row?.ticketRefund);
    const paidOut = moneyNumber(row?.paidOut);
    return {
      ...event,
      totalTicketsSold: eventTickets.get(event.id) ?? 0,
      grossTicketSales: gross,
      discountAmount: discounts.find((value) => value.eventId === event.id)?._sum.discount ?? 0,
      serviceFeeRevenue: moneyNumber(row?.fee),
      refundAmount: ticketRefund + moneyNumber(row?.feeRefund),
      organizerProceeds: gross - ticketRefund,
      paidOutAmount: paidOut,
      outstandingBalance: gross - ticketRefund - paidOut,
    };
  });
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

export async function dashboardAnalytics(query: PeriodQuery, organizerId?: string) {
  const range = periodRange(query);
  const owned = organizerId ? { organizerId } : {};
  const eventWhere: Prisma.EventWhereInput = {
    ...owned,
    ...(query.eventId ? { id: query.eventId } : {}),
  };
  const orderWhere: Prisma.OrderWhereInput = {
    event: eventWhere,
    createdAt: { gte: range.from, lte: range.to },
  };
  const [
    financial,
    transactions,
    events,
    attendees,
    checkedIn,
    users,
    pendingEvents,
    activeEvents,
    recentOrders,
    recentEvents,
    recentCheckIns,
    activities,
    pendingPayouts,
    refunds,
    trend,
    distribution,
    eventPerformance,
    pendingEventReviews,
    upcomingEvents,
  ] = await Promise.all([
    financialOverview(query, organizerId),
    prisma.order.count({ where: orderWhere }),
    prisma.event.count({ where: eventWhere }),
    prisma.ticket.count({ where: { event: eventWhere, status: { in: ['VALID', 'CHECKED_IN'] } } }),
    prisma.ticket.count({ where: { event: eventWhere, status: 'CHECKED_IN' } }),
    organizerId
      ? Promise.resolve(null)
      : prisma.user.count({ where: { createdAt: { gte: range.from, lte: range.to } } }),
    prisma.event.count({ where: { ...eventWhere, status: 'PENDING_REVIEW' } }),
    prisma.event.count({
      where: { ...eventWhere, status: 'PUBLISHED', endsAt: { gte: new Date() } },
    }),
    prisma.order.findMany({
      where: orderWhere,
      take: 8,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderCode: true,
        buyerName: true,
        total: true,
        status: true,
        createdAt: true,
        event: { select: { id: true, title: true } },
      },
    }),
    prisma.event.findMany({
      where: eventWhere,
      take: 8,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        startsAt: true,
        status: true,
        reviewNote: true,
        organizer: { select: { organizationName: true } },
      },
    }),
    prisma.checkInLog.findMany({
      where: { event: eventWhere },
      take: 8,
      orderBy: { scannedAt: 'desc' },
      select: {
        id: true,
        result: true,
        scannedAt: true,
        ticket: { select: { holderName: true, eventId: true } },
        eventId: true,
        event: { select: { title: true } },
      },
    }),
    prisma.auditLog.findMany({
      where: organizerId
        ? { actor: { organizerProfile: { id: organizerId } } }
        : {
            actor: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
            resourceType: { notIn: ['PLATFORM_SETTINGS', 'ADMIN', 'ROLE_PERMISSION'] },
          },
      take: 8,
      orderBy: { createdAt: 'desc' },
      select: { id: true, action: true, createdAt: true, actor: { select: { name: true } } },
    }),
    prisma.payoutRequest.findMany({
      where: { ...owned, status: 'PENDING' },
      take: 6,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        organizer: { select: { organizationName: true } },
      },
    }),
    prisma.refund.findMany({
      where: { order: { event: eventWhere } },
      take: 6,
      orderBy: { createdAt: 'desc' },
      select: { id: true, amount: true, status: true, order: { select: { orderCode: true } } },
    }),
    prisma.$queryRaw<
      {
        date: string;
        ticketSales: bigint;
        serviceFees: bigint;
        tickets: number;
        transactions: number;
      }[]
    >(Prisma.sql`
      WITH scoped_events AS (
        SELECT e.id FROM events e WHERE 1=1
          ${organizerId ? Prisma.sql`AND e."organizerId" = ${organizerId}` : Prisma.empty}
          ${query.eventId ? Prisma.sql`AND e.id = ${query.eventId}` : Prisma.empty}
      ), order_activity AS (
        SELECT to_char(o."createdAt" AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS date, COUNT(*)::int AS transactions
        FROM orders o WHERE o."eventId" IN (SELECT id FROM scoped_events) AND o."createdAt" >= ${range.from} AND o."createdAt" <= ${range.to} GROUP BY date
      ), cash_activity AS (
        SELECT to_char(l."createdAt" AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS date,
          COALESCE(SUM(l.amount) FILTER (WHERE l."transactionType" = 'TICKET_SALE'),0)::bigint AS sales,
          COALESCE(SUM(l.amount) FILTER (WHERE l."transactionType" = 'SERVICE_FEE'),0)::bigint AS fees
        FROM financial_ledger l JOIN orders o ON o.id = l."orderId" WHERE o."eventId" IN (SELECT id FROM scoped_events)
          AND l."createdAt" >= ${range.from} AND l."createdAt" <= ${range.to} AND l."transactionType" IN ('TICKET_SALE','SERVICE_FEE') GROUP BY date
      ), ticket_activity AS (
        SELECT to_char(t."issuedAt" AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS date, COUNT(*)::int AS tickets
        FROM tickets t WHERE t."eventId" IN (SELECT id FROM scoped_events) AND t."issuedAt" >= ${range.from} AND t."issuedAt" <= ${range.to} GROUP BY date
      ), days AS (SELECT date FROM order_activity UNION SELECT date FROM cash_activity UNION SELECT date FROM ticket_activity)
      SELECT d.date, COALESCE(c.sales,0)::bigint AS "ticketSales", COALESCE(c.fees,0)::bigint AS "serviceFees",
        COALESCE(t.tickets,0)::int AS tickets, COALESCE(o.transactions,0)::int AS transactions
      FROM days d LEFT JOIN order_activity o ON o.date=d.date LEFT JOIN cash_activity c ON c.date=d.date LEFT JOIN ticket_activity t ON t.date=d.date ORDER BY d.date
    `),
    prisma.order.groupBy({ by: ['status'], where: orderWhere, _count: { _all: true } }),
    prisma.$queryRaw<{ id: string; title: string; tickets: number; sales: bigint }[]>(Prisma.sql`
      SELECT e.id, e.title, COALESCE(SUM((SELECT COUNT(*) FROM tickets t WHERE t."orderId" = o.id)),0)::int AS tickets,
        COALESCE(SUM(l.amount),0)::bigint AS sales FROM events e JOIN orders o ON o."eventId" = e.id JOIN financial_ledger l ON l."orderId" = o.id AND l."transactionType" = 'TICKET_SALE'
      WHERE l."createdAt" >= ${range.from} AND l."createdAt" <= ${range.to}
        ${organizerId ? Prisma.sql`AND e."organizerId" = ${organizerId}` : Prisma.empty}
        ${query.eventId ? Prisma.sql`AND e.id = ${query.eventId}` : Prisma.empty}
      GROUP BY e.id ORDER BY sales DESC LIMIT 6
    `),
    prisma.event.findMany({
      where: { ...eventWhere, status: 'PENDING_REVIEW' },
      take: 6,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        title: true,
        slug: true,
        startsAt: true,
        status: true,
        reviewNote: true,
        organizer: { select: { organizationName: true } },
      },
    }),
    prisma.event.findMany({
      where: { ...eventWhere, status: 'PUBLISHED', startsAt: { gte: new Date() } },
      take: 6,
      orderBy: { startsAt: 'asc' },
      select: {
        id: true,
        title: true,
        slug: true,
        startsAt: true,
        status: true,
        reviewNote: true,
        organizer: { select: { organizationName: true } },
      },
    }),
  ]);
  return {
    financial,
    summary: {
      totalTransactions: transactions,
      ticketsSold: trend.reduce((sum, day) => sum + day.tickets, 0),
      totalEvents: events,
      activeEvents,
      registeredUsers: users,
      pendingEventApprovals: pendingEvents,
      pendingPayouts: financial.pendingPayouts,
      totalAttendees: attendees,
      checkedInAttendees: checkedIn,
    },
    trend: trend.map((row) => ({
      ...row,
      ticketSales: moneyNumber(row.ticketSales),
      serviceFees: moneyNumber(row.serviceFees),
    })),
    paymentDistribution: distribution.map((row) => ({
      status: row.status,
      count: row._count._all,
    })),
    eventPerformance: eventPerformance.map((row) => ({ ...row, sales: moneyNumber(row.sales) })),
    recentOrders,
    recentEvents,
    pendingEventReviews,
    upcomingEvents,
    recentCheckIns: recentCheckIns.map((scan) => ({
      ...scan,
      ticket: scan.ticket?.eventId === scan.eventId ? scan.ticket : null,
    })),
    recentActivities: activities,
    pendingPayouts,
    recentRefunds: refunds,
  };
}
