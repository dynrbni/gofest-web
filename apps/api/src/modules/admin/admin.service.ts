import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import type {
  AdminAuditQuery,
  AdminOrganizerQuery,
  AdminUserQuery,
  EventManageQuery,
  OrderListQuery,
} from '@gofest/shared';
import { prisma } from '../../lib/prisma';
import { writeAudit } from '../../lib/audit';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors';
import { fulfillOrder } from '../orders/order.service';
import { cancelEventAsAdmin } from '../events/event.service';
import { notifyUser } from '../notifications/inbox.service';

export async function getAdminDashboard() {
  const [
    userGroups,
    organizerGroups,
    eventGroups,
    orderGroups,
    revenue,
    ticketGroups,
    recentOrders,
    reviewOrders,
    recentAudit,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.organizerProfile.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.event.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.order.aggregate({
      where: { status: 'PAID' },
      _sum: { subtotal: true, discount: true, platformFee: true },
    }),
    prisma.ticket.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.order.findMany({
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
        event: { select: { id: true, title: true, slug: true } },
      },
    }),
    prisma.order.findMany({
      where: { status: 'PAYMENT_REVIEW' },
      orderBy: { createdAt: 'asc' },
      take: 5,
      select: {
        id: true,
        orderCode: true,
        total: true,
        buyerName: true,
        createdAt: true,
        event: { select: { id: true, title: true } },
        payments: {
          where: { status: 'PAID' },
          select: { provider: true, providerReference: true, paidAt: true },
          take: 1,
        },
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        action: true,
        resourceType: true,
        resourceId: true,
        createdAt: true,
        actor: { select: { name: true } },
      },
    }),
  ]);

  const userCounts = Object.fromEntries(userGroups.map((row) => [row.status, row._count._all]));
  const organizerCounts = Object.fromEntries(
    organizerGroups.map((row) => [row.status, row._count._all]),
  );
  const eventCounts = Object.fromEntries(eventGroups.map((row) => [row.status, row._count._all]));
  const orderCounts = Object.fromEntries(orderGroups.map((row) => [row.status, row._count._all]));
  const ticketCounts = Object.fromEntries(ticketGroups.map((row) => [row.status, row._count._all]));

  return {
    users: {
      total: userGroups.reduce((sum, row) => sum + row._count._all, 0),
      active: userCounts.ACTIVE ?? 0,
      suspended: userCounts.SUSPENDED ?? 0,
    },
    organizers: {
      total: organizerGroups.reduce((sum, row) => sum + row._count._all, 0),
      pending: organizerCounts.PENDING ?? 0,
      active: organizerCounts.ACTIVE ?? 0,
      suspended: organizerCounts.SUSPENDED ?? 0,
    },
    events: {
      total: eventGroups.reduce((sum, row) => sum + row._count._all, 0),
      draft: eventCounts.DRAFT ?? 0,
      pendingReview: eventCounts.PENDING_REVIEW ?? 0,
      published: eventCounts.PUBLISHED ?? 0,
      cancelled: eventCounts.CANCELLED ?? 0,
    },
    orders: {
      total: orderGroups.reduce((sum, row) => sum + row._count._all, 0),
      paid: orderCounts.PAID ?? 0,
      pendingPayment: orderCounts.PENDING_PAYMENT ?? 0,
      paymentReview: orderCounts.PAYMENT_REVIEW ?? 0,
      refundPending: orderCounts.REFUND_PENDING ?? 0,
      grossRevenue: (revenue._sum.subtotal ?? 0) - (revenue._sum.discount ?? 0),
      serviceFeeRevenue: revenue._sum.platformFee ?? 0,
    },
    tickets: {
      issued: (ticketCounts.VALID ?? 0) + (ticketCounts.CHECKED_IN ?? 0),
      checkedIn: ticketCounts.CHECKED_IN ?? 0,
      cancelled: ticketCounts.CANCELLED ?? 0,
      refunded: ticketCounts.REFUNDED ?? 0,
    },
    recentOrders,
    reviewOrders: reviewOrders.map((order) => ({
      ...order,
      payment: order.payments[0] ?? null,
      payments: undefined,
    })),
    recentAudit,
  };
}

