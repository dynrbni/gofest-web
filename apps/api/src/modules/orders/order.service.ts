import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import type { z } from 'zod';
import QRCode from 'qrcode';
import type { createOrderSchema, orderAccessSchema } from '@gofest/shared';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  UnprocessableEntityError,
} from '../../lib/errors';
import { hmacSha256, humanCode, randomToken, safeCompare, sha256 } from '../../lib/crypto';
import { logger } from '../../lib/logger';
import { writeAudit } from '../../lib/audit';
import { removePrivateObject, storePrivateFile } from '../../lib/storage';
import { enqueueEmail } from '../notifications/email.service';
import { getPlatformSettings } from '../settings/settings.service';
import { getPaymentProvider } from '../payments/provider';
import type { VerifiedPaymentEvent } from '../payments/payment.provider';

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderAccessInput = z.infer<typeof orderAccessSchema>;

const orderInclude = {
  event: {
    select: {
      id: true,
      title: true,
      slug: true,
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
  items: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      ticketTypeId: true,
      ticketNameSnapshot: true,
      unitPrice: true,
      quantity: true,
      lineTotal: true,
    },
  },
  payments: {
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      provider: true,
      providerReference: true,
      method: true,
      amount: true,
      currency: true,
      status: true,
      paidAt: true,
      expiresAt: true,
    },
  },
  tickets: {
    orderBy: { issuedAt: 'asc' },
    select: {
      id: true,
      ticketCode: true,
      ticketTypeId: true,
      holderName: true,
      status: true,
      issuedAt: true,
      checkedInAt: true,
      qrImageKey: true,
    },
  },
} as const;

type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export function orderAccessToken(orderId: string): string {
  return hmacSha256(env.AUTH_REFRESH_TOKEN_SECRET, `order-access:${orderId}`);
}

export function serializeOrder(order: OrderWithRelations) {
  const paid =
    order.status === 'PAID' ||
    order.status === 'PARTIALLY_REFUNDED' ||
    order.status === 'REFUND_PENDING';
  return {
    id: order.id,
    orderCode: order.orderCode,
    status: order.status,
    subtotal: order.subtotal,
    discount: order.discount,
    platformFee: order.platformFee,
    total: order.total,
    currency: order.currency,
    buyerName: order.buyerName,
    buyerEmail: order.buyerEmail,
    buyerPhone: order.buyerPhone,
    createdAt: order.createdAt,
    expiresAt: order.expiresAt,
    paidAt: order.paidAt,
    event: {
      ...order.event,
      onlineAccessUrl: paid ? order.event.onlineAccessUrl : null,
      onlineAccessNote: paid ? order.event.onlineAccessNote : null,
    },
    items: order.items,
    payment: order.payments[0] ?? null,
    tickets: order.tickets.map(({ qrImageKey: _qrImageKey, ...ticket }) => ticket),
    ticketCount: order.tickets.length,
  };
}

async function loadOrderByCode(orderCode: string) {
  const order = await prisma.order.findUnique({
    where: { orderCode },
    include: orderInclude,
  });
  if (!order) throw new NotFoundError('Order tidak ditemukan', 'ORDER_NOT_FOUND');
  return order;
}

function accessTokenFromRequest(req: Request): string | undefined {
  const header = req.get('x-order-token');
  if (header) return header.trim();
  const queryToken = req.query.token;
  if (typeof queryToken === 'string' && queryToken.length > 0) return queryToken;
  return undefined;
}

export async function getOrderForAccess(orderCode: string, req: Request) {
  const order = await loadOrderByCode(orderCode);
  if (req.auth?.role === 'ADMIN' || (req.auth && order.userId === req.auth.userId)) {
    return order;
  }
  const token = accessTokenFromRequest(req);
  if (token && safeCompare(sha256(token), order.accessTokenHash)) {
    return order;
  }
  throw new UnauthorizedError(
    'Token akses order tidak valid. Buka tautan dari email konfirmasi.',
    'ORDER_ACCESS_DENIED',
  );
}

interface LockedTicketType {
  id: string;
  name: string;
  price: number;
  quotaTotal: number;
  quantitySold: number;
  quantityReserved: number;
  isActive: boolean;
  salesStartAt: Date | null;
  salesEndAt: Date | null;
  minPerOrder: number;
  maxPerOrder: number;
}

interface LockedCoupon {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  maxDiscount: number | null;
  minimumPurchase: number;
  maxRedemptions: number | null;
  redeemedCount: number;
  maxPerUser: number | null;
  validFrom: Date | null;
  validUntil: Date | null;
  isActive: boolean;
}

