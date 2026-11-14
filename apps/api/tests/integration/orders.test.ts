import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { env } from '../../src/config/env';
import { hmacSha256 } from '../../src/lib/crypto';
import { prisma } from '../../src/lib/prisma';
import { releaseExpiredOrders } from '../../src/modules/orders/order.service';
import {
  setupOrganizer,
  setupPublishedEvent,
  uniqueEmail,
} from '../helpers';

const app = createApp();

function checkoutPayload(
  eventId: string,
  ticketTypeId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    eventId,
    buyerName: 'Budi Santoso',
    buyerEmail: uniqueEmail('buyer'),
    buyerPhone: '081234567890',
    items: [{ ticketTypeId, quantity: 1 }],
    acceptTerms: true,
    idempotencyKey: randomUUID(),
    ...overrides,
  };
}

function signedWebhook(payload: Record<string, unknown>, secret = env.PAYMENT_WEBHOOK_SECRET) {
  const raw = JSON.stringify(payload);
  return { raw, signature: hmacSha256(secret, raw) };
}

async function postWebhook(
  payload: Record<string, unknown>,
  signature: string,
) {
  return request(app)
    .post('/api/v1/webhooks/payments/mock')
    .set('Content-Type', 'application/json')
    .set('x-mock-signature', signature)
    .send(JSON.stringify(payload));
}

