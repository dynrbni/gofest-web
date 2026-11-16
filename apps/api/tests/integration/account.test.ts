import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { checkoutCustomerDetails, registerAgent, setupPublishedEvent } from '../helpers';

const app = createApp();

async function purchase(quantity = 2) {
  const fixture = await setupPublishedEvent(app);
  const buyer = await registerAgent(app);
  const items = [{ ticketTypeId: fixture.ticketType.id, quantity }];
  const response = await buyer.agent.post('/api/v1/orders').send({
    eventId: fixture.event.id,
    buyerName: 'Pemilik Tiket',
    buyerEmail: buyer.email,
    buyerPhone: '081234567890',
    items,
    ...checkoutCustomerDetails(items, 'Pemilik Tiket', buyer.email),
    acceptTerms: true,
    idempotencyKey: randomUUID(),
  });
  expect(response.status).toBe(201);
  const order = response.body.data.order;
  expect((await buyer.agent.post(`/api/v1/orders/${order.orderCode}/mock-pay`)).status).toBe(200);
  return { ...fixture, buyer, order };
}

describe('customer account reads', () => {
  it('requires authentication for every account read', async () => {
    for (const path of ['dashboard', 'tickets', 'history', 'recommendations']) {
      expect((await request(app).get(`/api/v1/account/${path}`)).status).toBe(401);
    }
  });

  it('counts real issued tickets and distinct events without exposing another user', async () => {
    const { buyer, order } = await purchase();
    const other = await registerAgent(app);
    const dashboard = await buyer.agent.get('/api/v1/account/dashboard');
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.summary).toEqual({
      totalTickets: 2,
      upcomingEvents: 1,
      totalOrders: 1,
    });
    expect(dashboard.body.data.upcoming[0].tickets).toHaveLength(2);
    const empty = await other.agent.get('/api/v1/account/dashboard');
    expect(empty.body.data.summary).toEqual({ totalTickets: 0, upcomingEvents: 0, totalOrders: 0 });
    expect((await other.agent.get('/api/v1/account/history')).body.data).toEqual([]);
    expect((await other.agent.get('/api/v1/account/tickets')).body.data).toEqual([]);
    expect((await other.agent.get(`/api/v1/account/orders/${order.id}`)).status).toBe(404);
    expect(JSON.stringify(dashboard.body)).not.toMatch(
      /qrImageKey|qrTokenHash|accessTokenHash|checkoutDetails/,
    );
  });

  it('filters individual tickets before pagination and separates used and invalid tickets', async () => {
    const { buyer, event } = await purchase();
    const all = await buyer.agent.get('/api/v1/account/tickets?limit=1');
    expect(all.body.data).toHaveLength(1);
    expect(all.body.meta.total).toBe(2);
    expect(all.body.data[0].ticketType.name).toBe('Tiket Reguler');
    const tickets = await prisma.ticket.findMany({ where: { eventId: event.id } });
    await prisma.ticket.update({
      where: { id: tickets[0]!.id },
      data: { status: 'CHECKED_IN', checkedInAt: new Date() },
    });
    await prisma.ticket.update({ where: { id: tickets[1]!.id }, data: { status: 'REFUNDED' } });
    expect((await buyer.agent.get('/api/v1/account/tickets?period=past')).body.meta.total).toBe(1);
    expect((await buyer.agent.get('/api/v1/account/tickets?period=invalid')).body.meta.total).toBe(
      1,
    );
    expect((await buyer.agent.get('/api/v1/account/tickets?period=upcoming')).body.meta.total).toBe(
      0,
    );
    expect((await buyer.agent.get('/api/v1/account/tickets?q=nonexistent')).body.meta.total).toBe(
      0,
    );
    expect(
      (await buyer.agent.get('/api/v1/account/tickets?dateFrom=2099-01-01')).body.meta.total,
    ).toBe(0);
    expect(
      (await buyer.agent.get('/api/v1/account/tickets?dateFrom=2027-02-01&dateTo=2027-01-01'))
        .status,
    ).toBe(422);
  });

  it('filters the latest payment independently from order status and transaction date', async () => {
    const { buyer, order } = await purchase(1);
    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: 'mock',
        providerReference: randomUUID(),
        amount: order.total,
        status: 'FAILED',
        createdAt: new Date(Date.now() + 1000),
      },
    });
    const history = await buyer.agent.get(
      '/api/v1/account/history?paymentStatus=FAILED&status=PAID',
    );
    expect(history.body.meta.total).toBe(1);
    expect(history.body.data[0].payment.status).toBe('FAILED');
    expect(
      (await buyer.agent.get('/api/v1/account/history?paymentStatus=PAID')).body.meta.total,
    ).toBe(0);
    expect(
      (await buyer.agent.get('/api/v1/account/history?dateFrom=2099-01-01')).body.meta.total,
    ).toBe(0);
    expect(
      (await buyer.agent.get(`/api/v1/account/history?q=${order.orderCode}`)).body.meta.total,
    ).toBe(1);
    expect((await buyer.agent.get('/api/v1/account/history?status=FAILED')).status).toBe(422);
  });

  it('only recommends events that can be purchased now', async () => {
    const { buyer, event, ticketType } = await purchase(1);
    expect(
      (await buyer.agent.get('/api/v1/account/recommendations')).body.data.events.map(
        (e: { id: string }) => e.id,
      ),
    ).toContain(event.id);
    await prisma.ticketType.update({
      where: { id: ticketType.id },
      data: { salesStartAt: new Date(Date.now() + 86_400_000) },
    });
    expect((await buyer.agent.get('/api/v1/account/recommendations')).body.data.events).toEqual([]);
    await prisma.ticketType.update({ where: { id: ticketType.id }, data: { salesStartAt: null } });
    await prisma.event.update({
      where: { id: event.id },
      data: { salesEndAt: new Date(Date.now() - 1000) },
    });
    expect((await buyer.agent.get('/api/v1/account/recommendations')).body.data.events).toEqual([]);
  });

  it('does not serve QR for unpaid orders or cancelled events and keeps guest ownership separate', async () => {
    const { buyer, order, event } = await purchase(1);
    const ticket = await prisma.ticket.findFirstOrThrow({ where: { orderId: order.id } });
    const other = await registerAgent(app);
    expect((await other.agent.get(`/api/v1/tickets/${ticket.ticketCode}/qr`)).status).toBe(401);
    expect((await buyer.agent.get(`/api/v1/tickets/${ticket.ticketCode}/qr`)).status).toBe(200);
    await prisma.order.update({ where: { id: order.id }, data: { status: 'EXPIRED' } });
    expect((await buyer.agent.get(`/api/v1/tickets/${ticket.ticketCode}/qr`)).status).toBe(409);
    await prisma.order.update({ where: { id: order.id }, data: { status: 'PAID' } });
    await prisma.event.update({ where: { id: event.id }, data: { status: 'CANCELLED' } });
    expect((await buyer.agent.get('/api/v1/account/tickets?period=invalid')).body.meta.total).toBe(
      1,
    );
    expect((await buyer.agent.get(`/api/v1/tickets/${ticket.ticketCode}/qr`)).status).toBe(409);
    await prisma.order.update({ where: { id: order.id }, data: { userId: null } });
    expect((await buyer.agent.get('/api/v1/account/history')).body.meta.total).toBe(0);
  });
});