function assertEventOnSale(
  event: { status: string; startsAt: Date; endsAt: Date; salesStartAt: Date | null; salesEndAt: Date | null },
  now: Date,
) {
  if (event.status !== 'PUBLISHED') {
    throw new ConflictError('Event belum dibuka untuk penjualan', 'EVENT_NOT_ON_SALE');
  }
  if (event.startsAt <= now) {
    throw new ConflictError('Event sudah dimulai atau selesai', 'EVENT_ALREADY_STARTED');
  }
  if (event.endsAt <= now) {
    throw new ConflictError('Event sudah selesai', 'EVENT_ALREADY_ENDED');
  }
  if (event.salesStartAt && event.salesStartAt > now) {
    throw new ConflictError('Penjualan tiket belum dibuka', 'EVENT_SALES_NOT_STARTED');
  }
  if (event.salesEndAt && event.salesEndAt <= now) {
    throw new ConflictError('Penjualan tiket sudah ditutup', 'EVENT_SALES_ENDED');
  }
}

function computeDiscount(coupon: LockedCoupon, subtotal: number, now: Date): number {
  if (!coupon.isActive) {
    throw new ConflictError('Kode promo tidak aktif', 'COUPON_INACTIVE');
  }
  if (coupon.validFrom && coupon.validFrom > now) {
    throw new ConflictError('Kode promo belum berlaku', 'COUPON_NOT_STARTED');
  }
  if (coupon.validUntil && coupon.validUntil <= now) {
    throw new ConflictError('Kode promo sudah kedaluwarsa', 'COUPON_EXPIRED');
  }
  if (subtotal < coupon.minimumPurchase) {
    throw new ConflictError(
      `Kode promo membutuhkan pembelian minimal ${coupon.minimumPurchase}`,
      'COUPON_MINIMUM_PURCHASE',
    );
  }
  if (coupon.maxRedemptions !== null && coupon.redeemedCount >= coupon.maxRedemptions) {
    throw new ConflictError('Kuota kode promo sudah habis', 'COUPON_LIMIT_REACHED');
  }
  let discount =
    coupon.discountType === 'PERCENTAGE'
      ? Math.floor((subtotal * coupon.discountValue) / 100)
      : coupon.discountValue;
  if (coupon.maxDiscount !== null) {
    discount = Math.min(discount, coupon.maxDiscount);
  }
  return Math.max(0, Math.min(discount, subtotal));
}

function platformFeeFor(
  settings: { platformFeeType: 'none' | 'fixed' | 'percentage'; platformFeeValue: number },
  taxable: number,
): number {
  if (settings.platformFeeType === 'fixed') return settings.platformFeeValue;
  if (settings.platformFeeType === 'percentage') {
    return Math.floor((taxable * settings.platformFeeValue) / 100);
  }
  return 0;
}

