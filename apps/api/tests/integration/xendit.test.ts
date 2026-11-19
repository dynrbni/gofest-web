import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { createOrderTicketPdf } from '../../src/modules/tickets/ticket-pdf';
import { checkoutCustomerDetails, registerAgent, setupPublishedEvent } from '../helpers';

vi.mock('../../src/config/env', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/config/env')>();
  return {
    env: {
      ...original.env,
      PAYMENT_PROVIDER: 'xendit',
      WEB_URL: 'https://localhost:5173',
      XENDIT_SECRET_API_KEY: 'test-api-key',
      XENDIT_WEBHOOK_TOKEN: 'test-callback-token',
      XENDIT_PAYOUTS_ENABLED: true,
    },
  };
});

const app = createApp();

afterEach(() => vi.unstubAllGlobals());

function webhook(
  type: 'payments' | 'payouts',
  event: string,
  data: unknown,
  token = 'test-callback-token',
) {
  return request(app)
    .post(`/api/v1/webhooks/${type}/xendit`)
    .set('x-callback-token', token)
    .send({ event, data });
}

async function newOrder(price: number) {
  const fixture = await setupPublishedEvent(app, { price });
  const items = [{ ticketTypeId: fixture.ticketType.id, quantity: 1 }];
  const order = await fixture.organizer.agent.post('/api/v1/orders').send({
    eventId: fixture.event.id,
    buyerName: 'Pembeli Uji',
    buyerEmail: fixture.organizer.email,
    buyerPhone: '081234567890',
    items,
    acceptTerms: true,
    idempotencyKey: randomUUID(),
    ...checkoutCustomerDetails(items, 'Pembeli Uji', fixture.organizer.email),
  });
  expect(order.status, JSON.stringify(order.body.error)).toBe(201);
  return {
    ...fixture,
    orderCode: order.body.data.order.orderCode as string,
    total: order.body.data.order.total as number,
  };
}

describe('Xendit integration', () => {
  it('reuses the payment session and issues tickets only for a matching signed completion', async () => {
    const { orderCode, total, organizer } = await newOrder(120_000);
    const session = {
      payment_session_id: 'ps-test-order',
      reference_id: orderCode,
      status: 'ACTIVE',
      currency: 'IDR',
      amount: total,
      expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      components_sdk_key: 'session-test-key',
    };
    const call = vi.fn(async (input: string, init?: RequestInit) => {
      expect(input).toMatch(/^https:\/\/api\.xendit\.co\/sessions/);
      if (init?.method === 'POST') {
        expect(JSON.parse(String(init.body))).toMatchObject({ mode: 'COMPONENTS', amount: total });
      }
      return Response.json(session);
    });
    vi.stubGlobal('fetch', call);

    const open = () => organizer.agent.post(`/api/v1/orders/${orderCode}/payment`);
    const sessions = await Promise.all([open(), open()]);
    for (const response of sessions) {
      expect(response.status).toBe(200);
      expect(response.body.data.componentsSdkKey).toBe(session.components_sdk_key);
      expect(response.headers['cache-control']).toBe('private, no-store');
    }
    expect(call.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
    expect(await prisma.payment.count({ where: { provider: 'xendit' } })).toBe(1);
    const completion = {
      ...session,
      id: session.payment_session_id,
      payment_session_id: undefined,
      status: 'COMPLETED',
      payment_id: 'py-test-order',
    };
    expect(
      (await webhook('payments', 'payment_session.completed', completion, 'wrong')).status,
    ).toBe(403);
    expect(
      (await webhook('payments', 'payment_session.completed', { ...completion, amount: total + 1 }))
        .status,
    ).toBe(422);
    expect(await prisma.ticket.count()).toBe(0);
    for (const _ of [1, 2]) {
      expect((await webhook('payments', 'payment_session.completed', completion)).status).toBe(200);
    }
    expect(await prisma.ticket.count()).toBe(1);
    expect(await prisma.emailNotification.count({ where: { template: 'PAYMENT_SUCCESS' } })).toBe(
      1,
    );
    const pdf = await createOrderTicketPdf(orderCode, organizer.email);
    expect(pdf?.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('dispatches only after admin approval and returns a reversed payout to the available balance once', async () => {
    const { organizer } = await newOrder(120_000);
    await prisma.organizerWallet.upsert({
      where: { organizerId: organizer.organizerId },
      update: { available: 120_000 },
      create: { organizerId: organizer.organizerId, available: 120_000 },
    });
    const admin = await registerAgent(app);
    await prisma.user.update({ where: { id: admin.userId }, data: { role: 'ADMIN' } });
    const bank = await organizer.agent.post('/api/v1/creator/bank-accounts').send({
      bankName: 'Bank BCA',
      accountHolder: 'Pemilik Rekening Uji',
      accountNumber: '1234567890',
    });
    expect(bank.status).toBe(201);
    const amount = 60_000;
    let providerPayout: Record<string, unknown> | undefined;
    const call = vi.fn(async (_input: string, init?: RequestInit) => {
      if (init?.method !== 'POST') {
        if (_input.endsWith('/disb-test')) return Response.json(providerPayout);
        return Response.json({ data: providerPayout ? [providerPayout] : [], has_more: false });
      }
      const body = JSON.parse(String(init.body));
      expect(body).toMatchObject({ amount, channel_code: 'ID_BCA', currency: 'IDR' });
      expect((init.headers as Record<string, string>)['idempotency-key']).toBe(body.reference_id);
      providerPayout = {
        id: 'disb-test',
        reference_id: body.reference_id,
        amount,
        currency: 'IDR',
        status: 'ACCEPTED',
      };
      return Response.json(providerPayout);
    });
    vi.stubGlobal('fetch', call);
    const response = await organizer.agent.post('/api/v1/creator/payouts').send({
      amount,
      bankAccountId: bank.body.data.account.id,
      idempotencyKey: randomUUID(),
    });
    expect(response.status).toBe(201);
    expect(call).not.toHaveBeenCalled();
    const id = response.body.data.payout.id;
    const submit = () =>
      admin.agent
        .patch(`/api/v1/admin/payouts/${id}/review`)
        .send({ status: 'APPROVED', note: 'Rekening sesuai' });
    expect((await submit()).body.data.payout.status).toBe('PROCESSING');
    expect((await submit()).status).toBe(200);
    expect(call.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
    expect(
      (await webhook('payouts', 'payout.succeeded', { ...providerPayout, status: 'SUCCEEDED' }))
        .status,
    ).toBe(200);
    const wallet = () =>
      prisma.organizerWallet.findUnique({ where: { organizerId: organizer.organizerId } });
    expect(await wallet()).toMatchObject({ available: 60_000n, reserved: 0n, withdrawn: 60_000n });
    for (const _ of [1, 2]) {
      expect(
        (await webhook('payouts', 'payout.reversed', { ...providerPayout, status: 'REVERSED' }))
          .status,
      ).toBe(200);
    }
    expect(await wallet()).toMatchObject({ available: 120_000n, reserved: 0n, withdrawn: 0n });
  });
});