export async function listAdminUsers(query: AdminUserQuery) {
  const where: Prisma.UserWhereInput = {
    role: { notIn: ['ADMIN', 'SUPERADMIN'] },
    ...(query.status ? { status: query.status } : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { email: { contains: query.q, mode: 'insensitive' } },
            { phone: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        organizerProfile: { select: { id: true, organizationName: true, status: true } },
        _count: { select: { orders: true, staffAssignments: true } },
      },
    }),
  ]);
  return {
    data: users,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getAdminUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      emailVerifiedAt: true,
      createdAt: true,
      updatedAt: true,
      organizerProfile: {
        include: { _count: { select: { events: true } } },
      },
      _count: { select: { orders: true, staffAssignments: true } },
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          orderCode: true,
          status: true,
          total: true,
          createdAt: true,
          event: { select: { id: true, title: true } },
        },
      },
      staffAssignments: {
        take: 10,
        select: {
          role: true,
          assignedAt: true,
          event: { select: { id: true, title: true, startsAt: true } },
        },
      },
    },
  });
  if (!user) throw new NotFoundError('Pengguna tidak ditemukan', 'USER_NOT_FOUND');

  if (user.role === 'ADMIN' || user.role === 'SUPERADMIN') {
    throw new ForbiddenError('Kelola akun administrasi melalui Admin Management');
  }
  return user;
}

export async function updateUserStatus(
  userId: string,
  input: { status: 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'DELETED'; note?: string },
  adminId: string,
  req: Request,
) {
  if (userId === adminId) {
    throw new BadRequestError(
      'Admin tidak dapat mengubah status akunnya sendiri',
      undefined,
      'CANNOT_MODIFY_SELF',
    );
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('Pengguna tidak ditemukan', 'USER_NOT_FOUND');
  if (user.role === 'ADMIN' || user.role === 'SUPERADMIN') {
    throw new ForbiddenError('Kelola akun administrasi melalui Admin Management');
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { status: input.status },
    });
    if (input.status === 'SUSPENDED' || input.status === 'DELETED') {
      await tx.refreshSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.organizerProfile.updateMany({
        where: { userId, status: { in: ['ACTIVE', 'PENDING'] } },
        data: {
          status: 'SUSPENDED',
          reviewNote: input.note ?? 'Akun pengguna disuspend oleh admin',
          reviewedByUserId: adminId,
          reviewedAt: new Date(),
        },
      });
    }
    await writeAudit(
      {
        actorUserId: adminId,
        action: 'USER_STATUS_UPDATED',
        resourceType: 'USER',
        resourceId: userId,
        metadata: { from: user.status, to: input.status, note: input.note ?? null },
        req,
      },
      tx,
    );
  });

  return getAdminUser(userId);
}

export async function listAdminOrganizers(query: AdminOrganizerQuery) {
  const where: Prisma.OrganizerProfileWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.q
      ? {
          OR: [
            { organizationName: { contains: query.q, mode: 'insensitive' } },
            { slug: { contains: query.q, mode: 'insensitive' } },
            { user: { name: { contains: query.q, mode: 'insensitive' } } },
            { user: { email: { contains: query.q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };
  const [total, organizers] = await Promise.all([
    prisma.organizerProfile.count({ where }),
    prisma.organizerProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, status: true },
        },
        _count: { select: { events: true } },
      },
    }),
  ]);
  return {
    data: organizers,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getAdminOrganizer(organizerId: string) {
  const organizer = await prisma.organizerProfile.findUnique({
    where: { id: organizerId },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, status: true } },
      events: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          startsAt: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
      },
      _count: { select: { events: true } },
    },
  });
  if (!organizer) throw new NotFoundError('Organizer tidak ditemukan', 'ORGANIZER_NOT_FOUND');
  return organizer;
}