export async function createOrder(input: CreateOrderInput, req: Request) {
  const settings = await getPlatformSettings();

  if (input.idempotencyKey) {
    const existing = await prisma.order.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: orderInclude,
    });
    if (existing) {
      if (existing.buyerEmail !== input.buyerEmail) {
        throw new ConflictError('Idempotency key sudah dipakai untuk order lain', 'IDEMPOTENCY_CONFLICT');
      }
      return {
        order: serializeOrder(existing),
        accessToken: orderAccessToken(existing.id),
        reused: true,
        paymentRequired: existing.total > 0 && existing.status === 'PENDING_PAYMENT',
      };
    }
  }

  const now = new Date();
  let createdId = '';
  let accessToken = '';

  try {
    await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: input.eventId },
        include: { organizer: { select: { organizationName: true, slug: true } } },
      });
      if (!event) throw new NotFoundError('Event tidak ditemukan', 'EVENT_NOT_FOUND');
      assertEventOnSale(event, now);

      const ticketIds = input.items.map((item) => item.ticketTypeId);
      if (new Set(ticketIds).size !== ticketIds.length) {
        throw new UnprocessableEntityError('Tipe tiket tidak boleh dikirim dua kali');
      }

      const locked = await tx.$queryRaw<LockedTicketType[]>(Prisma.sql`
        SELECT "id", "name", "price", "quotaTotal", "quantitySold", "quantityReserved",
               "isActive", "salesStartAt", "salesEndAt", "minPerOrder", "maxPerOrder"
        FROM "ticket_types"
        WHERE "eventId" = ${event.id} AND "id" IN (${Prisma.join(ticketIds)})
        ORDER BY "id"
        FOR UPDATE
      `);
      if (locked.length !== ticketIds.length) {
        throw new NotFoundError('Salah satu tipe tiket tidak ditemukan', 'TICKET_TYPE_NOT_FOUND');
      }
      const lockedById = new Map(locked.map((ticket) => [ticket.id, ticket]));

      let subtotal = 0;
      const orderItems: Array<{
        ticketTypeId: string;
        ticketNameSnapshot: string;
        unitPrice: number;
        quantity: number;
        lineTotal: number;
      }> = [];

      for (const item of input.items) {
        const ticket = lockedById.get(item.ticketTypeId)!;
        if (!ticket.isActive) {
          throw new ConflictError(`Tipe tiket ${ticket.name} tidak aktif`, 'TICKET_TYPE_INACTIVE');
        }
        if (ticket.salesStartAt && ticket.salesStartAt > now) {
          throw new ConflictError(
            `Penjualan tipe tiket ${ticket.name} belum dibuka`,
            'TICKET_SALES_NOT_STARTED',
          );
        }
        if (ticket.salesEndAt && ticket.salesEndAt <= now) {
          throw new ConflictError(
            `Penjualan tipe tiket ${ticket.name} sudah ditutup`,
            'TICKET_SALES_ENDED',
          );
        }
        if (item.quantity < ticket.minPerOrder || item.quantity > ticket.maxPerOrder) {
          throw new ConflictError(
            `Jumlah tiket ${ticket.name} harus antara ${ticket.minPerOrder} dan ${ticket.maxPerOrder}`,
            'TICKET_ORDER_LIMIT',
          );
        }
        const available = ticket.quotaTotal - ticket.quantitySold - ticket.quantityReserved;
        if (available < item.quantity) {
          throw new ConflictError(
            `Kuota tipe tiket ${ticket.name} tidak mencukupi`,
            'TICKET_SOLD_OUT',
          );
        }
        const reserved = await tx.$executeRaw(Prisma.sql`
          UPDATE "ticket_types"
          SET "quantityReserved" = "quantityReserved" + ${item.quantity}
          WHERE "id" = ${ticket.id}
            AND "quantitySold" + "quantityReserved" + ${item.quantity} <= "quotaTotal"
        `);
        if (reserved !== 1) {
          throw new ConflictError(
            `Kuota tipe tiket ${ticket.name} baru saja habis. Coba tipe lain.`,
            'TICKET_SOLD_OUT',
          );
        }
        const lineTotal = ticket.price * item.quantity;
        subtotal += lineTotal;
        orderItems.push({
          ticketTypeId: ticket.id,
          ticketNameSnapshot: ticket.name,
          unitPrice: ticket.price,
          quantity: item.quantity,
          lineTotal,
        });
      }

      let discount = 0;
      let couponId: string | null = null;
      if (input.couponCode) {
        const coupons = await tx.$queryRaw<LockedCoupon[]>(Prisma.sql`
          SELECT "id", "code", "discountType", "discountValue", "maxDiscount",
                 "minimumPurchase", "maxRedemptions", "redeemedCount", "maxPerUser",
                 "validFrom", "validUntil", "isActive"
          FROM "coupons"
          WHERE "eventId" = ${event.id} AND "code" = ${input.couponCode}
          FOR UPDATE
        `);
        const coupon = coupons[0];
        if (!coupon) {
          throw new ConflictError('Kode promo tidak ditemukan untuk event ini', 'COUPON_NOT_FOUND');
        }
        if (coupon.maxPerUser !== null) {
          const used = await tx.couponRedemption.count({
            where: {
              couponId: coupon.id,
              releasedAt: null,
              ...(req.auth
                ? {
                    OR: [
                      { userId: req.auth.userId },
                      { email: input.buyerEmail },
                    ],
                  }
                : { email: input.buyerEmail }),
            },
          });
          if (used >= coupon.maxPerUser) {
            throw new ConflictError(
              'Kode promo sudah dipakai untuk pembelian lain',
              'COUPON_USER_LIMIT',
            );
          }
        }
        discount = computeDiscount(coupon, subtotal, now);
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { redeemedCount: { increment: 1 } },
        });
        couponId = coupon.id;
      }

      const platformFee = platformFeeFor(settings, subtotal - discount);
      const total = subtotal - discount + platformFee;
      const orderCode = humanCode('GF', 10);
      const expiresAt = new Date(now.getTime() + settings.orderReservationMinutes * 60_000);

      const order = await tx.order.create({
        data: {
          orderCode,
          accessTokenHash: 'pending',
          userId: req.auth?.userId ?? null,
          eventId: event.id,
          buyerName: input.buyerName,
          buyerEmail: input.buyerEmail,
          buyerPhone: input.buyerPhone ?? null,
          subtotal,
          discount,
          platformFee,
          total,
          currency: 'IDR',
          couponId,
          idempotencyKey: input.idempotencyKey,
          expiresAt,
          eventSnapshot: {
            eventId: event.id,
            title: event.title,
            slug: event.slug,
            startsAt: event.startsAt.toISOString(),
            endsAt: event.endsAt.toISOString(),
            timezone: event.timezone,
            type: event.type,
            venueName: event.venueName,
            address: event.address,
            city: event.city,
            organizerName: event.organizer.organizationName,
            organizerSlug: event.organizer.slug,
          },
          items: { create: orderItems },
        },
      });
      const token = orderAccessToken(order.id);
      await tx.order.update({
        where: { id: order.id },
        data: { accessTokenHash: sha256(token) },
      });

      if (couponId) {
        await tx.couponRedemption.create({
          data: {
            couponId,
            orderId: order.id,
            userId: req.auth?.userId ?? null,
            email: input.buyerEmail,
          },
        });
      }

      createdId = order.id;
      accessToken = token;

      await enqueueEmail(
        {
          to: order.buyerEmail,
          subject: `Pesanan ${order.orderCode} menunggu pembayaran`,
          template: 'ORDER_CREATED',
          payload: {
            buyerName: order.buyerName,
            orderCode: order.orderCode,
            eventTitle: event.title,
            total: order.total,
            expiresAtFormatted: new Intl.DateTimeFormat('id-ID', {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: event.timezone,
            }).format(expiresAt),
            paymentUrl: `${env.WEB_URL}/order/${order.orderCode}?token=${token}`,
          },
        },
        tx,
      );
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      if (input.idempotencyKey) {
        const existing = await prisma.order.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          include: orderInclude,
        });
        if (existing && existing.buyerEmail === input.buyerEmail) {
          return {
            order: serializeOrder(existing),
            accessToken: orderAccessToken(existing.id),
            reused: true,
            paymentRequired: existing.total > 0 && existing.status === 'PENDING_PAYMENT',
          };
        }
      }
    }
    throw error;
  }

  let order = await loadOrderByCode(
    (await prisma.order.findUniqueOrThrow({ where: { id: createdId } })).orderCode,
  );

  if (order.total === 0 && order.status === 'PENDING_PAYMENT') {
    try {
      await fulfillOrder(createdId, {
        provider: 'free',
        providerReference: `FREE-${order.orderCode}`,
        amount: 0,
        currency: order.currency,
        paidAt: new Date(),
        raw: { type: 'free_order' },
        allowUnreserved: false,
      });
      order = await loadOrderByCode(order.orderCode);
    } catch (error) {
      logger.error({ error, orderId: createdId }, 'Gagal menerbitkan tiket gratis');
    }
  }

  return {
    order: serializeOrder(order),
    accessToken,
    reused: false,
    paymentRequired: order.total > 0 && order.status === 'PENDING_PAYMENT',
  };
}

