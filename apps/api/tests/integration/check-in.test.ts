import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import {
  registerAgent,
  setupOrganizer,
  setupPublishedEvent,
  uniqueEmail,
} from '../helpers';

const app = createApp();

interface IssuedTicket {
  eventId: string;
  ticketCode: string;
  ticketId: string;
  orderCode: string;
  organizerId: string;
  organizerAgent: ReturnType<typeof request.agent>;
}

async function issueFreeTicket(
  organizer: Awaited<ReturnType<typeof setupOrganizer>>,
  eventId: string,
  ticketTypeId: string,
): Promise<IssuedTicket> {
  const response = await organizer.agent.post('/api/v1/orders').send({
    eventId,
    buyerName: 'Penonton Uji',
    buyerEmail: uniqueEmail('tiket'),
    buyerPhone: '081234567890',
    items: [{ ticketTypeId, quantity: 1 }],
    acceptTerms: true,
    idempotencyKey: randomUUID(),
  });
  if (response.status !== 201 || response.body.data.order.status !== 'PAID') {
    throw new Error(`Gagal menerbitkan tiket uji: ${response.status} ${JSON.stringify(response.body)}`);
  }
  const order = response.body.data.order;
  return {
    eventId,
    ticketCode: order.tickets[0].ticketCode,
    ticketId: order.tickets[0].id,
    orderCode: order.orderCode,
    organizerId: organizer.organizerId,
    organizerAgent: organizer.agent,
  };
}