export async function reviewOrganizer(
  organizerId: string,
  input: { status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED'; note?: string },
  adminId: string,
  req: Request,
) {
  const organizer = await prisma.organizerProfile.findUnique({
    where: { id: organizerId },
    include: { user: { select: { id: true, status: true, role: true } } },
  });
  if (!organizer) throw new NotFoundError('Organizer tidak ditemukan', 'ORGANIZER_NOT_FOUND');
  if (['ADMIN', 'SUPERADMIN'].includes(organizer.user.role))
    throw new ForbiddenError('Status akun administrasi dikelola melalui Admin Management');
  if (input.status === 'ACTIVE' && organizer.user.status !== 'ACTIVE') {
    throw new ConflictError(
      'Akun pengguna organizer tidak aktif. Aktifkan akun terlebih dahulu.',
      'ORGANIZER_USER_INACTIVE',
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.organizerProfile.update({
      where: { id: organizerId },
      data: {
        status: input.status,
        reviewNote: input.note ?? null,
        reviewedByUserId: adminId,
        reviewedAt: new Date(),
      },
    });
    if (input.status === 'ACTIVE')
      await tx.user.updateMany({
        where: { id: organizer.userId, role: 'USER' },
        data: { role: 'CREATOR' },
      });
    if (input.status === 'SUSPENDED' || input.status === 'REJECTED') {
      await tx.refreshSession.updateMany({
        where: { userId: organizer.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await writeAudit(
      {
        actorUserId: adminId,
        action: 'ORGANIZER_REVIEWED',
        resourceType: 'ORGANIZER',
        resourceId: organizerId,
        metadata: { from: organizer.status, to: input.status, note: input.note ?? null },
        req,
      },
      tx,
    );
  });

  return getAdminOrganizer(organizerId);
}

export async function listAdminEvents(query: EventManageQuery) {
  const where: Prisma.EventWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.q
      ? {
          OR: [
            { title: { contains: query.q, mode: 'insensitive' } },
            { slug: { contains: query.q, mode: 'insensitive' } },
            { organizer: { organizationName: { contains: query.q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };
  const [total, events] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        type: true,
        city: true,
        venueName: true,
        startsAt: true,
        endsAt: true,
        publishedAt: true,
        reviewNote: true,
        createdAt: true,
        category: { select: { id: true, name: true } },
        organizer: {
          select: { id: true, organizationName: true, slug: true, status: true },
        },
        ticketTypes: {
          select: { price: true, quotaTotal: true, quantitySold: true, quantityReserved: true },
        },
        _count: { select: { orders: true } },
      },
    }),
  ]);
  return {
    data: events.map((event) => {
      const { ticketTypes, ...rest } = event;
      const prices = ticketTypes.map((ticket) => ticket.price);
      return {
        ...rest,
        priceFrom: prices.length > 0 ? Math.min(...prices) : null,
        quotaTotal: ticketTypes.reduce((sum, ticket) => sum + ticket.quotaTotal, 0),
        ticketsSold: ticketTypes.reduce((sum, ticket) => sum + ticket.quantitySold, 0),
      };
    }),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getAdminEvent(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      category: true,
      organizer: {
        include: { user: { select: { id: true, name: true, email: true, status: true } } },
      },
      ticketTypes: { orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }] },
      reviewedBy: { select: { id: true, name: true } },
      _count: { select: { orders: true, tickets: true, staff: true } },
    },
  });
  if (!event) throw new NotFoundError('Event tidak ditemukan', 'EVENT_NOT_FOUND');
  return event;
}

export async function reviewEvent(
  eventId: string,
  input: {
    status: 'PUBLISHED' | 'APPROVED' | 'NEEDS_REVISION' | 'REJECTED' | 'CANCELLED';
    note?: string;
  },
  adminId: string,
  req: Request,
) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      category: true,
      ticketTypes: { where: { isActive: true }, select: { id: true } },
    },
  });
  if (!event) throw new NotFoundError('Event tidak ditemukan', 'EVENT_NOT_FOUND');

  if (input.status === 'CANCELLED') {
    return cancelEventAsAdmin(eventId, input.note ?? 'Dibatalkan oleh admin', req);
  }

  if (event.status === 'CANCELLED' || event.status === 'COMPLETED') {
    throw new ConflictError(
      'Event yang sudah dibatalkan atau selesai tidak dapat dimoderasi',
      'EVENT_CLOSED',
    );
  }
  if (input.status === 'PUBLISHED') {
    if (event.ticketTypes.length === 0) {
      throw new ConflictError(
        'Event harus memiliki minimal satu tipe tiket aktif sebelum dipublikasikan',
        'EVENT_NEEDS_TICKET_TYPE',
      );
    }
    if (!event.category.isActive) {
      throw new ConflictError('Kategori event tidak aktif', 'CATEGORY_INACTIVE');
    }
  }
  if ((input.status === 'REJECTED' || input.status === 'NEEDS_REVISION') && !input.note) {
    throw new BadRequestError('Alasan penolakan wajib diisi');
  }

  await prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id: eventId },
      data: {
        status: input.status,
        reviewNote: input.note ?? null,
        reviewedByUserId: adminId,
        reviewedAt: new Date(),
        ...(input.status === 'PUBLISHED' ? { publishedAt: event.publishedAt ?? new Date() } : {}),
      },
    });
    const organizer = await tx.organizerProfile.findUniqueOrThrow({
      where: { id: event.organizerId },
    });
    await notifyUser(tx, {
      category: 'EVENT',
      userId: organizer.userId,
      title: `Review event: ${input.status}`,
      message: input.note ?? `Status ${event.title} diperbarui menjadi ${input.status}.`,
      href: `/creator/events/${event.id}`,
    });
    await writeAudit(
      {
        actorUserId: adminId,
        action: 'EVENT_REVIEWED',
        resourceType: 'EVENT',
        resourceId: eventId,
        metadata: {
          from: event.status,
          to: input.status,
          note: input.note ?? null,
        },
        req,
      },
      tx,
    );
  });

  return getAdminEvent(eventId);
}