export async function getOrderStatus(orderCode: string, req: Request) {
  const order = await getOrderForAccess(orderCode, req);
  return {
    order: serializeOrder(order),
    serverTime: new Date().toISOString(),
  };
}

export async function getOrderTickets(orderCode: string, req: Request) {
  const order = await getOrderForAccess(orderCode, req);
  const requestToken = accessTokenFromRequest(req);
  return {
    orderCode: order.orderCode,
    status: order.status,
    tickets: order.tickets.map(({ qrImageKey: _qrImageKey, ...ticket }) => ({
      ...ticket,
      qrUrl: queryTokenUrl(order.orderCode, ticket.id, requestToken),
    })),
  };
}

function queryTokenUrl(orderCode: string, ticketId: string, token?: string) {
  const base = `/api/v1/orders/${encodeURIComponent(orderCode)}/tickets/${encodeURIComponent(
    ticketId,
  )}/qr`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

export async function getOrderTicketQr(orderCode: string, ticketId: string, req: Request) {
  const order = await getOrderForAccess(orderCode, req);
  const ticket = order.tickets.find((entry) => entry.id === ticketId);
  if (!ticket) throw new NotFoundError('Tiket tidak ditemukan', 'TICKET_NOT_FOUND');
  if (ticket.status === 'CANCELLED' || ticket.status === 'REFUNDED') {
    throw new ConflictError('Tiket ini sudah tidak berlaku', 'TICKET_INVALID');
  }
  return { ticket, qrImageKey: ticket.qrImageKey };
}

export async function regenerateTicketQr(orderCode: string, ticketId: string, req: Request) {
  const order = await getOrderForAccess(orderCode, req);
  if (order.status !== 'PAID') {
    throw new ConflictError('QR hanya dapat diperbarui untuk order yang sudah dibayar', 'ORDER_NOT_PAID');
  }
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, orderId: order.id },
    select: { id: true, status: true, qrTokenHash: true, qrImageKey: true },
  });
  if (!ticket) throw new NotFoundError('Tiket tidak ditemukan', 'TICKET_NOT_FOUND');
  if (ticket.status !== 'VALID') {
    throw new ConflictError(
      'Tiket yang sudah dipakai atau dibatalkan tidak dapat diperbarui QR-nya',
      'TICKET_NOT_REGENERATABLE',
    );
  }

  const token = randomToken(48);
  const png = await QRCode.toBuffer(token, {
    type: 'png',
    width: 480,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
  const newKey = await storePrivateFile(png, 'tickets');

  const changed = await prisma.ticket.updateMany({
    where: { id: ticket.id, status: 'VALID', qrTokenHash: ticket.qrTokenHash },
    data: { qrTokenHash: sha256(token), qrImageKey: newKey },
  });
  if (changed.count !== 1) {
    await removePrivateObject(newKey);
    throw new ConflictError('Tiket berubah saat QR diperbarui. Coba lagi.', 'TICKET_NOT_REGENERATABLE');
  }

  await removePrivateObject(ticket.qrImageKey);
  const requestToken = accessTokenFromRequest(req) ?? orderAccessToken(order.id);
  return {
    ticketId: ticket.id,
    qrUrl: queryTokenUrl(order.orderCode, ticket.id, requestToken),
  };
}

export async function createOrderPaymentSession(orderCode: string, req: Request) {
  let order = await getOrderForAccess(orderCode, req);
  if (order.status === 'PAID') {
    return { alreadyPaid: true, order: serializeOrder(order), payment: null, redirectUrl: null };
  }
  if (['CANCELLED', 'EXPIRED', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(order.status)) {
    throw new ConflictError('Order ini tidak dapat dibayar lagi', 'ORDER_NOT_PAYABLE');
  }
  if (order.expiresAt <= new Date()) {
    await expireOrder(order.id);
    throw new ConflictError(
      'Batas waktu pembayaran sudah lewat. Silakan buat order baru.',
      'ORDER_EXPIRED',
    );
  }
  if (order.status === 'PAYMENT_REVIEW') {
    throw new ConflictError(
      'Pembayaran order ini sedang ditinjau admin',
      'ORDER_IN_PAYMENT_REVIEW',
    );
  }
  if (order.total === 0) {
    await fulfillOrder(order.id, {
      provider: 'free',
      providerReference: `FREE-${order.orderCode}`,
      amount: 0,
      currency: order.currency,
      paidAt: new Date(),
      raw: { type: 'free_order' },
      allowUnreserved: false,
    });
    order = await loadOrderByCode(orderCode);
    return { alreadyPaid: true, order: serializeOrder(order), payment: null, redirectUrl: null };
  }

  const provider = getPaymentProvider();
  const token = accessTokenFromRequest(req) ?? orderAccessToken(order.id);
  const returnUrl = `${env.WEB_URL}/order/${order.orderCode}?token=${encodeURIComponent(token)}`;
  const result = await provider.createPayment({
    orderCode: order.orderCode,
    amount: order.total,
    currency: order.currency,
    expiresAt: order.expiresAt,
    description: `Tiket ${order.event.title}`,
    customer: {
      name: order.buyerName,
      email: order.buyerEmail,
      phone: order.buyerPhone,
    },
    returnUrl,
  });

  const existing = await prisma.payment.findUnique({
    where: {
      provider_providerReference: {
        provider: provider.name,
        providerReference: result.providerReference,
      },
    },
  });
  if (existing?.status === 'PAID') {
    return {
      alreadyPaid: true,
      order: serializeOrder(await loadOrderByCode(orderCode)),
      payment: null,
      redirectUrl: null,
    };
  }

  const payment = await prisma.payment.upsert({
    where: {
      provider_providerReference: {
        provider: provider.name,
        providerReference: result.providerReference,
      },
    },
    create: {
      orderId: order.id,
      provider: provider.name,
      providerReference: result.providerReference,
      method: result.method,
      amount: order.total,
      currency: order.currency,
      status: 'PENDING',
      expiresAt: result.expiresAt,
      rawPayload: result.raw as Prisma.InputJsonValue,
    },
    update: {
      method: result.method,
      amount: order.total,
      expiresAt: result.expiresAt,
      rawPayload: result.raw as Prisma.InputJsonValue,
    },
  });

  return {
    alreadyPaid: false,
    order: serializeOrder(await loadOrderByCode(orderCode)),
    payment: {
      id: payment.id,
      provider: payment.provider,
      providerReference: payment.providerReference,
      method: payment.method,
      amount: payment.amount,
      status: payment.status,
      expiresAt: payment.expiresAt,
    },
    redirectUrl: result.redirectUrl,
  };
}

interface FulfillOptions {
  provider: string;
  providerReference: string;
  amount: number;
  currency: string;
  paidAt: Date;
  raw: Record<string, unknown>;
  allowUnreserved: boolean;
}

export async function fulfillOrder(orderId: string, options: FulfillOptions) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, event: { select: { id: true, title: true, slug: true } } },
  });
  if (!order) throw new NotFoundError('Order tidak ditemukan', 'ORDER_NOT_FOUND');
  if (order.status === 'PAID') {
    return { alreadyPaid: true, ticketCount: 0 };
  }

  const prepared: Array<{
    orderItemId: string;
    ticketTypeId: string;
    ticketCode: string;
    qrTokenHash: string;
    qrImageKey: string;
    holderName: string;
    holderEmail: string;
    eventSnapshot: Prisma.InputJsonValue;
    ticketTypeSnapshot: Prisma.InputJsonValue;
  }> = [];
  const qrKeys: string[] = [];

  try {
    for (const item of order.items) {
      for (let index = 0; index < item.quantity; index += 1) {
        const token = randomToken(48);
        const png = await QRCode.toBuffer(token, {
          type: 'png',
          width: 480,
          margin: 1,
          errorCorrectionLevel: 'M',
        });
        const qrImageKey = await storePrivateFile(png, 'tickets');
        qrKeys.push(qrImageKey);
        prepared.push({
          orderItemId: item.id,
          ticketTypeId: item.ticketTypeId,
          ticketCode: humanCode('TKT', 8),
          qrTokenHash: sha256(token),
          qrImageKey,
          holderName: order.buyerName,
          holderEmail: order.buyerEmail,
          eventSnapshot: order.eventSnapshot as Prisma.InputJsonValue,
          ticketTypeSnapshot: {
            name: item.ticketNameSnapshot,
            price: item.unitPrice,
          },
        });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const lockedOrders = await tx.$queryRaw<{ status: string }[]>(Prisma.sql`
        SELECT "status" FROM "orders" WHERE "id" = ${orderId} FOR UPDATE
      `);
      const status = lockedOrders[0]?.status;
      if (!status) throw new NotFoundError('Order tidak ditemukan', 'ORDER_NOT_FOUND');
      if (status === 'PAID') return { alreadyPaid: true, ticketCount: 0 };
      if (status !== 'PENDING_PAYMENT' && status !== 'PAYMENT_REVIEW') {
        throw new ConflictError('Order ini tidak dapat diterbitkan tiketnya', 'ORDER_NOT_FULFILLABLE');
      }

      const ticketIds = [...new Set(order.items.map((item) => item.ticketTypeId))].sort();
      const lockedTickets = await tx.$queryRaw<LockedTicketType[]>(Prisma.sql`
        SELECT "id", "name", "price", "quotaTotal", "quantitySold", "quantityReserved",
               "isActive", "salesStartAt", "salesEndAt", "minPerOrder", "maxPerOrder"
        FROM "ticket_types"
        WHERE "id" IN (${Prisma.join(ticketIds)})
        ORDER BY "id"
        FOR UPDATE
      `);
      const lockedById = new Map(lockedTickets.map((ticket) => [ticket.id, ticket]));

      for (const item of order.items) {
        const ticket = lockedById.get(item.ticketTypeId);
        if (!ticket) {
          throw new ConflictError('Tipe tiket order tidak ditemukan', 'TICKET_TYPE_NOT_FOUND');
        }
        if (ticket.quantityReserved >= item.quantity) {
          await tx.ticketType.update({
            where: { id: ticket.id },
            data: {
              quantityReserved: { decrement: item.quantity },
              quantitySold: { increment: item.quantity },
            },
          });
          continue;
        }
        if (!options.allowUnreserved) {
          throw new ConflictError(
            'Reservasi kuota sudah dilepas. Pembayaran perlu ditinjau admin.',
            'RESERVATION_LOST',
          );
        }
        const available = ticket.quotaTotal - ticket.quantitySold - ticket.quantityReserved;
        if (available < item.quantity) {
          throw new ConflictError(
            `Kuota tipe tiket ${ticket.name} tidak mencukupi untuk menerbitkan tiket`,
            'TICKET_SOLD_OUT',
          );
        }
        await tx.ticketType.update({
          where: { id: ticket.id },
          data: { quantitySold: { increment: item.quantity } },
        });
      }

      await tx.ticket.createMany({
        data: prepared.map((ticket) => ({
          orderId,
          orderItemId: ticket.orderItemId,
          eventId: order.eventId,
          ticketTypeId: ticket.ticketTypeId,
          ticketCode: ticket.ticketCode,
          qrTokenHash: ticket.qrTokenHash,
          qrImageKey: ticket.qrImageKey,
          holderName: ticket.holderName,
          holderEmail: ticket.holderEmail,
          eventSnapshot: ticket.eventSnapshot,
          ticketTypeSnapshot: ticket.ticketTypeSnapshot,
        })),
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'PAID', paidAt: options.paidAt },
      });

      await tx.payment.upsert({
        where: {
          provider_providerReference: {
            provider: options.provider,
            providerReference: options.providerReference,
          },
        },
        create: {
          orderId,
          provider: options.provider,
          providerReference: options.providerReference,
          method: options.provider,
          amount: options.amount,
          currency: options.currency,
          status: 'PAID',
          paidAt: options.paidAt,
          rawPayload: options.raw as Prisma.InputJsonValue,
        },
        update: {
          status: 'PAID',
          paidAt: options.paidAt,
          rawPayload: options.raw as Prisma.InputJsonValue,
        },
      });

      const token = orderAccessToken(orderId);
      await enqueueEmail(
        {
          to: order.buyerEmail,
          subject: `Tiket ${order.event.title} sudah terbit`,
          template: 'PAYMENT_SUCCESS',
          payload: {
            buyerName: order.buyerName,
            orderCode: order.orderCode,
            eventTitle: order.event.title,
            ticketCount: prepared.length,
            ticketUrl: `${env.WEB_URL}/tickets/${order.orderCode}?token=${token}`,
          },
        },
        tx,
      );

      await writeAudit(
        {
          action: 'ORDER_PAID',
          resourceType: 'ORDER',
          resourceId: orderId,
          metadata: {
            ticketCount: prepared.length,
            provider: options.provider,
            providerReference: options.providerReference,
          },
        },
        tx,
      );

      return { alreadyPaid: false, ticketCount: prepared.length };
    });

    if (result.alreadyPaid) {
      await Promise.all(qrKeys.map((key) => removePrivateObject(key)));
    }
    return result;
  } catch (error) {
    await Promise.all(qrKeys.map((key) => removePrivateObject(key)));
    throw error;
  }
}

