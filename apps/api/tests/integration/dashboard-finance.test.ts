import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { fulfillOrder } from '../../src/modules/orders/order.service';
import {
  checkoutCustomerDetails,
  registerAgent,
  setupOrganizer,
  setupPublishedEvent,
  PASSWORD,
} from '../helpers';

const app = createApp();
async function admin(role: 'ADMIN' | 'SUPERADMIN' = 'ADMIN') {
  const user = await registerAgent(app);
  await prisma.user.update({ where: { id: user.userId }, data: { role } });
  return user;
}
async function paidOrder(price = 100_000) {
  const setup = await setupPublishedEvent(app, { price });
  await prisma.platformSetting.createMany({
    data: [
      { key: 'platform_fee_type', value: 'percentage' },
      { key: 'platform_fee_value', value: 5 },
    ],
  });
  const items = [{ ticketTypeId: setup.ticketType.id, quantity: 1 }];
  const response = await setup.organizer.agent.post('/api/v1/orders').send({
    eventId: setup.event.id,
    buyerName: 'Pembeli Uji',
    buyerEmail: setup.organizer.email,
    buyerPhone: '081234567890',
    items,
    acceptTerms: true,
    idempotencyKey: randomUUID(),
    ...checkoutCustomerDetails(items, 'Pembeli Uji', setup.organizer.email),
  });
  expect(response.status).toBe(201);
  const order = response.body.data.order;
  await fulfillOrder(order.id, {
    provider: 'mock',
    providerReference: `test-${order.id}`,
    amount: order.total,
    currency: 'IDR',
    paidAt: new Date(),
    raw: {},
    allowUnreserved: false,
  });
  return { ...setup, order };
}
async function bank(creator: Awaited<ReturnType<typeof setupOrganizer>>) {
  const response = await creator.agent
    .post('/api/v1/creator/bank-accounts')
    .send({ bankName: 'Bank Uji', accountHolder: 'Organizer Uji', accountNumber: '1234567890' });
  expect(response.status).toBe(201);
  expect(response.body.data.account.accountNumber).toBe('•••• 7890');
  return response.body.data.account.id as string;
}

