import type { Prisma } from '@prisma/client';
import { ConflictError } from '../../lib/errors';

export async function postOrderPayment(tx: Prisma.TransactionClient, orderId: string) {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { event: true },
  });
  const organizerId = order.event.organizerId;
  const proceeds = order.subtotal - order.discount;
  const pending =
    order.status === 'PAYMENT_REVIEW' || (order.status === 'REFUND_PENDING' && !order.paidAt);
  // The unique reference and wallet update commit together, including on webhook retries.
  const posted = await tx.financialLedger.createMany({
    data: [
      {
        organizerId,
        orderId,
        transactionType: 'TICKET_SALE',
        debit: 'PAYMENT_CLEARING',
        credit: pending ? 'ORGANIZER_PENDING' : 'ORGANIZER_AVAILABLE',
        amount: proceeds,
        referenceId: `sale:${orderId}`,
        description: `Penjualan tiket ${order.orderCode}`,
      },
    ],
    skipDuplicates: true,
  });
  if (!posted.count) {
    const sale = await tx.financialLedger.findUniqueOrThrow({
      where: { referenceId: `sale:${orderId}` },
    });
    if (order.status === 'PAID' && sale.credit === 'ORGANIZER_PENDING') {
      const released = await tx.financialLedger.createMany({
        data: [
          {
            organizerId,
            orderId,
            transactionType: 'PROCEEDS_RELEASED',
            debit: 'ORGANIZER_PENDING',
            credit: 'ORGANIZER_AVAILABLE',
            amount: proceeds,
            referenceId: `settle:${orderId}`,
            description: 'Saldo review dilepas setelah tiket diterbitkan',
          },
        ],
        skipDuplicates: true,
      });
      if (released.count) {
        const moved = await tx.organizerWallet.updateMany({
          where: { organizerId, pending: { gte: proceeds } },
          data: { pending: { decrement: proceeds }, available: { increment: proceeds } },
        });
        if (!moved.count) throw new ConflictError('Saldo review tidak konsisten');
      }
    }
    return;
  }
  await tx.organizerWallet.upsert({
    where: { organizerId },
    create: { organizerId, ...(pending ? { pending: proceeds } : { available: proceeds }) },
    update: pending ? { pending: { increment: proceeds } } : { available: { increment: proceeds } },
  });
  if (order.platformFee > 0)
    await tx.financialLedger.create({
      data: {
        organizerId,
        orderId,
        transactionType: 'SERVICE_FEE',
        debit: 'PAYMENT_CLEARING',
        credit: 'PLATFORM_FEE_REVENUE',
        amount: order.platformFee,
        referenceId: `fee:${orderId}`,
        description: `Service fee ${order.orderCode}`,
      },
    });
}

export async function reserveFunds(
  tx: Prisma.TransactionClient,
  organizerId: string,
  amount: number,
) {
  const updated = await tx.organizerWallet.updateMany({
    where: { organizerId, available: { gte: amount } },
    data: { available: { decrement: amount }, reserved: { increment: amount } },
  });
  if (updated.count !== 1)
    throw new ConflictError('Saldo tersedia tidak mencukupi', 'INSUFFICIENT_BALANCE');
}