export async function expireOrder(orderId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true, couponRedemption: true },
    });
    if (!order || order.status !== 'PENDING_PAYMENT' || order.expiresAt > new Date()) {
      return false;
    }
    const changed = await tx.order.updateMany({
      where: { id: orderId, status: 'PENDING_PAYMENT' },
      data: { status: 'EXPIRED' },
    });
    if (changed.count !== 1) return false;

    for (const item of order.items) {
      await tx.$executeRaw(Prisma.sql`
        UPDATE "ticket_types"
        SET "quantityReserved" = "quantityReserved" - ${item.quantity}
        WHERE "id" = ${item.ticketTypeId} AND "quantityReserved" >= ${item.quantity}
      `);
    }
    if (order.couponRedemption) {
      await tx.coupon.updateMany({
        where: { id: order.couponRedemption.couponId, redeemedCount: { gt: 0 } },
        data: { redeemedCount: { decrement: 1 } },
      });
      await tx.couponRedemption.update({
        where: { id: order.couponRedemption.id },
        data: { releasedAt: new Date() },
      });
    }
    await writeAudit(
      {
        action: 'ORDER_EXPIRED',
        resourceType: 'ORDER',
        resourceId: orderId,
        metadata: { orderCode: order.orderCode },
      },
      tx,
    );
    return true;
  });
}