async function addCheckInStaff(
  organizer: Awaited<ReturnType<typeof setupOrganizer>>,
  eventId: string,
) {
  const staff = await registerAgent(app);
  const response = await organizer.agent
    .post(`/api/v1/organizer/events/${eventId}/staff`)
    .send({ email: staff.email, role: 'CHECK_IN' });
  if (response.status !== 201) {
    throw new Error(`Gagal menambah staff: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return staff;
}

async function scan(
  agent: ReturnType<typeof request.agent>,
  payload: Record<string, unknown>,
) {
  return agent.post('/api/v1/check-in/scan').send(payload);
}

describe('staff event access', () => {
  it('hanya menampilkan event yang ditugaskan atau dimiliki', async () => {
    const { organizer, event, ticketType } = await setupPublishedEvent(app, { price: 0 });
    void ticketType;
    const staff = await addCheckInStaff(organizer, event.id);
    const outsider = await registerAgent(app);

    const staffEvents = await staff.agent.get('/api/v1/staff/events');
    expect(staffEvents.status).toBe(200);
    expect(staffEvents.body.data.events).toHaveLength(1);
    expect(staffEvents.body.data.events[0].id).toBe(event.id);
    expect(staffEvents.body.data.events[0].accessRole).toBe('CHECK_IN');

    const ownerEvents = await organizer.agent.get('/api/v1/staff/events');
    expect(ownerEvents.body.data.events[0].accessRole).toBe('OWNER');

    const outsiderEvents = await outsider.agent.get('/api/v1/staff/events');
    expect(outsiderEvents.status).toBe(200);
    expect(outsiderEvents.body.data.events).toHaveLength(0);
  });

  it('menolak staff yang tidak ditugaskan pada event', async () => {
    const first = await setupPublishedEvent(app, { price: 0 });
    const second = await setupPublishedEvent(app, { price: 0 });
    const ticket = await issueFreeTicket(first.organizer, first.event.id, first.ticketType.id);
    const outsider = await registerAgent(app);

    const unassigned = await scan(outsider.agent, {
      eventId: first.event.id,
      ticketCode: ticket.ticketCode,
    });
    expect(unassigned.status).toBe(403);
    expect(unassigned.body.error.code).toBe('CHECK_IN_NOT_ASSIGNED');

    const otherOrganizer = await scan(second.organizer.agent, {
      eventId: first.event.id,
      ticketCode: ticket.ticketCode,
    });
    expect(otherOrganizer.status).toBe(403);
    expect(otherOrganizer.body.error.code).toBe('CHECK_IN_NOT_ASSIGNED');
  });
});

describe('ticket scan', () => {
  it('menerima check-in pertama dan menolak pemakaian kedua', async () => {
    const { organizer, event, ticketType } = await setupPublishedEvent(app, { price: 0 });
    const ticket = await issueFreeTicket(organizer, event.id, ticketType.id);
    const staff = await addCheckInStaff(organizer, event.id);

    const first = await scan(staff.agent, {
      eventId: event.id,
      ticketCode: ticket.ticketCode.toLowerCase(),
      gate: 'Pintu A',
    });
    expect(first.status).toBe(200);
    expect(first.body.data.result).toBe('VALID');
    expect(first.body.data.accepted).toBe(true);
    expect(first.body.data.ticket.ticketCode).toBe(ticket.ticketCode);

    const second = await scan(staff.agent, {
      eventId: event.id,
      ticketCode: ticket.ticketCode,
      gate: 'Pintu B',
    });
    expect(second.status).toBe(200);
    expect(second.body.data.result).toBe('ALREADY_USED');
    expect(second.body.data.accepted).toBe(false);
    expect(second.body.data.ticket.status).toBe('CHECKED_IN');

    const stored = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.ticketId } });
    expect(stored.status).toBe('CHECKED_IN');
    expect(stored.checkedInAt).not.toBeNull();
    expect(stored.checkedInByUserId).toBe(staff.userId);

    const logs = await prisma.checkInLog.count({ where: { eventId: event.id } });
    expect(logs).toBe(2);

    const summary = await staff.agent.get(`/api/v1/check-in/events/${event.id}/summary`);
    expect(summary.status).toBe(200);
    expect(summary.body.data.counts.checkedIn).toBe(1);
    expect(summary.body.data.issued).toBe(1);
    expect(summary.body.data.attendanceRate).toBe(100);
    expect(summary.body.data.lastScanAt).not.toBeNull();
    expect(summary.body.data.recentScans[0].result).toBe('ALREADY_USED');
  });

  it('menolak tiket untuk event lain', async () => {
    const first = await setupPublishedEvent(app, { price: 0 });
    const second = await setupPublishedEvent(app, { price: 0 });
    const ticket = await issueFreeTicket(first.organizer, first.event.id, first.ticketType.id);

    const response = await scan(second.organizer.agent, {
      eventId: second.event.id,
      ticketCode: ticket.ticketCode,
    });
    expect(response.status).toBe(200);
    expect(response.body.data.result).toBe('WRONG_EVENT');
    expect(response.body.data.accepted).toBe(false);

    const stored = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.ticketId } });
    expect(stored.status).toBe('VALID');
  });

  it('menolak tiket cancelled dan mencatat scan tidak sah', async () => {
    const { organizer, event, ticketType } = await setupPublishedEvent(app, { price: 0 });
    const ticket = await issueFreeTicket(organizer, event.id, ticketType.id);
    await prisma.ticket.update({
      where: { id: ticket.ticketId },
      data: { status: 'CANCELLED' },
    });

    const cancelled = await scan(organizer.agent, {
      eventId: event.id,
      ticketCode: ticket.ticketCode,
    });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.result).toBe('CANCELLED');

    const invalid = await scan(organizer.agent, {
      eventId: event.id,
      token: 'token-palsu-yang-cukup-panjang-untuk-lolos-validasi',
    });
    expect(invalid.status).toBe(200);
    expect(invalid.body.data.result).toBe('INVALID');
    expect(invalid.body.data.ticket).toBeNull();

    expect(await prisma.checkInLog.count({ where: { eventId: event.id } })).toBe(2);
    const stored = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.ticketId } });
    expect(stored.status).toBe('CANCELLED');
  });

  it('mengembalikan hasil yang sama untuk idempotency key yang sama', async () => {
    const { organizer, event, ticketType } = await setupPublishedEvent(app, { price: 0 });
    const ticket = await issueFreeTicket(organizer, event.id, ticketType.id);
    const staff = await addCheckInStaff(organizer, event.id);
    const idempotencyKey = randomUUID();

    const first = await scan(staff.agent, {
      eventId: event.id,
      ticketCode: ticket.ticketCode,
      idempotencyKey,
    });
    const second = await scan(staff.agent, {
      eventId: event.id,
      ticketCode: ticket.ticketCode,
      idempotencyKey,
    });

    expect(first.body.data.result).toBe('VALID');
    expect(second.body.data.result).toBe('VALID');
    expect(second.body.data.replayed).toBe(true);
    expect(await prisma.checkInLog.count({ where: { eventId: event.id } })).toBe(1);
    const stored = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.ticketId } });
    expect(stored.status).toBe('CHECKED_IN');
  });

  it('menyediakan daftar tiket dan ringkasan untuk organizer pemilik', async () => {
    const { organizer, event, ticketType } = await setupPublishedEvent(app, { price: 0 });
    const ticket = await issueFreeTicket(organizer, event.id, ticketType.id);
    await scan(organizer.agent, { eventId: event.id, ticketCode: ticket.ticketCode });

    const tickets = await organizer.agent.get(
      `/api/v1/organizer/events/${event.id}/tickets?status=CHECKED_IN`,
    );
    expect(tickets.status).toBe(200);
    expect(tickets.body.data).toHaveLength(1);
    expect(tickets.body.data[0].holderName).toBe('Penonton Uji');

    const summary = await organizer.agent.get(
      `/api/v1/organizer/events/${event.id}/check-in/summary`,
    );
    expect(summary.status).toBe(200);
    expect(summary.body.data.counts.checkedIn).toBe(1);

    const other = await setupOrganizer(app, 'Organizer Ketiga');
    const forbidden = await other.agent.get(
      `/api/v1/organizer/events/${event.id}/check-in/summary`,
    );
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('EVENT_NOT_OWNED');
  });

  it('memperbarui QR tiket dan menolak QR untuk tiket yang sudah dipakai', async () => {
    const { organizer, event, ticketType } = await setupPublishedEvent(app, { price: 0 });
    const checkout = await organizer.agent.post('/api/v1/orders').send({
      eventId: event.id,
      buyerName: 'Penonton QR',
      buyerEmail: uniqueEmail('qr'),
      buyerPhone: '081234567890',
      items: [{ ticketTypeId: ticketType.id, quantity: 1 }],
      acceptTerms: true,
      idempotencyKey: randomUUID(),
    });
    expect(checkout.status).toBe(201);
    const order = checkout.body.data.order;
    const token = checkout.body.data.accessToken as string;
    const ticketId = order.tickets[0].id as string;

    const regenerated = await request(app)
      .post(`/api/v1/orders/${order.orderCode}/tickets/${ticketId}/qr/regenerate`)
      .set('x-order-token', token)
      .send();
    expect(regenerated.status).toBe(200);
    expect(regenerated.body.data.qrUrl).toContain('/qr');
    expect(regenerated.body.data.qrUrl).toContain('token=');

    const qr = await request(app)
      .get(regenerated.body.data.qrUrl as string);
    expect(qr.status).toBe(200);
    expect(qr.headers['content-type']).toContain('image/png');

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'CHECKED_IN', checkedInAt: new Date() },
    });
    const again = await request(app)
      .post(`/api/v1/orders/${order.orderCode}/tickets/${ticketId}/qr/regenerate`)
      .set('x-order-token', token)
      .send();
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('TICKET_NOT_REGENERATABLE');
  });
});