describe('order checkout', () => {
  it('hitung harga di server dan abaikan harga dari client', async () => {
    const { organizer, event, ticketType } = await setupPublishedEvent(app, {
      price: 175_000,
      quotaTotal: 20,
    });

    const payload = checkoutPayload(event.id, ticketType.id, {
      items: [{ ticketTypeId: ticketType.id, quantity: 2, unitPrice: 1, lineTotal: 2 }],
      subtotal: 2,
      total: 2,
    });
    const response = await organizer.agent.post('/api/v1/orders').send(payload);

    expect(response.status).toBe(201);
    const order = response.body.data.order;
    expect(order.subtotal).toBe(350_000);
    expect(order.total).toBe(350_000);
    expect(order.items[0].unitPrice).toBe(175_000);
    expect(order.items[0].lineTotal).toBe(350_000);
    expect(order.status).toBe('PENDING_PAYMENT');
    expect(response.body.data.accessToken).toHaveLength(64);

    const stored = await prisma.ticketType.findUniqueOrThrow({ where: { id: ticketType.id } });
    expect(stored.quantityReserved).toBe(2);
    expect(stored.quantitySold).toBe(0);
  });

  it('mengembalikan order yang sama untuk idempotency key yang sama', async () => {
    const { organizer, event, ticketType } = await setupPublishedEvent(app);
    const payload = checkoutPayload(event.id, ticketType.id);

    const first = await organizer.agent.post('/api/v1/orders').send(payload);
    const second = await organizer.agent.post('/api/v1/orders').send(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.reused).toBe(true);
    expect(second.body.data.order.id).toBe(first.body.data.order.id);
    expect(second.body.data.accessToken).toBe(first.body.data.accessToken);
  });

  it('menolak checkout saat kuota terakhir diperebutkan bersamaan', async () => {
    const { organizer, event, ticketType } = await setupPublishedEvent(app, {
      quotaTotal: 1,
    });

    const [first, second] = await Promise.all([
      organizer.agent
        .post('/api/v1/orders')
        .send(checkoutPayload(event.id, ticketType.id)),
      organizer.agent
        .post('/api/v1/orders')
        .send(checkoutPayload(event.id, ticketType.id)),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);
    const rejected = first.status === 409 ? first : second;
    expect(rejected.body.error.code).toBe('TICKET_SOLD_OUT');

    const stored = await prisma.ticketType.findUniqueOrThrow({ where: { id: ticketType.id } });
    expect(stored.quantityReserved).toBe(1);
    const orders = await prisma.order.count({ where: { eventId: event.id } });
    expect(orders).toBe(1);
  });

  it('menerapkan kupon dan menegakkan batas pemakaian per pembeli', async () => {
    const { organizer, event, ticketType } = await setupPublishedEvent(app, {
      price: 200_000,
    });

    const couponResponse = await organizer.agent
      .post(`/api/v1/organizer/events/${event.id}/coupons`)
      .send({
        code: 'MALAM10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minimumPurchase: 0,
        maxPerUser: 1,
        isActive: true,
      });
    expect(couponResponse.status).toBe(201);

    const email = uniqueEmail('kupon');
    const first = await organizer.agent
      .post('/api/v1/orders')
      .send(checkoutPayload(event.id, ticketType.id, { buyerEmail: email, couponCode: 'MALAM10' }));

    expect(first.status).toBe(201);
    expect(first.body.data.order.discount).toBe(20_000);
    expect(first.body.data.order.total).toBe(180_000);

    const second = await organizer.agent
      .post('/api/v1/orders')
      .send(checkoutPayload(event.id, ticketType.id, { buyerEmail: email, couponCode: 'MALAM10' }));

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('COUPON_USER_LIMIT');

    const coupon = await prisma.coupon.findUniqueOrThrow({
      where: { eventId_code: { eventId: event.id, code: 'MALAM10' } },
    });
    expect(coupon.redeemedCount).toBe(1);
  });
});

describe('order expiry', () => {
  it('melepas reservasi dan kupon tepat satu kali saat order kedaluwarsa', async () => {
    const { organizer, event, ticketType } = await setupPublishedEvent(app, {
      price: 100_000,
      quotaTotal: 5,
    });

    const coupon = await prisma.coupon.create({
      data: {
        eventId: event.id,
        code: 'LEPAS',
        discountType: 'FIXED_AMOUNT',
        discountValue: 10_000,
        minimumPurchase: 0,
        maxPerUser: null,
        isActive: true,
      },
    });

    const created = await organizer.agent
      .post('/api/v1/orders')
      .send(checkoutPayload(event.id, ticketType.id, { couponCode: 'LEPAS' }));
    expect(created.status).toBe(201);

    const orderId = created.body.data.order.id as string;
    await prisma.order.update({
      where: { id: orderId },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    expect(await releaseExpiredOrders()).toBe(1);
    expect(await releaseExpiredOrders()).toBe(0);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe('EXPIRED');
    const ticket = await prisma.ticketType.findUniqueOrThrow({ where: { id: ticketType.id } });
    expect(ticket.quantityReserved).toBe(0);
    expect(ticket.quantitySold).toBe(0);
    const refreshedCoupon = await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } });
    expect(refreshedCoupon.redeemedCount).toBe(0);
    const redemption = await prisma.couponRedemption.findUniqueOrThrow({
      where: { orderId },
    });
    expect(redemption.releasedAt).not.toBeNull();
  });
});

