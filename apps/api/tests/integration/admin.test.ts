import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { env } from '../../src/config/env';
import { hmacSha256 } from '../../src/lib/crypto';
import { prisma } from '../../src/lib/prisma';
import { releaseExpiredOrders } from '../../src/modules/orders/order.service';
import {
  checkoutCustomerDetails,
  addTicketType,
  createEvent,
  registerAgent,
  seedCategory,
  setupOrganizer,
  setupPublishedEvent,
  uniqueEmail,
} from '../helpers';

const app = createApp();

async function setupAdmin() {
  const admin = await registerAgent(app, uniqueEmail('admin'));
  await prisma.user.update({
    where: { id: admin.userId },
    data: { role: 'ADMIN' },
  });
  return admin;
}

function checkoutPayload(
  eventId: string,
  ticketTypeId: string,
  overrides: Record<string, unknown> = {},
) {
  const payload = {
    eventId,
    buyerName: 'Pembeli Review',
    buyerEmail: uniqueEmail('review'),
    buyerPhone: '081234567890',
    items: [{ ticketTypeId, quantity: 1 }],
    acceptTerms: true,
    idempotencyKey: randomUUID(),
    ...overrides,
  };
  return {
    ...checkoutCustomerDetails(payload.items, payload.buyerName, payload.buyerEmail),
    ...payload,
  };
}

async function createLatePaymentOrder(
  organizer: Awaited<ReturnType<typeof setupOrganizer>>,
  eventId: string,
  ticketTypeId: string,
) {
  const created = await organizer.agent
    .post('/api/v1/orders')
    .send(checkoutPayload(eventId, ticketTypeId));
  expect(created.status).toBe(201);
  const order = created.body.data.order;
  const token = created.body.data.accessToken as string;

  const session = await request(app)
    .post(`/api/v1/orders/${order.orderCode}/payment`)
    .set('x-order-token', token)
    .send();
  expect(session.status).toBe(200);

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
  const raw = JSON.stringify(payload);
  const webhook = await request(app)
    .post('/api/v1/webhooks/payments/mock')
    .set('Content-Type', 'application/json')
    .set('x-mock-signature', hmacSha256(env.PAYMENT_WEBHOOK_SECRET, raw))
    .send(raw);
  expect(webhook.status).toBe(200);
  expect(webhook.body.data.result.paymentReview).toBe(true);

  return order;
}

