import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import type { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { writeAudit } from '../../lib/audit';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors';
import { env } from '../../config/env';
import { isOperationalAdmin } from '@gofest/shared';
import type { refundSchema, refundReviewSchema, ListQuery } from './finance.schemas';
import { notifyAdmins } from '../notifications/inbox.service';

export async function requestRefund(input: z.infer<typeof refundSchema>, req: Request) {
  const existing = await prisma.refund.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    include: { order: { select: { userId: true } } },
  });
  if (existing) {
    if (!isOperationalAdmin(req.auth!.role) && existing.order.userId !== req.auth!.userId)
      throw new ForbiddenError();
    if (
      existing.orderId !== input.orderId ||
      existing.ticketAmount !== input.ticketAmount ||
      existing.feeAmount !== input.feeAmount ||
      existing.reason !== input.reason
    )
      throw new ConflictError('Idempotency key sudah digunakan');
    return existing;
  }
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${input.orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      include: { refunds: true },
    });
    if (!order) throw new NotFoundError('Order tidak ditemukan');
    if (!isOperationalAdmin(req.auth!.role) && order.userId !== req.auth!.userId)
      throw new ForbiddenError();
    const replay = await tx.refund.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (replay) {
      if (
        replay.orderId !== input.orderId ||
        replay.ticketAmount !== input.ticketAmount ||
        replay.feeAmount !== input.feeAmount ||
        replay.reason !== input.reason
      )
        throw new ConflictError('Idempotency key sudah digunakan');
      return replay;
    }
    if (
      !['PAID', 'PARTIALLY_REFUNDED', 'REFUND_PENDING', 'PAYMENT_REVIEW'].includes(order.status) ||
      !(await tx.financialLedger.findUnique({ where: { referenceId: `sale:${order.id}` } }))
    )
      throw new ConflictError('Order belum dibayar atau sudah direfund');
    const used = order.refunds.filter((refund) => refund.status !== 'REJECTED');
    if (
      used.reduce((sum, refund) => sum + refund.ticketAmount, input.ticketAmount) >
        order.subtotal - order.discount ||
      used.reduce((sum, refund) => sum + refund.feeAmount, input.feeAmount) > order.platformFee
    )
      throw new BadRequestError('Nominal refund melebihi alokasi pembayaran');
    const refund = await tx.refund.create({
      data: { ...input, amount: input.ticketAmount + input.feeAmount },
    });
    await notifyAdmins(tx, {
      category: 'REFUND',
      title: 'Permintaan refund baru',
      message: `${order.orderCode} · ${input.reason}`,
      href: '/admin/refunds',
    });
    await writeAudit(
      {
        actorUserId: req.auth!.userId,
        action: 'REFUND_REQUESTED',
        resourceType: 'REFUND',
        resourceId: refund.id,
        metadata: { orderId: order.id, amount: refund.amount },
        req,
      },
      tx,
    );
    return refund;
  });
}

