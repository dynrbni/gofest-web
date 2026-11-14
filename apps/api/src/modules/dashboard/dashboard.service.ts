import { prisma } from '../../lib/prisma';

export async function getOrganizerDashboard(organizerId: string) {
  const now = new Date();
  const [
    eventStatusGroups,
    upcomingEvents,
    ticketAggregate,
    paidAggregate,
    pendingOrderCount,
    recentOrders,
    ticketStatusGroups,
  ] = await Promise.all([
    prisma.event.groupBy({
      by: ['status'],
      where: { organizerId },
      _count: { _all: true },
    }),
    prisma.event.findMany({
      where: { organizerId, status: 'PUBLISHED', endsAt: { gt: now } },
      orderBy: { startsAt: 'asc' },
      take: 6,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        ticketTypes: {
          select: {
            id: true,
            name: true,
            price: true,
            quotaTotal: true,
            quantitySold: true,
            quantityReserved: true,
            isActive: true,
          },
        },
      },
    }),
    prisma.ticketType.aggregate({
      where: { event: { organizerId } },
      _sum: { quotaTotal: true, quantitySold: true, quantityReserved: true },
    }),
    prisma.order.aggregate({
      where: { event: { organizerId }, status: 'PAID' },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.order.count({
      where: { event: { organizerId }, status: 'PENDING_PAYMENT', expiresAt: { gt: now } },
    }),
    prisma.order.findMany({
      where: { event: { organizerId } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        orderCode: true,
        status: true,
        total: true,
        buyerName: true,
        buyerEmail: true,
        createdAt: true,
        paidAt: true,
        event: { select: { id: true, title: true, slug: true, startsAt: true } },
        _count: { select: { tickets: true } },
      },
    }),
    prisma.ticket.groupBy({
      by: ['status'],
      where: { event: { organizerId } },
      _count: { _all: true },
    }),
  ]);

  const statusCounts = Object.fromEntries(
    eventStatusGroups.map((group) => [group.status, group._count._all]),
  ) as Record<string, number>;
  const ticketStatusCounts = Object.fromEntries(
    ticketStatusGroups.map((group) => [group.status, group._count._all]),
  ) as Record<string, number>;

  return {
    summary: {
      totalEvents: eventStatusGroups.reduce((sum, group) => sum + group._count._all, 0),
      publishedEvents: statusCounts.PUBLISHED ?? 0,
      draftEvents: statusCounts.DRAFT ?? 0,
      pendingReviewEvents:
        (statusCounts.PENDING_REVIEW ?? 0) + (statusCounts.REJECTED ?? 0),
      upcomingEvents: upcomingEvents.length,
      quotaTotal: ticketAggregate._sum.quotaTotal ?? 0,
      ticketsSold: ticketAggregate._sum.quantitySold ?? 0,
      ticketsReserved: ticketAggregate._sum.quantityReserved ?? 0,
      ticketsCheckedIn: ticketStatusCounts.CHECKED_IN ?? 0,
      ticketsValid: ticketStatusCounts.VALID ?? 0,
      grossRevenue: paidAggregate._sum.total ?? 0,
      paidOrders: paidAggregate._count._all,
      pendingOrders: pendingOrderCount,
    },
    events: upcomingEvents.map((event) => ({
      id: event.id,
      title: event.title,
      slug: event.slug,
      status: event.status,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      timezone: event.timezone,
      city: event.city,
      venueName: event.venueName,
      category: event.category,
      ticketTypes: event.ticketTypes,
      quotaTotal: event.ticketTypes.reduce((sum, ticket) => sum + ticket.quotaTotal, 0),
      sold: event.ticketTypes.reduce((sum, ticket) => sum + ticket.quantitySold, 0),
      reserved: event.ticketTypes.reduce((sum, ticket) => sum + ticket.quantityReserved, 0),
    })),
    recentOrders: recentOrders.map((order) => ({
      ...order,
      ticketCount: order._count.tickets,
      _count: undefined,
    })),
  };
}