export async function releaseExpiredOrders(limit = 50): Promise<number> {
  const expired = await prisma.order.findMany({
    where: { status: 'PENDING_PAYMENT', expiresAt: { lte: new Date() } },
    select: { id: true },
    orderBy: { expiresAt: 'asc' },
    take: limit,
  });
  let released = 0;
  for (const order of expired) {
    try {
      if (await expireOrder(order.id)) released += 1;
    } catch (error) {
      logger.error({ error, orderId: order.id }, 'Gagal melepas reservasi order');
    }
  }
  return released;
}

export async function processVerifiedPayment(
  event: VerifiedPaymentEvent,
  providerName = 'mock',
) {
  const order = await prisma.order.findUnique({
    where: { orderCode: event.orderCode },
    include: { payments: true },
  });
  if (!order) {
    throw new NotFoundError('Order untuk pembayaran ini tidak ditemukan', 'ORDER_NOT_FOUND');
  }
  if (event.currency !== order.currency) {
    throw new UnprocessableEntityError('Mata uang pembayaran tidak sesuai', [
      { path: 'currency', message: `Diharapkan ${order.currency}` },
    ]);
  }
  if (event.amount !== order.total) {
    throw new UnprocessableEntityError('Nominal pembayaran tidak sesuai dengan total order', [
      { path: 'amount', message: `Diharapkan ${order.total}` },
    ]);
  }

  const payment = order.payments.find(
    (entry) =>
      entry.provider === providerName && entry.providerReference === event.providerReference,
  );
  if (!payment) {
    throw new NotFoundError(
      'Referensi pembayaran tidak dikenal untuk order ini',
      'PAYMENT_REFERENCE_UNKNOWN',
    );
  }

  if (event.status === 'FAILED' || event.status === 'EXPIRED') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: event.status,
        rawPayload: event.raw as Prisma.InputJsonValue,
      },
    });
    return { processed: true, paid: false, orderStatus: order.status };
  }

  if (order.status === 'PAID') {
    if (payment.status !== 'PAID') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'PAID', paidAt: event.paidAt ?? new Date() },
      });
    }
    return { processed: true, paid: true, duplicate: true, orderStatus: order.status };
  }

  if (order.status === 'EXPIRED' || order.status === 'CANCELLED') {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'PAID',
          paidAt: event.paidAt ?? new Date(),
          rawPayload: event.raw as Prisma.InputJsonValue,
        },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: { status: 'PAYMENT_REVIEW' },
      }),
      prisma.auditLog.create({
        data: {
          action: 'PAYMENT_REVIEW_REQUIRED',
          resourceType: 'ORDER',
          resourceId: order.id,
          metadata: {
            reason: 'Pembayaran datang setelah reservasi kedaluwarsa',
            providerReference: event.providerReference,
          },
        },
      }),
    ]);
    return {
      processed: true,
      paid: false,
      paymentReview: true,
      orderStatus: 'PAYMENT_REVIEW',
    };
  }

  if (order.status === 'PAYMENT_REVIEW') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PAID',
        paidAt: event.paidAt ?? new Date(),
        rawPayload: event.raw as Prisma.InputJsonValue,
      },
    });
    return { processed: true, paid: false, paymentReview: true, orderStatus: order.status };
  }

  if (order.expiresAt <= new Date()) {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'PAID',
          paidAt: event.paidAt ?? new Date(),
          rawPayload: event.raw as Prisma.InputJsonValue,
        },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: { status: 'PAYMENT_REVIEW' },
      }),
    ]);
    return {
      processed: true,
      paid: false,
      paymentReview: true,
      orderStatus: 'PAYMENT_REVIEW',
    };
  }

  const result = await fulfillOrder(order.id, {
    provider: providerName,
    providerReference: event.providerReference,
    amount: event.amount,
    currency: event.currency,
    paidAt: event.paidAt ?? new Date(),
    raw: event.raw,
    allowUnreserved: false,
  });

  return {
    processed: true,
    paid: true,
    orderStatus: 'PAID',
    ticketCount: result.ticketCount,
  };
}