export async function listRefunds(query: ListQuery, organizerId?: string) {
  if (query.status && !['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'].includes(query.status))
    throw new BadRequestError('Status refund tidak valid');
  const where: Prisma.RefundWhereInput = {
    ...(organizerId ? { order: { event: { organizerId } } } : {}),
    ...(query.status
      ? { status: query.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' }
      : {}),
    ...(query.q
      ? {
          OR: [
            { order: { orderCode: { contains: query.q, mode: 'insensitive' } } },
            { reason: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const [total, data] = await Promise.all([
    prisma.refund.count({ where }),
    prisma.refund.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      skip: (query.page - 1) * query.limit,
      include: {
        order: { select: { orderCode: true, buyerName: true, event: { select: { title: true } } } },
        reviewedBy: { select: { name: true } },
      },
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

export async function reviewRefund(
  id: string,
  input: z.infer<typeof refundReviewSchema>,
  req: Request,
) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM refunds WHERE id = ${id} FOR UPDATE`;
    const refund = await tx.refund.findUnique({
      where: { id },
      include: { order: { include: { event: true } } },
    });
    if (!refund) throw new NotFoundError('Refund tidak ditemukan');
    if (refund.status === input.status) return refund;
    if (refund.status !== 'PENDING') throw new ConflictError('Refund sudah ditinjau');
    if (input.status === 'APPROVED' && refund.ticketAmount > 0) {
      const sale = await tx.financialLedger.findUnique({
        where: { referenceId: `sale:${refund.orderId}` },
      });
      const release = await tx.financialLedger.findUnique({
        where: { referenceId: `settle:${refund.orderId}` },
      });
      const pending = sale?.credit === 'ORGANIZER_PENDING' && !release;
      const wallet = await tx.organizerWallet.updateMany({
        where: {
          organizerId: refund.order.event.organizerId,
          ...(pending
            ? { pending: { gte: refund.ticketAmount } }
            : { available: { gte: refund.ticketAmount } }),
        },
        data: {
          ...(pending
            ? { pending: { decrement: refund.ticketAmount } }
            : { available: { decrement: refund.ticketAmount } }),
          reserved: { increment: refund.ticketAmount },
        },
      });
      if (!wallet.count)
        throw new ConflictError('Saldo organizer tidak mencukupi untuk reservasi refund');
      await tx.financialLedger.create({
        data: {
          organizerId: refund.order.event.organizerId,
          orderId: refund.orderId,
          transactionType: 'REFUND_RESERVED',
          debit: pending ? 'ORGANIZER_PENDING' : 'ORGANIZER_AVAILABLE',
          credit: 'REFUND_RESERVED',
          amount: refund.ticketAmount,
          referenceId: `refund-reserve:${id}`,
          description: 'Reservasi refund yang disetujui; belum ada pengembalian melalui provider',
        },
      });
    }
    const result = await tx.refund.update({
      where: { id },
      data: { ...input, reviewedByUserId: req.auth!.userId, reviewedAt: new Date() },
    });
    await writeAudit(
      {
        actorUserId: req.auth!.userId,
        action: `REFUND_${input.status}`,
        resourceType: 'REFUND',
        resourceId: id,
        metadata: { amount: refund.amount, note: input.note },
        req,
      },
      tx,
    );
    await tx.notification.updateMany({
      where: { category: 'REFUND', readAt: null },
      data: { readAt: new Date() },
    });
    return result;
  });
}

export async function simulateRefund(id: string, req: Request) {
  if (env.isProduction) throw new ForbiddenError('Simulasi refund hanya tersedia di development');
  return prisma.$transaction(async (tx) => {
    // Order first is the shared lock for aggregate refund limits and order status.
    const found = await tx.refund.findUnique({ where: { id } });
    if (!found) throw new NotFoundError('Refund tidak ditemukan');
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${found.orderId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM refunds WHERE id = ${id} FOR UPDATE`;
    const refund = await tx.refund.findUniqueOrThrow({
      where: { id },
      include: { order: { include: { event: true } } },
    });
    if (refund.status === 'COMPLETED') return refund;
    if (refund.status !== 'APPROVED') throw new ConflictError('Setujui refund sebelum simulasi');
    const organizerId = refund.order.event.organizerId;
    if (refund.ticketAmount > 0) {
      const wallet = await tx.organizerWallet.updateMany({
        where: { organizerId, reserved: { gte: refund.ticketAmount } },
        data: { reserved: { decrement: refund.ticketAmount } },
      });
      if (!wallet.count) throw new ConflictError('Reservasi refund tidak konsisten');
      await tx.financialLedger.create({
        data: {
          organizerId,
          orderId: refund.orderId,
          transactionType: 'TICKET_REFUND',
          debit: 'REFUND_RESERVED',
          credit: 'PAYMENT_CLEARING',
          amount: refund.ticketAmount,
          referenceId: `refund-ticket:${id}`,
          description: 'Simulasi pengembalian harga tiket; tidak ada transfer eksternal',
        },
      });
    }
    if (refund.feeAmount > 0)
      await tx.financialLedger.create({
        data: {
          organizerId,
          orderId: refund.orderId,
          transactionType: 'FEE_REFUND',
          debit: 'PLATFORM_FEE_REVENUE',
          credit: 'PAYMENT_CLEARING',
          amount: refund.feeAmount,
          referenceId: `refund-fee:${id}`,
          description: 'Simulasi pengembalian service fee',
        },
      });
    const result = await tx.refund.update({
      where: { id },
      data: { status: 'COMPLETED', provider: 'INTERNAL_SIMULATION' },
    });
    const completed = await tx.refund.aggregate({
      where: { orderId: refund.orderId, status: 'COMPLETED' },
      _sum: { amount: true },
    });
    const full = completed._sum.amount === refund.order.total;
    await tx.order.update({
      where: { id: refund.orderId },
      data: { status: full ? 'REFUNDED' : 'PARTIALLY_REFUNDED' },
    });
    if (full) {
      await tx.ticket.updateMany({
        where: { orderId: refund.orderId },
        data: { status: 'REFUNDED' },
      });
      await tx.payment.updateMany({
        where: { orderId: refund.orderId, status: { in: ['PAID', 'REFUND_PENDING'] } },
        data: { status: 'REFUNDED' },
      });
    }
    await writeAudit(
      {
        actorUserId: req.auth!.userId,
        action: 'REFUND_SIMULATED',
        resourceType: 'REFUND',
        resourceId: id,
        metadata: {
          amount: refund.amount,
          provider: 'INTERNAL_SIMULATION',
          externalTransfer: false,
        },
        req,
      },
      tx,
    );
    return result;
  });
}