export async function listAdminOrders(query: OrderListQuery) {
  const where: Prisma.OrderWhereInput = {
    ...(query.eventId ? { eventId: query.eventId } : {}),
    ...(query.organizerId ? { event: { organizerId: query.organizerId } } : {}),
    ...(query.from || query.to ? { createdAt: { gte: query.from, lte: query.to } } : {}),
    ...(query.paymentStatus ? { payments: { some: { status: query.paymentStatus } } } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.q
      ? {
          OR: [
            { orderCode: { contains: query.q, mode: 'insensitive' } },
            { buyerName: { contains: query.q, mode: 'insensitive' } },
            { buyerEmail: { contains: query.q, mode: 'insensitive' } },
            {
              payments: { some: { providerReference: { contains: query.q, mode: 'insensitive' } } },
            },
          ],
        }
      : {}),
  };
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        orderCode: true,
        status: true,
        subtotal: true,
        discount: true,
        platformFee: true,
        total: true,
        buyerName: true,
        buyerEmail: true,
        createdAt: true,
        paidAt: true,
        expiresAt: true,
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            organizer: { select: { organizationName: true } },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            provider: true,
            providerReference: true,
            status: true,
            amount: true,
            paidAt: true,
          },
        },
        _count: { select: { tickets: true } },
      },
    }),
  ]);
  return {
    data: orders.map((order) => ({
      ...order,
      payment: order.payments[0] ?? null,
      payments: undefined,
      ticketCount: order._count.tickets,
      _count: undefined,
    })),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getAdminOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          startsAt: true,
          organizer: { select: { organizationName: true, slug: true } },
        },
      },
      user: { select: { id: true, name: true, email: true, status: true } },
      coupon: { select: { id: true, code: true, discountType: true, discountValue: true } },
      items: true,
      payments: { orderBy: { createdAt: 'desc' } },
      tickets: {
        orderBy: { issuedAt: 'asc' },
        select: {
          id: true,
          ticketCode: true,
          holderName: true,
          status: true,
          issuedAt: true,
          checkedInAt: true,
        },
      },
    },
  });
  if (!order) throw new NotFoundError('Order tidak ditemukan', 'ORDER_NOT_FOUND');
  const history = await prisma.auditLog.findMany({
    where: { resourceType: 'ORDER', resourceId: orderId },
    orderBy: { createdAt: 'asc' },
    take: 100,
    select: { id: true, action: true, createdAt: true, metadata: true },
  });
  return { ...order, history };
}