export async function handlePaymentWebhook(
  providerName: string,
  headers: Record<string, string | string[] | undefined>,
  rawBody: Buffer,
) {
  const provider = getPaymentProvider();
  if (providerName !== provider.name) {
    throw new NotFoundError('Payment provider tidak dikenal', 'PROVIDER_NOT_FOUND');
  }
  const event = await provider.verifyWebhook({ headers, rawBody });

  const existing = await prisma.webhookEvent.findUnique({
    where: {
      provider_providerEventId: {
        provider: provider.name,
        providerEventId: event.providerEventId,
      },
    },
  });
  if (existing) {
    return {
      duplicate: true,
      status: existing.status,
      result: existing.status === 'PROCESSED' ? { processed: true, duplicate: true } : null,
    };
  }

  let webhookId: string;
  try {
    const webhook = await prisma.webhookEvent.create({
      data: {
        provider: provider.name,
        providerEventId: event.providerEventId,
        payloadHash: sha256(rawBody.toString('utf8')),
        status: 'RECEIVED',
      },
    });
    webhookId = webhook.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { duplicate: true, status: 'RECEIVED', result: null };
    }
    throw error;
  }

  try {
    const result = await processVerifiedPayment(event, provider.name);
    await prisma.webhookEvent.update({
      where: { id: webhookId },
      data: { status: 'PROCESSED', processedAt: new Date(), error: null },
    });
    return { duplicate: false, status: 'PROCESSED', result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook gagal diproses';
    await prisma.webhookEvent.update({
      where: { id: webhookId },
      data: { status: 'FAILED', error: message.slice(0, 1000) },
    });
    throw error;
  }
}

