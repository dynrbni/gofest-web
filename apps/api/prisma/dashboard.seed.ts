import type { Request } from 'express';
import type { UserRole } from '@prisma/client';
import { createOrderSchema } from '@gofest/shared';
import { prisma } from '../src/lib/prisma';
import { env } from '../src/config/env';
import { hashPassword } from '../src/lib/password';
import { createOrder, fulfillOrder } from '../src/modules/orders/order.service';
import { addBank, requestPayout, reviewPayout } from '../src/modules/finance/payout.service';
import { requestRefund, reviewRefund, simulateRefund } from '../src/modules/finance/refund.service';

function seedRequest(userId: string, role: UserRole, organizerId: string | null = null): Request {
  return {
    auth: { userId, role, organizerId, organizerStatus: organizerId ? 'ACTIVE' : null },
    ip: '127.0.0.1',
    get: () => undefined,
  } as unknown as Request;
}
export async function seedDashboard() {
  if (env.isProduction) throw new Error('Akun dan transaksi demo tidak boleh dibuat di production');
  const passwordHash = await hashPassword('admin123');
  const users = [];
  for (const [name, email, role] of [
    ['GOFEST Superadmin', 'superadmin@gofest.com', 'SUPERADMIN'],
    ['GOFEST Admin', 'admin@gofest.com', 'ADMIN'],
    ['GOFEST Creator', 'organizer@gofest.com', 'CREATOR'],
  ] as const) {
    users.push(
      await prisma.user.upsert({
        where: { email },
        create: { name, email, role, passwordHash, emailVerifiedAt: new Date() },
        update: { name, role, passwordHash, status: 'ACTIVE', emailVerifiedAt: new Date() },
      }),
    );
  }
  const [superadmin, admin, creator] = users;
  if (!superadmin || !admin || !creator) throw new Error('Akun demo tidak lengkap');
  const profile = await prisma.organizerProfile.upsert({
    where: { userId: creator.id },
    update: { status: 'ACTIVE' },
    create: {
      userId: creator.id,
      organizationName: 'GOFEST Demo Organizer',
      slug: 'gofest-demo-organizer',
      status: 'ACTIVE',
      description: 'Organizer development untuk pengujian dashboard dan workflow internal.',
    },
  });
  await prisma.organizerWallet.upsert({
    where: { organizerId: profile.id },
    create: { organizerId: profile.id },
    update: {},
  });
  for (const [key, value] of [
    ['platform_fee_type', 'percentage'],
    ['platform_fee_value', 5],
    ['minimum_withdrawal', 50_000],
    ['platform_name', 'GOFEST'],
  ] as const) {
    await prisma.platformSetting.upsert({ where: { key }, create: { key, value }, update: {} });
  }
  const category = await prisma.eventCategory.findFirstOrThrow({ where: { isActive: true } });
  const existingCover = await prisma.event.findFirst({
    where: { coverKey: { not: null } },
    select: { coverKey: true },
  });
  const demoEvents = [];
  const eventDefinitions = [
    ['gofest-demo-live', 'GOFEST Demo · Live Session', 'PUBLISHED'],
    ['gofest-demo-workshop', 'GOFEST Demo · Workshop Produksi Event', 'PUBLISHED'],
    ['gofest-demo-review', 'GOFEST Demo · Menunggu Review', 'PENDING_REVIEW'],
    ['gofest-demo-draft', 'GOFEST Demo · Rencana Festival', 'DRAFT'],
    ['gofest-demo-revision', 'GOFEST Demo · Revisi Lokasi', 'NEEDS_REVISION'],
    ['gofest-demo-approved', 'GOFEST Demo · Sudah Disetujui', 'APPROVED'],
    ['gofest-demo-rejected', 'GOFEST Demo · Pengajuan Ditolak', 'REJECTED'],
  ] as const;
  for (const [index, [slug, title, status]] of eventDefinitions.entries()) {
    const startsAt = new Date(Date.now() + (14 + index * 3) * 86400000);
    const event = await prisma.event.upsert({
      where: { slug },
      update: {},
      create: {
        organizerId: profile.id,
        categoryId: category.id,
        slug,
        title,
        summary: 'Data demo untuk menguji dashboard operasional dan finansial GOFEST.',
        description:
          'Event development yang digunakan untuk menguji penjualan tiket, review event, check-in, dan reservasi withdrawal. Seluruh pembayaran menggunakan simulasi internal.',
        venueName: 'GOFEST Demo Hall',
        address: 'Lokasi demonstrasi, bukan acara publik sungguhan',
        city: 'Jakarta',
        startsAt,
        endsAt: new Date(startsAt.getTime() + 3 * 3600000),
        salesStartAt: new Date(Date.now() - 30 * 86400000),
        salesEndAt: startsAt,
        status,
        isDemo: true,
        coverKey: existingCover?.coverKey,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
        reviewNote:
          status === 'NEEDS_REVISION'
            ? 'Lengkapi rincian lokasi dan kapasitas venue.'
            : status === 'REJECTED'
              ? 'Informasi penyelenggara pada pengajuan belum lengkap.'
              : null,
      },
    });
    demoEvents.push(event);
    for (const [ticketIndex, name, price] of [
      [0, 'Reguler', 150_000],
      [1, 'VIP', 250_000],
    ] as const) {
      const id = `demo-ticket-${event.id}-${ticketIndex}`;
      await prisma.ticketType.upsert({
        where: { id },
        update: {},
        create: { id, eventId: event.id, name, price, quotaTotal: 100, maxPerOrder: 5 },
      });
    }
  }
  const customerHash = await hashPassword('CustomerDemo123!');
  const customers = [];
  for (const [index, name] of ['Alya Putri', 'Bima Pratama', 'Citra Lestari'].entries()) {
    customers.push(
      await prisma.user.upsert({
        where: { email: `customer${index + 1}@demo.gofest.local` },
        update: {},
        create: {
          name,
          email: `customer${index + 1}@demo.gofest.local`,
          passwordHash: customerHash,
          emailVerifiedAt: new Date(),
        },
      }),
    );
  }
  const paidOrders = [];
  for (let index = 0; index < 5; index++) {
    const customer = customers[index % customers.length]!;
    const event = demoEvents[index === 4 ? 1 : 0]!;
    const ticketTypeId = `demo-ticket-${event.id}-${index === 1 ? 1 : 0}`;
    const key = `gofest-dashboard-order-${index}`;
    const previous = await prisma.order.findUnique({ where: { idempotencyKey: key } });
    if (previous) {
      if (index !== 3) paidOrders.push(previous);
      continue;
    }
    const quantity = index === 0 || index === 2 ? 2 : 1;
    const input = createOrderSchema.parse({
      eventId: event.id,
      buyerName: customer.name,
      buyerEmail: customer.email,
      buyerPhone: '+6281234567890',
      buyerIdentityType: 'KTP',
      buyerIdentityNumber: '3171000000000001',
      items: [{ ticketTypeId, quantity }],
      attendees: Array.from({ length: quantity }, (_, position) => ({
        ticketTypeId,
        position,
        name: customer.name,
        email: customer.email,
        phone: '+6281234567890',
        identityType: 'KTP',
        identityNumber: '3171000000000001',
        gender: 'MALE',
        birthDate: '1995-01-01',
      })),
      acceptTerms: true,
      idempotencyKey: key,
    });
    const created = await createOrder(input, seedRequest(customer.id, 'USER'));
    const order = created.order;
    if (index === 3) {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: 'mock',
          providerReference: `MOCK-${order.orderCode}`,
          amount: order.total,
          status: 'PENDING',
          expiresAt: new Date(order.expiresAt),
        },
      });
      continue;
    }
    const paidAt = new Date(Date.now() - (5 - index) * 86400000);
    await fulfillOrder(order.id, {
      provider: 'mock',
      providerReference: `MOCK-${order.orderCode}`,
      amount: order.total,
      currency: 'IDR',
      paidAt,
      raw: { simulated: true, seed: 'dashboard' },
      allowUnreserved: false,
    });
    await prisma.$transaction([
      prisma.order.update({ where: { id: order.id }, data: { createdAt: paidAt } }),
      prisma.financialLedger.updateMany({
        where: { orderId: order.id },
        data: { createdAt: paidAt },
      }),
    ]);
    paidOrders.push(await prisma.order.findUniqueOrThrow({ where: { id: order.id } }));
  }
  const creatorReq = seedRequest(creator.id, 'CREATOR', profile.id);
  const adminReq = seedRequest(admin.id, 'ADMIN');
  const bank = await addBank(
    profile.id,
    {
      bankName: 'Bank Demo',
      accountHolder: 'GOFEST Demo Organizer',
      accountNumber: '123456789012',
    },
    creatorReq,
  );
  for (const [index, status] of ['PENDING', 'APPROVED', 'REJECTED'].entries()) {
    const idempotencyKey = `gofest-demo-withdrawal-${index}`;
    if (await prisma.payoutRequest.findUnique({ where: { idempotencyKey } })) continue;
    const payout = await requestPayout(
      profile.id,
      { bankAccountId: bank.id, amount: 100_000, idempotencyKey },
      creatorReq,
    );
    if (status !== 'PENDING')
      await reviewPayout(
        payout.id,
        {
          status: status as 'APPROVED' | 'REJECTED',
          note:
            status === 'APPROVED'
              ? 'Disetujui internal; menunggu integrasi payout provider.'
              : 'Simulasi penolakan untuk memeriksa pengembalian reservasi.',
        },
        adminReq,
      );
  }
  if (
    paidOrders[1] &&
    !(await prisma.refund.findUnique({ where: { idempotencyKey: 'gofest-demo-refund-1' } }))
  ) {
    const refund = await requestRefund(
      {
        orderId: paidOrders[1].id,
        ticketAmount: 50_000,
        feeAmount: 2_500,
        reason: 'Simulasi refund parsial untuk demonstrasi pencatatan keuangan.',
        idempotencyKey: 'gofest-demo-refund-1',
      },
      adminReq,
    );
    await reviewRefund(
      refund.id,
      { status: 'APPROVED', note: 'Simulasi development sesuai alokasi refund.' },
      adminReq,
    );
    await simulateRefund(refund.id, adminReq);
  }
  if (
    paidOrders[0] &&
    !(await prisma.refund.findUnique({ where: { idempotencyKey: 'gofest-demo-refund-2' } }))
  ) {
    await requestRefund(
      {
        orderId: paidOrders[0].id,
        ticketAmount: 25_000,
        feeAmount: 0,
        reason: 'Permintaan demo yang masih menunggu tinjauan admin.',
        idempotencyKey: 'gofest-demo-refund-2',
      },
      adminReq,
    );
  }
  const firstEvent = demoEvents[0]!;
  await prisma.eventStaff.upsert({
    where: { eventId_userId: { eventId: firstEvent.id, userId: customers[0]!.id } },
    create: { eventId: firstEvent.id, userId: customers[0]!.id },
    update: {},
  });
  const firstTicket = await prisma.ticket.findFirst({
    where: { eventId: firstEvent.id },
    orderBy: { createdAt: 'asc' },
  });
  if (
    firstTicket &&
    !(await prisma.checkInLog.findUnique({
      where: { idempotencyKey: 'gofest-demo-checkin-valid' },
    }))
  ) {
    await prisma.$transaction([
      prisma.ticket.update({
        where: { id: firstTicket.id },
        data: {
          status: 'CHECKED_IN',
          checkedInAt: new Date(),
          checkedInByUserId: customers[0]!.id,
        },
      }),
      prisma.checkInLog.create({
        data: {
          eventId: firstEvent.id,
          ticketId: firstTicket.id,
          staffId: customers[0]!.id,
          result: 'VALID',
          gate: 'Gate Demo',
          idempotencyKey: 'gofest-demo-checkin-valid',
        },
      }),
      prisma.checkInLog.create({
        data: {
          eventId: firstEvent.id,
          ticketId: firstTicket.id,
          staffId: customers[0]!.id,
          result: 'ALREADY_USED',
          gate: 'Gate Demo',
          idempotencyKey: 'gofest-demo-checkin-duplicate',
        },
      }),
    ]);
  }
  console.log(
    'Dashboard demo: superadmin@gofest.com, admin@gofest.com, organizer@gofest.com (password development: admin123).',
  );
}