export async function resolvePaymentReview(
  orderId: string,
  input: { action: 'ISSUE_TICKETS' | 'REFUND'; note: string },
  adminId: string,
  req: Request,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: { orderBy: { createdAt: 'desc' } } },
  });
  if (!order) throw new NotFoundError('Order tidak ditemukan', 'ORDER_NOT_FOUND');
  if (order.status !== 'PAYMENT_REVIEW') {
    throw new ConflictError(
      'Order ini tidak sedang dalam review pembayaran',
      'ORDER_NOT_IN_REVIEW',
    );
  }
  const paidPayment = order.payments.find((payment) => payment.status === 'PAID');
  if (!paidPayment) {
    throw new ConflictError(
      'Tidak ada pembayaran berstatus PAID sebagai dasar penerbitan tiket',
      'PAID_PAYMENT_NOT_FOUND',
    );
  }

  if (input.action === 'ISSUE_TICKETS') {
    const result = await fulfillOrder(order.id, {
      provider: paidPayment.provider,
      providerReference: paidPayment.providerReference,
      amount: paidPayment.amount,
      currency: paidPayment.currency,
      paidAt: paidPayment.paidAt ?? new Date(),
      raw: {
        adminResolution: {
          action: input.action,
          note: input.note,
          adminId,
          resolvedAt: new Date().toISOString(),
        },
      },
      allowUnreserved: true,
    });
    await writeAudit({
      actorUserId: adminId,
      action: 'PAYMENT_REVIEW_RESOLVED',
      resourceType: 'ORDER',
      resourceId: order.id,
      metadata: {
        action: input.action,
        note: input.note,
        providerReference: paidPayment.providerReference,
        ticketCount: result.ticketCount,
      },
      req,
    });
    return { resolved: true, action: input.action, ticketCount: result.ticketCount };
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: 'REFUND_PENDING', cancelledAt: new Date() },
    });
    await tx.payment.update({
      where: { id: paidPayment.id },
      data: { status: 'REFUND_PENDING' },
    });
    await tx.ticket.updateMany({
      where: { orderId: order.id, status: 'VALID' },
      data: { status: 'CANCELLED' },
    });
    await tx.refund.create({
      data: {
        orderId: order.id,
        amount: order.total,
        ticketAmount: order.subtotal - order.discount,
        feeAmount: order.platformFee,
        reason: input.note,
        idempotencyKey: `payment-review-refund:${order.id}`,
      },
    });
    await writeAudit(
      {
        actorUserId: adminId,
        action: 'PAYMENT_REVIEW_RESOLVED',
        resourceType: 'ORDER',
        resourceId: order.id,
        metadata: {
          action: input.action,
          note: input.note,
          providerReference: paidPayment.providerReference,
        },
        req,
      },
      tx,
    );
  });

  return { resolved: true, action: input.action, refundPending: true };
}

export async function listAuditLogs(query: AdminAuditQuery, operationalOnly = false) {
  const where: Prisma.AuditLogWhereInput = {
    ...(operationalOnly
      ? {
          AND: [
            { resourceType: { notIn: ['ADMIN', 'ROLE_PERMISSION', 'PLATFORM_SETTINGS'] } },
            {
              action: {
                notIn: [
                  'ADMIN_CREATED',
                  'ADMIN_MODIFIED',
                  'ADMIN_PASSWORD_RESET',
                  'ROLE_PERMISSION_UPDATED',
                  'PLATFORM_SETTINGS_UPDATED',
                ],
              },
            },
          ],
        }
      : {}),
    ...(query.action ? { action: query.action } : {}),
    ...(query.resourceType ? { resourceType: query.resourceType } : {}),
    ...(query.q
      ? {
          OR: [
            { action: { contains: query.q, mode: 'insensitive' } },
            { resourceType: { contains: query.q, mode: 'insensitive' } },
            { resourceId: { contains: query.q, mode: 'insensitive' } },
            { actor: { name: { contains: query.q, mode: 'insensitive' } } },
            { actor: { email: { contains: query.q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };
  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        action: true,
        resourceType: true,
        resourceId: true,
        metadata: true,
        ip: true,
        requestId: true,
        createdAt: true,
        actor: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);
  return {
    data: logs,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}
