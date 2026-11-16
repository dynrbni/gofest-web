import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { registerAgent, setupOrganizer, setupPublishedEvent, PASSWORD } from '../helpers';

const app = createApp();
async function admin(role: 'ADMIN' | 'SUPERADMIN' = 'ADMIN') {
  const account = await registerAgent(app);
  await prisma.user.update({ where: { id: account.userId }, data: { role } });
  return account;
}
describe('workspace management', () => {
  it('persists content CRUD and exposes only active content to public pages', async () => {
    const reviewer = await admin();
    const input = {
      kind: 'BANNER',
      title: 'Pengumuman festival',
      description: 'Informasi dari tim operasional',
      targetUrl: '/events',
      isActive: true,
      sortOrder: 1,
    };
    const created = await reviewer.agent.post('/api/v1/admin/content').send(input);
    expect(created.status).toBe(201);
    const id = created.body.data.item.id;
    expect((await request(app).get('/api/v1/content')).body.data.items).toHaveLength(1);
    expect(
      (
        await reviewer.agent
          .patch(`/api/v1/admin/content/${id}`)
          .send({ ...input, isActive: false })
      ).status,
    ).toBe(200);
    expect((await request(app).get('/api/v1/content')).body.data.items).toHaveLength(0);
    expect((await reviewer.agent.delete(`/api/v1/admin/content/${id}`)).status).toBe(200);
    expect(await prisma.auditLog.count({ where: { resourceId: id } })).toBe(3);
  });
  it('isolates support tickets and notifications and honors the notification setting', async () => {
    const reviewer = await admin();
    const creator = await setupOrganizer(app);
    const other = await setupOrganizer(app);
    const opened = await creator.agent.post('/api/v1/creator/support').send({
      subject: 'Bantuan pengajuan event',
      message: 'Mohon bantu periksa pengajuan event saya.',
    });
    expect(opened.status).toBe(201);
    expect((await other.agent.get('/api/v1/creator/support')).body.data).toHaveLength(0);
    const id = opened.body.data.ticket.id;
    expect(
      (
        await reviewer.agent
          .patch(`/api/v1/admin/support/${id}`)
          .send({ status: 'RESOLVED', reply: 'Pengajuan sudah diperiksa oleh tim operasional.' })
      ).status,
    ).toBe(200);
    const notices = await creator.agent.get('/api/v1/creator/notifications');
    expect(notices.body.data.unread).toBe(1);
    const noticeId = notices.body.data.notifications[0].id;
    expect((await other.agent.patch(`/api/v1/creator/notifications/${noticeId}/read`)).status).toBe(
      404,
    );
    expect(
      (await creator.agent.patch(`/api/v1/creator/notifications/${noticeId}/read`)).status,
    ).toBe(200);
    expect((await creator.agent.get('/api/v1/creator/notifications')).body.data.unread).toBe(0);
    await prisma.platformSetting.upsert({
      where: { key: 'notifications_enabled' },
      create: { key: 'notifications_enabled', value: false },
      update: { value: false },
    });
    await reviewer.agent.patch(`/api/v1/admin/support/${id}`).send({
      status: 'RESOLVED',
      reply: 'Konfirmasi tambahan untuk pengujian setting notifikasi.',
    });
    expect(await prisma.notification.count({ where: { userId: creator.userId } })).toBe(1);
  });
  it('reviews events with reasons, records the reviewer, and requires another review after important edits', async () => {
    const reviewer = await admin();
    const setup = await setupPublishedEvent(app);
    const id = setup.event.id;
    expect(
      (
        await reviewer.agent
          .patch(`/api/v1/admin/events/${id}/review`)
          .send({ status: 'NEEDS_REVISION' })
      ).status,
    ).toBe(422);
    expect(
      (
        await reviewer.agent
          .patch(`/api/v1/admin/events/${id}/review`)
          .send({ status: 'NEEDS_REVISION', note: 'Lengkapi informasi lokasi dan akses venue.' })
      ).status,
    ).toBe(200);
    expect((await setup.organizer.agent.post(`/api/v1/creator/events/${id}/submit`)).status).toBe(
      200,
    );
    const approved = await reviewer.agent
      .patch(`/api/v1/admin/events/${id}/review`)
      .send({ status: 'PUBLISHED', note: 'Informasi sudah lengkap.' });
    expect(approved.body.data.event.reviewedByUserId).toBe(reviewer.userId);
    const updated = await setup.organizer.agent
      .patch(`/api/v1/creator/events/${id}`)
      .send({ title: 'Judul event berubah setelah review' });
    expect(updated.body.data.event.status).toBe('PENDING_REVIEW');
    const history = await setup.organizer.agent.get(`/api/v1/creator/events/${id}/history`);
    expect(
      history.body.data.history.filter(
        (entry: { action: string }) => entry.action === 'EVENT_REVIEWED',
      ),
    ).toHaveLength(2);
  });
  it('shares operational ticket/coupon controls between Admin and Superadmin without crossing creator ownership', async () => {
    const reviewer = await admin();
    const root = await admin('SUPERADMIN');
    const setup = await setupPublishedEvent(app);
    const other = await setupOrganizer(app);
    const ticket = await reviewer.agent
      .post(`/api/v1/admin/events/${setup.event.id}/ticket-types`)
      .send({ name: 'VIP', price: 300_000, quotaTotal: 20, minPerOrder: 1, maxPerOrder: 5 });
    expect(ticket.status).toBe(201);
    const ticketId = ticket.body.data.ticketType.id;
    expect(
      (
        await root.agent
          .patch(`/api/v1/admin/ticket-types/${ticketId}`)
          .send({ price: 325_000, quotaTotal: 30 })
      ).status,
    ).toBe(200);
    expect(
      (await other.agent.patch(`/api/v1/creator/ticket-types/${ticketId}`).send({ price: 1 }))
        .status,
    ).toBe(403);
    const coupon = await reviewer.agent
      .post(`/api/v1/admin/events/${setup.event.id}/coupons`)
      .send({ code: 'DEMO10', discountType: 'PERCENTAGE', discountValue: 10 });
    expect(coupon.status).toBe(201);
    expect(
      (
        await root.agent
          .patch(`/api/v1/admin/coupons/${coupon.body.data.coupon.id}`)
          .send({ isActive: false })
      ).status,
    ).toBe(200);
    expect(
      (await setup.organizer.agent.get(`/api/v1/creator/events/${setup.event.id}/coupons`)).body
        .data.coupons[0].isActive,
    ).toBe(false);
  });
  it('creates and resets admin passwords through the protected management API', async () => {
    const root = await admin('SUPERADMIN');
    const email = `managed-${randomUUID()}@example.com`;
    const created = await root.agent
      .post('/api/v1/admin/admins')
      .send({ name: 'Admin Operasional', email, password: PASSWORD });
    expect(created.status).toBe(201);
    expect(created.body.data.admin.passwordHash).toBeUndefined();
    const id = created.body.data.admin.id;
    expect(
      (await request(app).post('/api/v1/auth/login').send({ email, password: PASSWORD })).status,
    ).toBe(200);
    expect(
      (
        await root.agent
          .post(`/api/v1/admin/admins/${id}/reset-password`)
          .send({ password: 'PasswordBaru123!' })
      ).status,
    ).toBe(200);
    expect(
      (await request(app).post('/api/v1/auth/login').send({ email, password: PASSWORD })).status,
    ).toBe(401);
    expect(
      (await request(app).post('/api/v1/auth/login').send({ email, password: 'PasswordBaru123!' }))
        .status,
    ).toBe(200);
    await root.agent.patch(`/api/v1/admin/admins/${id}`).send({ status: 'SUSPENDED' });
    expect(
      (await request(app).post('/api/v1/auth/login').send({ email, password: 'PasswordBaru123!' }))
        .status,
    ).toBe(403);
  });
});