describe('admin access control', () => {
  it('menolak pengguna biasa dari seluruh route admin', async () => {
    const user = await registerAgent(app);
    const response = await user.agent.get('/api/v1/admin/dashboard');
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ADMIN_ONLY');
  });

  it('menampilkan ringkasan platform dari data aktual', async () => {
    const admin = await setupAdmin();
    const { organizer, event, ticketType } = await setupPublishedEvent(app, { price: 0 });
    const checkout = await organizer.agent
      .post('/api/v1/orders')
      .send(checkoutPayload(event.id, ticketType.id));
    expect(checkout.status).toBe(201);

    const dashboard = await admin.agent.get('/api/v1/admin/dashboard');
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.users.total).toBeGreaterThanOrEqual(2);
    expect(dashboard.body.data.events.published).toBe(1);
    expect(dashboard.body.data.orders.paid).toBe(1);
    expect(dashboard.body.data.tickets.issued).toBe(1);
    expect(dashboard.body.data.recentOrders).toHaveLength(1);

    const users = await admin.agent.get('/api/v1/admin/users?q=organizer-');
    expect(users.status).toBe(200);
    expect(users.body.data.length).toBeGreaterThanOrEqual(1);

    const orders = await admin.agent.get('/api/v1/admin/orders?status=PAID');
    expect(orders.status).toBe(200);
    expect(orders.body.data).toHaveLength(1);
    expect(orders.body.data[0].payment.providerReference).toMatch(/^FREE-/);

    const detail = await admin.agent.get(`/api/v1/admin/orders/${orders.body.data[0].id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.order.tickets).toHaveLength(1);
  });
});

describe('organizer moderation', () => {
  it('menyetujui organizer pending dan mencatat audit', async () => {
    const admin = await setupAdmin();
    const candidate = await registerAgent(app, uniqueEmail('calon'));
    const application = await candidate.agent.post('/api/v1/organizer/account/apply').send({
      organizationName: 'Ruang Sunyi',
      slug: `ruang-sunyi-${Date.now()}`,
      description: 'Ruang pertunjukan kecil untuk musik eksperimental.',
    });
    expect(application.status).toBe(201);
    const organizerId = application.body.data.organizer.id as string;

    const pending = await admin.agent.get('/api/v1/admin/organizers?status=PENDING');
    expect(pending.status).toBe(200);
    expect(pending.body.data).toHaveLength(1);

    const beforeApprove = await candidate.agent.get('/api/v1/organizer/dashboard');
    expect(beforeApprove.status).toBe(403);
    expect(beforeApprove.body.error.code).toBe('ORGANIZER_NOT_ACTIVE');

    const approved = await admin.agent
      .patch(`/api/v1/admin/organizers/${organizerId}/status`)
      .send({ status: 'ACTIVE', note: 'Profil dan deskripsi memadai.' });
    expect(approved.status).toBe(200);
    expect(approved.body.data.organizer.status).toBe('ACTIVE');

    const afterApprove = await candidate.agent.get('/api/v1/organizer/dashboard');
    expect(afterApprove.status).toBe(200);

    const rejectedWithoutNote = await admin.agent
      .patch(`/api/v1/admin/organizers/${organizerId}/status`)
      .send({ status: 'REJECTED' });
    expect(rejectedWithoutNote.status).toBe(422);

    const audit = await admin.agent.get('/api/v1/admin/audit-logs?action=ORGANIZER_REVIEWED');
    expect(audit.status).toBe(200);
    expect(audit.body.data).toHaveLength(1);
    expect(audit.body.data[0].actor.id).toBe(admin.userId);
  });
});

describe('event moderation', () => {
  it('mempublikasikan event yang diajukan dan menolak tanpa alasan', async () => {
    const admin = await setupAdmin();
    const organizer = await setupOrganizer(app);
    const category = await seedCategory();
    const { event } = await createEvent(organizer.agent, category.id);
    await addTicketType(organizer.agent, event.id);

    const submitted = await organizer.agent.post(`/api/v1/organizer/events/${event.id}/submit`);
    expect(submitted.status).toBe(200);
    expect(submitted.body.data.event.status).toBe('PENDING_REVIEW');

    const pending = await admin.agent.get('/api/v1/admin/events?status=PENDING_REVIEW');
    expect(pending.body.data).toHaveLength(1);

    const published = await admin.agent
      .patch(`/api/v1/admin/events/${event.id}/review`)
      .send({ status: 'PUBLISHED' });
    expect(published.status).toBe(200);
    expect(published.body.data.event.status).toBe('PUBLISHED');

    const publicDetail = await request(app).get(`/api/v1/events/${event.slug}`);
    expect(publicDetail.status).toBe(200);
    expect(publicDetail.body.data.event.status).toBe('PUBLISHED');

    const draft = await createEvent(organizer.agent, category.id, {
      title: 'Konser Yang Ditahan',
    });
    await addTicketType(organizer.agent, draft.event.id);
    await organizer.agent.post(`/api/v1/organizer/events/${draft.event.id}/submit`);

    const missingNote = await admin.agent
      .patch(`/api/v1/admin/events/${draft.event.id}/review`)
      .send({ status: 'REJECTED' });
    expect(missingNote.status).toBe(422);

    const rejected = await admin.agent
      .patch(`/api/v1/admin/events/${draft.event.id}/review`)
      .send({ status: 'REJECTED', note: 'Jadwal bertabrakan dengan venue.' });
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.event.status).toBe('REJECTED');
    expect(rejected.body.data.event.reviewNote).toBe('Jadwal bertabrakan dengan venue.');
  });

  it('membatalkan event published dan menandai order untuk refund', async () => {
    const admin = await setupAdmin();
    const { organizer, event, ticketType } = await setupPublishedEvent(app, { price: 0 });
    const checkout = await organizer.agent
      .post('/api/v1/orders')
      .send(checkoutPayload(event.id, ticketType.id));
    expect(checkout.status).toBe(201);
    const orderId = checkout.body.data.order.id as string;

    const cancelled = await admin.agent
      .patch(`/api/v1/admin/events/${event.id}/review`)
      .send({ status: 'CANCELLED', note: 'Venue tidak dapat digunakan.' });
    expect(cancelled.status).toBe(200);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe('REFUND_PENDING');
    expect(await prisma.ticket.count({ where: { orderId, status: 'CANCELLED' } })).toBe(1);
  });
});

describe('payment review resolution', () => {
  it('menerbitkan tiket dari pembayaran telat dan mencatat audit', async () => {
    const admin = await setupAdmin();
    const { organizer, event, ticketType } = await setupPublishedEvent(app, {
      price: 90_000,
      quotaTotal: 3,
    });
    const order = await createLatePaymentOrder(organizer, event.id, ticketType.id);

    expect(
      await prisma.organizerWallet.findUnique({ where: { organizerId: organizer.organizerId } }),
    ).toMatchObject({ available: 0n, pending: 90_000n });

    const review = await admin.agent.get('/api/v1/admin/orders?status=PAYMENT_REVIEW');
    expect(review.body.data).toHaveLength(1);

    const resolved = await admin.agent
      .post(`/api/v1/admin/orders/${order.id}/payment-review/resolve`)
      .send({ action: 'ISSUE_TICKETS', note: 'Pembayaran terverifikasi di dashboard provider.' });
    expect(resolved.status).toBe(200);
    expect(resolved.body.data.resolved).toBe(true);
    expect(resolved.body.data.action).toBe('ISSUE_TICKETS');

    const stored = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { tickets: true },
    });
    expect(stored.status).toBe('PAID');
    expect(stored.tickets).toHaveLength(1);
    expect(
      await prisma.organizerWallet.findUnique({ where: { organizerId: organizer.organizerId } }),
    ).toMatchObject({ available: 90_000n, pending: 0n });

    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { action: 'PAYMENT_REVIEW_RESOLVED', resourceId: order.id },
    });
    expect(audit.actorUserId).toBe(admin.userId);
  });

  it('menandai refund pending dari pembayaran yang tidak dapat diterbitkan', async () => {
    const admin = await setupAdmin();
    const { organizer, event, ticketType } = await setupPublishedEvent(app, { price: 90_000 });
    const order = await createLatePaymentOrder(organizer, event.id, ticketType.id);

    const resolved = await admin.agent
      .post(`/api/v1/admin/orders/${order.id}/payment-review/resolve`)
      .send({
        action: 'REFUND',
        note: 'Kuota sudah habis, refund diproses manual melalui provider.',
      });
    expect(resolved.status).toBe(200);
    expect(resolved.body.data.refundPending).toBe(true);

    const stored = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(stored.status).toBe('REFUND_PENDING');
    const payment = await prisma.payment.findFirstOrThrow({
      where: { orderId: order.id, provider: 'mock' },
    });
    expect(payment.status).toBe('REFUND_PENDING');
    expect(await prisma.ticket.count({ where: { orderId: order.id } })).toBe(0);
  });
});

describe('user status and platform settings', () => {
  it('menyuspend pengguna, mencabut sesi, dan menonaktifkan organizer', async () => {
    const admin = await setupAdmin();
    const organizer = await setupOrganizer(app);

    const response = await admin.agent
      .patch(`/api/v1/admin/users/${organizer.userId}/status`)
      .send({ status: 'SUSPENDED', note: 'Pelanggaran kebijakan penjualan.' });
    expect(response.status).toBe(200);
    expect(response.body.data.user.status).toBe('SUSPENDED');
    expect(response.body.data.user.organizerProfile.status).toBe('SUSPENDED');

    const blocked = await organizer.agent.get('/api/v1/organizer/dashboard');
    expect(blocked.status).toBe(401);

    const self = await admin.agent
      .patch(`/api/v1/admin/users/${admin.userId}/status`)
      .send({ status: 'SUSPENDED', note: 'Tidak boleh.' });
    expect(self.status).toBe(400);
    expect(self.body.error.code).toBe('CANNOT_MODIFY_SELF');
  });

  it('mengelola kategori, pengaturan, dan audit log', async () => {
    const admin = await setupAdmin();
    await prisma.user.update({ where: { id: admin.userId }, data: { role: 'SUPERADMIN' } });
    const slug = `workshop-${Date.now()}`;

    const created = await admin.agent.post('/api/v1/admin/categories').send({
      name: 'Workshop',
      slug,
      description: 'Kelas praktik dengan peserta terbatas.',
      isActive: true,
    });
    expect(created.status).toBe(201);
    const categoryId = created.body.data.category.id as string;

    const updated = await admin.agent
      .patch(`/api/v1/admin/categories/${categoryId}`)
      .send({ description: 'Kelas praktik dengan kuota kecil.' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.category.description).toBe('Kelas praktik dengan kuota kecil.');

    const settings = await admin.agent.patch('/api/v1/admin/settings').send({
      platformFeeType: 'percentage',
      platformFeeValue: 5,
      orderReservationMinutes: 20,
    });
    expect(settings.status).toBe(200);
    expect(settings.body.data.settings.platformFeeType).toBe('percentage');
    expect(settings.body.data.settings.orderReservationMinutes).toBe(20);

    const publicCategories = await request(app).get('/api/v1/categories');
    expect(publicCategories.status).toBe(200);
    expect(
      publicCategories.body.data.categories.some(
        (category: { slug: string }) => category.slug === slug,
      ),
    ).toBe(true);

    const hidden = await admin.agent
      .patch(`/api/v1/admin/categories/${categoryId}`)
      .send({ isActive: false });
    expect(hidden.status).toBe(200);
    const activeCategories = await request(app).get('/api/v1/categories');
    expect(
      activeCategories.body.data.categories.some(
        (category: { slug: string }) => category.slug === slug,
      ),
    ).toBe(false);
    const adminCategories = await admin.agent.get('/api/v1/admin/categories');
    expect(
      adminCategories.body.data.categories.find(
        (category: { id: string }) => category.id === categoryId,
      ).isActive,
    ).toBe(false);

    const audit = await admin.agent.get('/api/v1/admin/audit-logs?resourceType=PLATFORM_SETTINGS');
    expect(audit.status).toBe(200);
    expect(audit.body.data.length).toBeGreaterThanOrEqual(1);
  });
});