describe('dashboard RBAC and ownership', () => {
  it('resolves the current role from the database and reserves system management for Superadmin', async () => {
    const operational = await admin();
    const root = await admin('SUPERADMIN');
    expect((await operational.agent.get('/api/v1/admin/analytics')).status).toBe(200);
    expect((await root.agent.get('/api/v1/admin/analytics')).status).toBe(200);
    for (const path of ['admins', 'permissions', 'settings'])
      expect((await operational.agent.get(`/api/v1/admin/${path}`)).status).toBe(403);
    expect((await root.agent.get('/api/v1/admin/admins')).status).toBe(200);
    expect(
      (
        await operational.agent
          .patch(`/api/v1/admin/users/${root.userId}/status`)
          .send({ status: 'SUSPENDED', note: 'Penangguhan akun uji' })
      ).status,
    ).toBe(403);
    expect(
      (
        await operational.agent
          .post('/api/v1/admin/admins')
          .send({ name: 'Tidak Sah', email: 'bad@example.com', password: PASSWORD })
      ).status,
    ).toBe(403);
  });
  it('prevents disabling or demoting the last active Superadmin, including concurrent requests', async () => {
    const root = await admin('SUPERADMIN');
    const other = await admin('SUPERADMIN');
    const responses = await Promise.all([
      root.agent.patch(`/api/v1/admin/admins/${root.userId}`).send({ status: 'SUSPENDED' }),
      other.agent.patch(`/api/v1/admin/admins/${other.userId}`).send({ role: 'ADMIN' }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(await prisma.user.count({ where: { role: 'SUPERADMIN', status: 'ACTIVE' } })).toBe(1);
  });
  it('isolates event reports, bank accounts, orders, payout details and approval routes by organizer', async () => {
    const own = await paidOrder();
    const stranger = await setupOrganizer(app, 'Organizer lain');
    const bankId = await bank(own.organizer);
    const payout = await own.organizer.agent
      .post('/api/v1/creator/payouts')
      .send({ bankAccountId: bankId, amount: 50_000, idempotencyKey: randomUUID() });
    expect(payout.status).toBe(201);
    for (const path of [
      `events/${own.event.id}`,
      `event-reports/${own.event.id}`,
      `orders/${own.order.id}`,
      `payouts/${payout.body.data.payout.id}`,
    ])
      expect([403, 404]).toContain((await stranger.agent.get(`/api/v1/creator/${path}`)).status);
    expect(
      (
        await stranger.agent
          .post('/api/v1/creator/payouts')
          .send({ bankAccountId: bankId, amount: 50_000, idempotencyKey: randomUUID() })
      ).status,
    ).toBe(404);
    expect(
      (
        await own.organizer.agent
          .patch(`/api/v1/admin/events/${own.event.id}/review`)
          .send({ status: 'PUBLISHED' })
      ).status,
    ).toBe(403);
    expect(
      (await stranger.agent.get('/api/v1/creator/financial-overview')).body.data.grossTicketSales,
    ).toBe(0);
    expect((await stranger.agent.get('/api/v1/creator/orders')).body.data).toEqual([]);
  });
  it('applies Creator permission changes on the server while keeping operational admin permissions fixed', async () => {
    const root = await admin('SUPERADMIN');
    const creator = await setupOrganizer(app);
    expect(
      (
        await root.agent
          .patch('/api/v1/admin/permissions')
          .send({ role: 'CREATOR', permission: 'payouts', enabled: false })
      ).status,
    ).toBe(200);
    expect((await creator.agent.get('/api/v1/creator/bank-accounts')).status).toBe(403);
    expect(
      (
        await root.agent
          .patch('/api/v1/admin/permissions')
          .send({ role: 'ADMIN', permission: 'payouts', enabled: false })
      ).status,
    ).toBe(400);
  });
});

describe('internal ledger and withdrawal', () => {
  it('keeps accumulated Rupiah balances and reports correct above the 32-bit integer limit', async () => {
    const setup = await paidOrder(750_000_000);
    const items = [{ ticketTypeId: setup.ticketType.id, quantity: 1 }];
    for (let index = 0; index < 3; index++) {
      const response = await setup.organizer.agent.post('/api/v1/orders').send({
        eventId: setup.event.id,
        buyerName: 'Pembeli Kedua',
        buyerEmail: setup.organizer.email,
        buyerPhone: '081234567890',
        items,
        acceptTerms: true,
        idempotencyKey: randomUUID(),
        ...checkoutCustomerDetails(items, 'Pembeli Kedua', setup.organizer.email),
      });
      expect(response.status).toBe(201);
      const order = response.body.data.order;
      await fulfillOrder(order.id, {
        provider: 'mock',
        providerReference: `test-${order.id}`,
        amount: order.total,
        currency: 'IDR',
        paidAt: new Date(),
        raw: {},
        allowUnreserved: false,
      });
    }
    expect(
      await prisma.organizerWallet.findUnique({
        where: { organizerId: setup.organizer.organizerId },
      }),
    ).toMatchObject({ available: 3_000_000_000n });
    const overview = await setup.organizer.agent.get(
      '/api/v1/creator/financial-overview?period=all',
    );
    expect(overview.status).toBe(200);
    expect(overview.body.data).toMatchObject({
      grossTicketSales: 3_000_000_000,
      serviceFeeRevenue: 150_000_000,
      availableBalance: 3_000_000_000,
    });
    const report = await setup.organizer.agent.get(
      `/api/v1/creator/event-reports/${setup.event.id}`,
    );
    expect(report.status).toBe(200);
    expect(report.body.data.report.grossTicketSales).toBe(3_000_000_000);
    const analytics = await setup.organizer.agent.get('/api/v1/creator/analytics?period=all');
    expect(analytics.status).toBe(200);
    expect(analytics.body.data.trend[0].ticketSales).toBe(3_000_000_000);
  });
  it('snapshots checkout fees, posts payment exactly once and separates platform fees from ticket proceeds', async () => {
    const setup = await paidOrder();
    const stored = await prisma.order.findUniqueOrThrow({ where: { id: setup.order.id } });
    expect(stored).toMatchObject({
      subtotal: 100_000,
      platformFee: 5_000,
      total: 105_000,
      feeTypeSnapshot: 'percentage',
      feeValueSnapshot: 5,
    });
    await prisma.platformSetting.update({
      where: { key: 'platform_fee_value' },
      data: { value: 10 },
    });
    await fulfillOrder(setup.order.id, {
      provider: 'mock',
      providerReference: `test-${setup.order.id}`,
      amount: 105_000,
      currency: 'IDR',
      paidAt: new Date(),
      raw: {},
      allowUnreserved: false,
    });
    expect(await prisma.financialLedger.count({ where: { orderId: setup.order.id } })).toBe(2);
    const overview = await setup.organizer.agent.get(
      '/api/v1/creator/financial-overview?period=all',
    );
    expect(overview.body.data).toMatchObject({
      grossTicketSales: 100_000,
      serviceFeeRevenue: 5_000,
      availableBalance: 100_000,
      paymentGatewayCosts: null,
    });
    const report = await setup.organizer.agent.get(
      `/api/v1/creator/event-reports/${setup.event.id}`,
    );
    expect(report.body.data.report).toMatchObject({
      grossTicketSales: 100_000,
      serviceFeeRevenue: 5_000,
      organizerProceeds: 100_000,
      outstandingBalance: 100_000,
    });
  });
  it('reserves concurrent withdrawals atomically and releases only once on rejection', async () => {
    const setup = await paidOrder();
    const reviewer = await admin();
    const bankId = await bank(setup.organizer);
    const responses = await Promise.all(
      Array.from({ length: 2 }, () =>
        setup.organizer.agent
          .post('/api/v1/creator/payouts')
          .send({ bankAccountId: bankId, amount: 80_000, idempotencyKey: randomUUID() }),
      ),
    );
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    const payout = responses.find((response) => response.status === 201)!.body.data.payout;
    expect(
      await prisma.organizerWallet.findUnique({
        where: { organizerId: setup.organizer.organizerId },
      }),
    ).toMatchObject({ available: 20_000n, reserved: 80_000n });
    for (let i = 0; i < 2; i++)
      expect(
        (
          await reviewer.agent
            .patch(`/api/v1/admin/payouts/${payout.id}/review`)
            .send({ status: 'REJECTED', note: 'Dokumen rekening perlu revisi' })
        ).status,
      ).toBe(200);
    expect(
      await prisma.organizerWallet.findUnique({
        where: { organizerId: setup.organizer.organizerId },
      }),
    ).toMatchObject({ available: 100_000n, reserved: 0n });
    expect(
      await prisma.financialLedger.count({
        where: { payoutId: payout.id, transactionType: 'PAYOUT_RELEASED' },
      }),
    ).toBe(1);
  });
  it('replays duplicate withdrawal keys without reserving twice and approval never completes a transfer', async () => {
    const setup = await paidOrder();
    const reviewer = await admin();
    const bankId = await bank(setup.organizer);
    const input = { bankAccountId: bankId, amount: 60_000, idempotencyKey: randomUUID() };
    const responses = await Promise.all([
      setup.organizer.agent.post('/api/v1/creator/payouts').send(input),
      setup.organizer.agent.post('/api/v1/creator/payouts').send(input),
    ]);
    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    expect(responses[0].body.data.payout.id).toBe(responses[1].body.data.payout.id);
    const id = responses[0].body.data.payout.id;
    const reviewed = await reviewer.agent
      .patch(`/api/v1/admin/payouts/${id}/review`)
      .send({ status: 'APPROVED', note: 'Disetujui untuk antrean provider' });
    expect(reviewed.body.data.payout).toMatchObject({ status: 'APPROVED' });
    expect(reviewed.body.data.payout.providerMessage).toContain('Belum ada transfer');
    expect(
      await prisma.organizerWallet.findUnique({
        where: { organizerId: setup.organizer.organizerId },
      }),
    ).toMatchObject({ available: 40_000n, reserved: 60_000n, withdrawn: 0n });
    expect(
      (
        await setup.organizer.agent
          .post('/api/v1/creator/payouts')
          .send({ ...input, amount: 50_000 })
      ).status,
    ).toBe(409);
    expect(await prisma.auditLog.count({ where: { resourceId: id } })).toBe(2);
  });
  it('reserves approved refunds, simulates once, and reconciles ticket and fee components', async () => {
    const setup = await paidOrder();
    const reviewer = await admin();
    const response = await reviewer.agent.post('/api/v1/admin/refunds').send({
      orderId: setup.order.id,
      ticketAmount: 100_000,
      feeAmount: 5_000,
      reason: 'Permintaan refund seluruh pembayaran',
      idempotencyKey: randomUUID(),
    });
    expect(response.status).toBe(201);
    const id = response.body.data.refund.id;
    expect(
      (
        await reviewer.agent
          .patch(`/api/v1/admin/refunds/${id}/review`)
          .send({ status: 'APPROVED', note: 'Sesuai kebijakan refund event' })
      ).status,
    ).toBe(200);
    expect(
      await prisma.organizerWallet.findUnique({
        where: { organizerId: setup.organizer.organizerId },
      }),
    ).toMatchObject({ available: 0n, reserved: 100_000n });
    for (let i = 0; i < 2; i++)
      expect((await reviewer.agent.post(`/api/v1/admin/refunds/${id}/simulate`)).status).toBe(200);
    const overview = await setup.organizer.agent.get(
      '/api/v1/creator/financial-overview?period=all',
    );
    expect(overview.body.data).toMatchObject({
      totalRefunds: 105_000,
      organizerProceeds: 0,
      availableBalance: 0,
      reservedBalance: 0,
      netFeeIncome: 0,
    });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: setup.order.id } })).status).toBe(
      'REFUNDED',
    );
    expect(
      await prisma.financialLedger.count({ where: { referenceId: `refund-ticket:${id}` } }),
    ).toBe(1);
  });
  it('logs login and keeps system audit entries hidden from operational admins', async () => {
    const operational = await admin();
    const root = await admin('SUPERADMIN');
    await request(app).post('/api/v1/auth/login').send({ email: root.email, password: PASSWORD });
    expect(
      await prisma.auditLog.count({ where: { actorUserId: root.userId, action: 'LOGIN' } }),
    ).toBe(1);
    await root.agent
      .patch('/api/v1/admin/settings')
      .send({ platformFeeType: 'percentage', platformFeeValue: 5 });
    const audit = await operational.agent.get('/api/v1/admin/audit-logs');
    expect(
      audit.body.data.every(
        (row: { resourceType: string }) => row.resourceType !== 'PLATFORM_SETTINGS',
      ),
    ).toBe(true);
    expect(
      (await root.agent.get('/api/v1/admin/audit-logs')).body.data.some(
        (row: { resourceType: string }) => row.resourceType === 'PLATFORM_SETTINGS',
      ),
    ).toBe(true);
  });
});