export async function mockPayOrder(orderCode: string, req: Request) {
  if (env.isProduction || env.PAYMENT_PROVIDER !== 'mock') {
    throw new ForbiddenError('Simulasi pembayaran hanya tersedia di development');
  }
  let order = await getOrderForAccess(orderCode, req);
  if (order.status === 'PAID') {
    return { alreadyPaid: true, order: serializeOrder(order) };
  }
  if (order.status !== 'PENDING_PAYMENT') {
    throw new ConflictError('Order ini tidak dapat dibayar', 'ORDER_NOT_PAYABLE');
  }
  if (order.expiresAt <= new Date()) {
    await expireOrder(order.id);
    throw new ConflictError('Batas waktu pembayaran sudah lewat', 'ORDER_EXPIRED');
  }

  const providerReference = `MOCK-${order.orderCode}`;
  const existingPayment = order.payments.find(
    (payment) => payment.providerReference === providerReference,
  );
  if (!existingPayment) {
    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: 'mock',
        providerReference,
        method: 'MOCK',
        amount: order.total,
        currency: order.currency,
        status: 'PENDING',
        expiresAt: order.expiresAt,
      },
    });
  } else if (existingPayment.status === 'PAID') {
    // Payment recorded but order not marked paid; reconcile through the normal path.
    order = await loadOrderByCode(orderCode);
  }

  const result = await fulfillOrder(order.id, {
    provider: 'mock',
    providerReference,
    amount: order.total,
    currency: order.currency,
    paidAt: new Date(),
    raw: { type: 'mock_payment', simulated: true },
    allowUnreserved: false,
  });

  return {
    alreadyPaid: result.alreadyPaid,
    order: serializeOrder(await loadOrderByCode(orderCode)),
  };
}

export async function listAccountOrders(
  userId: string,
  query: { page: number; limit: number },
) {
  const where = { userId };
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: orderInclude,
    }),
  ]);
  return {
    data: orders.map(serializeOrder),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function listEventOrders(
  eventId: string,
  organizerId: string,
  query: { page: number; limit: number; q?: string; status?: string },
) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organizerId: true, title: true },
  });
  if (!event) throw new NotFoundError('Event tidak ditemukan', 'EVENT_NOT_FOUND');
  if (event.organizerId !== organizerId) {
    throw new ForbiddenError('Event ini bukan milik organizer kamu', 'EVENT_NOT_OWNED');
  }
  const where: Prisma.OrderWhereInput = {
    eventId,
    ...(query.status ? { status: query.status as Prisma.OrderWhereInput['status'] } : {}),
    ...(query.q
      ? {
          OR: [
            { orderCode: { contains: query.q, mode: 'insensitive' } },
            { buyerName: { contains: query.q, mode: 'insensitive' } },
            { buyerEmail: { contains: query.q, mode: 'insensitive' } },
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
      include: {
        items: true,
        tickets: { select: { id: true, status: true, checkedInAt: true } },
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    }),
  ]);
  return {
    data: orders,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}
