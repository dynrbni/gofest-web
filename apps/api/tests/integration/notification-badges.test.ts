import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { randomUUID } from 'node:crypto';
import {
  checkoutCustomerDetails,
  registerAgent,
  setupOrganizer,
  setupPublishedEvent,
} from '../helpers';

const app = createApp();

describe('categorized notification inbox', () => {
  it('notifies only the selling organizer and operational admins once when checkout is retried', async () => {
    const admin = await registerAgent(app);
    await prisma.user.update({ where: { id: admin.userId }, data: { role: 'ADMIN' } });
    const { organizer, event, ticketType } = await setupPublishedEvent(app);
    const other = await setupOrganizer(app);
    await prisma.notification.deleteMany();
    const items = [{ ticketTypeId: ticketType.id, quantity: 1 }];
    const payload = {
      ...checkoutCustomerDetails(items),
      items,
      eventId: event.id,
      buyerName: 'Budi Santoso',
      buyerEmail: 'buyer@example.com',
      buyerPhone: '081234567890',
      acceptTerms: true,
      idempotencyKey: randomUUID(),
    };
    expect((await organizer.agent.post('/api/v1/orders').send(payload)).status).toBe(201);
    expect((await organizer.agent.post('/api/v1/orders').send(payload)).status).toBe(201);
    expect(
      (await organizer.agent.get('/api/v1/creator/notifications')).body.data.unreadByCategory,
    ).toEqual({ ORDER: 1 });
    expect(
      (await admin.agent.get('/api/v1/admin/notifications')).body.data.unreadByCategory,
    ).toEqual({ ORDER: 1 });
    expect((await other.agent.get('/api/v1/creator/notifications')).body.data.unread).toBe(0);
  });

  it('keeps counts per recipient, independent of pagination, and marks only explicitly read notices', async () => {
    const creator = await setupOrganizer(app);
    const other = await setupOrganizer(app);
    await prisma.notification.createMany({
      data: [
        {
          userId: creator.userId,
          category: 'ORDER',
          title: 'Pesanan baru',
          message: 'Pesanan event sendiri',
        },
        {
          userId: creator.userId,
          category: 'ORDER',
          title: 'Pesanan lain',
          message: 'Pesanan kedua',
        },
        { userId: creator.userId, category: 'PAYOUT', title: 'Payout', message: 'Payout sendiri' },
        {
          userId: creator.userId,
          category: 'SUPPORT',
          title: 'Dibaca',
          message: 'Sudah dibaca',
          readAt: new Date(),
        },
        { userId: other.userId, category: 'ORDER', title: 'Rahasia', message: 'Organizer lain' },
      ],
    });
    const inbox = await creator.agent.get('/api/v1/creator/notifications?limit=1');
    expect(inbox.status).toBe(200);
    expect(inbox.body.data.notifications).toHaveLength(1);
    expect(inbox.body.data.unread).toBe(3);
    expect(inbox.body.data.unreadByCategory).toEqual({ ORDER: 2, PAYOUT: 1 });
    expect(inbox.body.data.meta.total).toBe(4);
    await creator.agent.get('/api/v1/creator/orders');
    expect((await creator.agent.get('/api/v1/creator/notifications')).body.data.unread).toBe(3);

    const notice = await prisma.notification.findFirstOrThrow({
      where: { userId: creator.userId, category: 'ORDER' },
    });
    expect(
      (await other.agent.patch(`/api/v1/creator/notifications/${notice.id}/read`)).status,
    ).toBe(404);
    expect(
      (await creator.agent.patch(`/api/v1/creator/notifications/${notice.id}/read`)).status,
    ).toBe(200);
    expect(
      (await creator.agent.patch(`/api/v1/creator/notifications/${notice.id}/read`)).status,
    ).toBe(200);
    const updated = await creator.agent.get('/api/v1/creator/notifications');
    expect(updated.body.data.unread).toBe(2);
    expect(updated.body.data.unreadByCategory).toEqual({ ORDER: 1, PAYOUT: 1 });
    expect((await other.agent.get('/api/v1/creator/notifications')).body.data.unread).toBe(1);
  });

  it('delivers operational categories to active Admin and Superadmin recipients without sharing read state', async () => {
    const admin = await registerAgent(app);
    const superadmin = await registerAgent(app);
    const suspended = await registerAgent(app);
    await prisma.user.update({ where: { id: admin.userId }, data: { role: 'ADMIN' } });
    await prisma.user.update({ where: { id: superadmin.userId }, data: { role: 'SUPERADMIN' } });
    await prisma.user.update({
      where: { id: suspended.userId },
      data: { role: 'ADMIN', status: 'SUSPENDED' },
    });
    const creator = await setupOrganizer(app);
    const other = await setupOrganizer(app);
    await prisma.notification.deleteMany();
    const opened = await creator.agent
      .post('/api/v1/creator/support')
      .send({ subject: 'Permintaan bantuan', message: 'Mohon bantu meninjau pengajuan saya.' });
    expect(opened.status).toBe(201);
    const inbox = await admin.agent.get('/api/v1/admin/notifications');
    expect(inbox.body.data.unreadByCategory).toEqual({ SUPPORT: 1 });
    expect(
      (await superadmin.agent.get('/api/v1/admin/notifications')).body.data.unreadByCategory,
    ).toEqual({ SUPPORT: 1 });
    const noticeId = inbox.body.data.notifications[0].id;
    expect(
      (await superadmin.agent.patch(`/api/v1/admin/notifications/${noticeId}/read`)).status,
    ).toBe(404);
    expect((await admin.agent.patch(`/api/v1/admin/notifications/${noticeId}/read`)).status).toBe(
      200,
    );
    expect((await admin.agent.get('/api/v1/admin/notifications')).body.data.unread).toBe(0);
    expect((await superadmin.agent.get('/api/v1/admin/notifications')).body.data.unread).toBe(1);
    expect((await other.agent.get('/api/v1/creator/notifications')).body.data.unread).toBe(0);
    expect(await prisma.notification.count({ where: { userId: suspended.userId } })).toBe(0);
  });
});