describe('payment webhook', () => {
  it('menolak signature palsu dan nominal yang tidak sesuai', async () => {
    const { organizer, event, ticketType } = await setupPublishedEvent(app);
    const created = await organizer.agent
      .post('/api/v1/orders')
      .send(checkoutPayload(event.id, ticketType.id));
    expect(created.status).toBe(201);
    const order = created.body.data.order;
    const token = created.body.data.accessToken as string;

    const session = await request(app)
      .post(`/api/v1/orders/${order.orderCode}/payment`)
      .set('x-order-token', token)
      .send();
    expect(session.status).toBe(200);
    expect(session.body.data.payment.providerReference).toBe(`MOCK-${order.orderCode}`);

    const basePayload = {
      eventId: `evt-${randomUUID()}`,
      reference: `MOCK-${order.orderCode}`,
      orderCode: order.orderCode,
      amount: order.total,
      currency: 'IDR',
      status: 'PAID',
      paidAt: new Date().toISOString(),
    };

    const forged = signedWebhook(basePayload, 'secret-yang-salah-sekali');
    const rejected = await postWebhook(basePayload, forged.signature);
    expect(rejected.status).toBe(400);
    expect(rejected.body.error.code).toBe('BAD_REQUEST');

    const wrongAmount = signedWebhook({ ...basePayload, amount: order.total - 1 });
    const mismatch = await postWebhook(
      { ...basePayload, amount: order.total - 1 },
      wrongAmount.signature,
    );
    expect(mismatch.status).toBe(422);
    expect(mismatch.body.error.code).toBe('UNPROCESSABLE_ENTITY');

    const stillPending = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(stillPending.status).toBe('PENDING_PAYMENT');
    expect(await prisma.ticket.count({ where: { orderId: order.id } })).toBe(0);
  });

  it('memproses webhook valid secara idempoten dan menerbitkan tiket sekali', async () => {
    const { organizer, event, ticketType } = await setupPublishedEvent(app);
    const created = await organizer.agent
      .post('/api/v1/orders')
      .send(checkoutPayload(event.id, ticketType.id));
    expect(created.status).toBe(201);
    const order = created.body.data.order;
    const token = created.body.data.accessToken as string;

    await request(app)
      .post(`/api/v1/orders/${order.orderCode}/payment`)
      .set('x-order-token', token)
      .send();

    const payload = {
      eventId: `evt-${randomUUID()}`,
      reference: `MOCK-${order.orderCode}`,
      orderCode: order.orderCode,
      amount: order.total,
      currency: 'IDR',
      status: 'PAID',
      paidAt: new Date().toISOString(),
    };
    const signed = signedWebhook(payload);

    const first = await postWebhook(payload, signed.signature);
    expect(first.status).toBe(200);
    expect(first.body.data.result.ticketCount).toBe(1);

    const second = await postWebhook(payload, signed.signature);
    expect(second.status).toBe(200);
    expect(second.body.data.duplicate).toBe(true);

    const stored = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { tickets: true },
    });
    expect(stored.status).toBe('PAID');
    expect(stored.tickets).toHaveLength(1);
    expect(stored.tickets[0]!.status).toBe('VALID');
    expect(await prisma.webhookEvent.count()).toBe(1);

    const sold = await prisma.ticketType.findUniqueOrThrow({ where: { id: ticketType.id } });
    expect(sold.quantityReserved).toBe(0);
    expect(sold.quantitySold).toBe(1);

    const statusResponse = await request(app)
      .get(`/api/v1/orders/${order.orderCode}/status`)
      .query({ token });
    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body.data.order.tickets).toHaveLength(1);
    expect(statusResponse.body.data.order.tickets[0].qrImageKey).toBeUndefined();

    const ticketsResponse = await request(app)
      .get(`/api/v1/orders/${order.orderCode}/tickets`)
      .query({ token });
    expect(ticketsResponse.status).toBe(200);
    const ticketId = ticketsResponse.body.data.tickets[0].id as string;
    expect(ticketsResponse.body.data.tickets[0].qrUrl).toContain('token=');

    const qr = await request(app)
      .get(`/api/v1/orders/${order.orderCode}/tickets/${ticketId}/qr`)
      .query({ token });
    expect(qr.status).toBe(200);
    expect(qr.headers['content-type']).toContain('image/png');
    expect(qr.body.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');

    const withoutToken = await request(app).get(
      `/api/v1/orders/${order.orderCode}/tickets`,
    );
    expect(withoutToken.status).toBe(401);
    expect(withoutToken.body.error.code).toBe('ORDER_ACCESS_DENIED');
  });

  it('memasukkan pembayaran terlambat ke review admin, bukan menerbitkan tiket', async () => {
    const { organizer, event, ticketType } = await setupPublishedEvent(app);
    const created = await organizer.agent
      .post('/api/v1/orders')
      .send(checkoutPayload(event.id, ticketType.id));
    const order = created.body.data.order;
    const token = created.body.data.accessToken as string;

    await request(app)
      .post(`/api/v1/orders/${order.orderCode}/payment`)
      .set('x-order-token', token)
      .send();
    await prisma.order.update({
      where: { id: order.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });
    expect(await releaseExpiredOrders()).toBe(1);

    const payload = {
      eventId: `evt-${randomUUID()}`,
      reference: `MOCK-${order.orderCode}`,
      orderCode: order.orderCode,
      amount: order.total,
      currency: 'IDR',
      status: 'PAID',
      paidAt: new Date().toISOString(),
    };
    const signed = signedWebhook(payload);
    const response = await postWebhook(payload, signed.signature);

    expect(response.status).toBe(200);
    expect(response.body.data.result.paymentReview).toBe(true);
    const stored = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(stored.status).toBe('PAYMENT_REVIEW');
    expect(await prisma.ticket.count({ where: { orderId: order.id } })).toBe(0);
    const payment = await prisma.payment.findFirstOrThrow({
      where: { orderId: order.id, provider: 'mock' },
    });
    expect(payment.status).toBe('PAID');
  });
});

