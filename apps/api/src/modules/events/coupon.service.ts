import type { Request } from 'express';
import { prisma } from '../../lib/prisma';
import { writeAudit } from '../../lib/audit';
import { ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors';

export type CouponInput = {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  maxDiscount?: number | null;
  minimumPurchase: number;
  maxRedemptions?: number | null;
  maxPerUser?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  isActive: boolean;
};

async function getOwnedEvent(eventId: string, organizerId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, organizerId: true, status: true, title: true },
  });
  if (!event) throw new NotFoundError('Event tidak ditemukan', 'EVENT_NOT_FOUND');
  if (event.organizerId !== organizerId) {
    throw new ForbiddenError('Event ini bukan milik organizer kamu', 'EVENT_NOT_OWNED');
  }
  return event;
}

async function getOwnedCoupon(couponId: string, organizerId: string) {
  const coupon = await prisma.coupon.findUnique({
    where: { id: couponId },
    include: { event: { select: { organizerId: true, status: true } } },
  });
  if (!coupon) throw new NotFoundError('Kupon tidak ditemukan', 'COUPON_NOT_FOUND');
  if (coupon.event.organizerId !== organizerId) {
    throw new ForbiddenError('Kupon ini bukan milik organizer kamu', 'COUPON_NOT_OWNED');
  }
  return coupon;
}

export async function listCoupons(eventId: string, organizerId: string) {
  await getOwnedEvent(eventId, organizerId);
  return prisma.coupon.findMany({
    where: { eventId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { orders: true } } },
  });
}

export async function createCoupon(
  eventId: string,
  organizerId: string,
  input: CouponInput,
  req: Request,
) {
  const event = await getOwnedEvent(eventId, organizerId);
  if (['CANCELLED', 'COMPLETED'].includes(event.status)) {
    throw new ConflictError('Event ini sudah dibatalkan atau selesai', 'EVENT_CLOSED');
  }
  const existing = await prisma.coupon.findUnique({
    where: { eventId_code: { eventId, code: input.code } },
  });
  if (existing) throw new ConflictError('Kode promo sudah dipakai di event ini', 'COUPON_CODE_TAKEN');

  return prisma.$transaction(async (tx) => {
    const coupon = await tx.coupon.create({
      data: {
        eventId,
        code: input.code,
        discountType: input.discountType,
        discountValue: input.discountValue,
        maxDiscount: input.maxDiscount ?? null,
        minimumPurchase: input.minimumPurchase,
        maxRedemptions: input.maxRedemptions ?? null,
        maxPerUser: input.maxPerUser ?? null,
        validFrom: input.validFrom ? new Date(input.validFrom) : null,
        validUntil: input.validUntil ? new Date(input.validUntil) : null,
        isActive: input.isActive,
      },
    });
    await writeAudit(
      {
        actorUserId: req.auth?.userId,
        action: 'COUPON_CREATED',
        resourceType: 'COUPON',
        resourceId: coupon.id,
        metadata: { eventId, code: coupon.code },
        req,
      },
      tx,
    );
    return coupon;
  });
}

export async function updateCoupon(
  couponId: string,
  organizerId: string,
  input: Partial<CouponInput>,
  req: Request,
) {
  const current = await getOwnedCoupon(couponId, organizerId);
  if (input.code && input.code !== current.code) {
    const existing = await prisma.coupon.findUnique({
      where: { eventId_code: { eventId: current.eventId, code: input.code } },
    });
    if (existing) {
      throw new ConflictError('Kode promo sudah dipakai di event ini', 'COUPON_CODE_TAKEN');
    }
  }
  return prisma.$transaction(async (tx) => {
    const coupon = await tx.coupon.update({
      where: { id: couponId },
      data: {
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.discountType !== undefined ? { discountType: input.discountType } : {}),
        ...(input.discountValue !== undefined ? { discountValue: input.discountValue } : {}),
        ...(input.maxDiscount !== undefined ? { maxDiscount: input.maxDiscount } : {}),
        ...(input.minimumPurchase !== undefined
          ? { minimumPurchase: input.minimumPurchase }
          : {}),
        ...(input.maxRedemptions !== undefined ? { maxRedemptions: input.maxRedemptions } : {}),
        ...(input.maxPerUser !== undefined ? { maxPerUser: input.maxPerUser } : {}),
        ...(input.validFrom !== undefined
          ? { validFrom: input.validFrom ? new Date(input.validFrom) : null }
          : {}),
        ...(input.validUntil !== undefined
          ? { validUntil: input.validUntil ? new Date(input.validUntil) : null }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    await writeAudit(
      {
        actorUserId: req.auth?.userId,
        action: 'COUPON_UPDATED',
        resourceType: 'COUPON',
        resourceId: couponId,
        metadata: { fields: Object.keys(input) },
        req,
      },
      tx,
    );
    return coupon;
  });
}

export async function deactivateCoupon(couponId: string, organizerId: string, req: Request) {
  await getOwnedCoupon(couponId, organizerId);
  return prisma.$transaction(async (tx) => {
    const coupon = await tx.coupon.update({
      where: { id: couponId },
      data: { isActive: false },
    });
    await writeAudit(
      {
        actorUserId: req.auth?.userId,
        action: 'COUPON_DEACTIVATED',
        resourceType: 'COUPON',
        resourceId: couponId,
        metadata: {},
        req,
      },
      tx,
    );
    return coupon;
  });
}