describe('order isolation', () => {
  it('mencegah organizer lain melihat order dan peserta event', async () => {
    const { organizer, event, ticketType } = await setupPublishedEvent(app);
    const created = await organizer.agent
      .post('/api/v1/orders')
      .send(checkoutPayload(event.id, ticketType.id));
    expect(created.status).toBe(201);

    const other = await setupOrganizer(app, 'Organizer Lain');
    const orders = await other.agent.get(`/api/v1/organizer/events/${event.id}/orders`);
    expect(orders.status).toBe(403);
    expect(orders.body.error.code).toBe('EVENT_NOT_OWNED');

    const exportResponse = await other.agent.get(
      `/api/v1/organizer/events/${event.id}/attendees/export`,
    );
    expect(exportResponse.status).toBe(403);
    expect(exportResponse.body.error.code).toBe('EVENT_NOT_OWNED');

    const ownOrders = await organizer.agent.get(`/api/v1/organizer/events/${event.id}/orders`);
    expect(ownOrders.status).toBe(200);
    expect(ownOrders.body.data).toHaveLength(1);
  });
});

describe('ticket page access', () => {
  it('membuka tiket dengan token order dan menolak tanpa token', async () => {
    const { organizer, event, ticketType } = await setupPublishedEvent(app, { price: 0 });
    const created = await organizer.agent
      .post('/api/v1/orders')
      .send(checkoutPayload(event.id, ticketType.id));
    expect(created.status).toBe(201);
    const token = created.body.data.accessToken as string;
    const ticket = created.body.data.order.tickets[0];

    const withoutToken = await request(app).get(`/api/v1/tickets/${ticket.ticketCode}`);
    expect(withoutToken.status).toBe(401);
    expect(withoutToken.body.error.code).toBe('ORDER_ACCESS_DENIED');

    const wrongToken = await request(app)
      .get(`/api/v1/tickets/${ticket.ticketCode}`)
      .query({ token: 'token-yang-salah' });
    expect(wrongToken.status).toBe(401);

    const detail = await request(app)
      .get(`/api/v1/tickets/${ticket.ticketCode}`)
      .query({ token });
    expect(detail.status).toBe(200);
    expect(detail.body.data.ticket.holderName).toBe('Budi Santoso');
    expect(detail.body.data.ticket.qrUrl).toContain('token=');
    expect(detail.body.data.ticket.orderCode).toBe(created.body.data.order.orderCode);

    const qr = await request(app).get(detail.body.data.ticket.qrUrl as string);
    expect(qr.status).toBe(200);
    expect(qr.headers['content-type']).toContain('image/png');

    const accountOrder = await organizer.agent.get(
      `/api/v1/account/orders/${created.body.data.order.id}`,
    );
    expect(accountOrder.status).toBe(200);
    expect(accountOrder.body.data.order.orderCode).toBe(created.body.data.order.orderCode);

    const other = await setupOrganizer(app, 'Organizer Tiket Lain');
    const hidden = await other.agent.get(`/api/v1/account/orders/${created.body.data.order.id}`);
    expect(hidden.status).toBe(404);
  });
});
