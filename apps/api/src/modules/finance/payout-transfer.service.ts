import type { PayoutStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { BadRequestError, ConflictError } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { notifyUser } from '../notifications/inbox.service';
import type { VerifyWebhookInput } from '../payments/payment.provider';
import { XenditApiError } from '../payments/xendit.client';
import {
  fetchXenditPayout,
  readPayoutBank,
  readPayoutWebhook,
  submitXenditPayout,
  xenditPayoutEnabled,
  xenditPayoutReference,
  type XenditPayoutResult,
} from './xendit-payout';

const reviewKey = (id: string) => `review:${id}`;
const transferKey = (id: string) => `transfer:${id}`;
const payoutPrefix = xenditPayoutReference('');

function payoutStatus(status: XenditPayoutResult['status']): PayoutStatus {
  if (status === 'SUCCEEDED') return 'COMPLETED';
  if (status === 'ACCEPTED' || status === 'REQUESTED') return 'PROCESSING';
  return 'FAILED';
}

async function applyPayoutResult(result: XenditPayoutResult) {
  if (!result.reference_id.startsWith(payoutPrefix)) return { ignored: true };
  const id = result.reference_id.slice(payoutPrefix.length);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM payout_requests WHERE id = ${id} FOR UPDATE`;
    const payout = await tx.payoutRequest.findUnique({
      where: { id },
      include: { organizer: { select: { userId: true } } },
    });
    const review = await tx.payoutTransaction.findUnique({
      where: { idempotencyKey: reviewKey(id) },
    });
    if (!payout || review?.status !== 'APPROVED' || review.provider !== 'XENDIT') {
      return { ignored: true };
    }
    const transfer = await tx.payoutTransaction.findUnique({
      where: { idempotencyKey: transferKey(id) },
    });
    if (transfer?.providerReference && !result.id) return { duplicate: true };
    if (payout.amount !== result.amount || (transfer && transfer.providerReference !== result.id)) {
      throw new BadRequestError('Referensi atau nominal payout Xendit tidak sesuai');
    }

    const next = payoutStatus(result.status);
    const reversed = result.status === 'REVERSED';
    if (payout.status === 'FAILED' || (payout.status === 'COMPLETED' && !reversed)) {
      return { duplicate: true };
    }

    if (next !== 'PROCESSING') {
      const from = payout.status === 'COMPLETED' ? 'withdrawn' : 'reserved';
      const to = next === 'COMPLETED' ? 'withdrawn' : 'available';
      const changed = await tx.organizerWallet.updateMany({
        where: { organizerId: payout.organizerId, [from]: { gte: payout.amount } },
        data: { [from]: { decrement: payout.amount }, [to]: { increment: payout.amount } },
      });
      if (!changed.count) throw new ConflictError('Saldo payout tidak konsisten');
      await tx.financialLedger.create({
        data: {
          organizerId: payout.organizerId,
          payoutId: id,
          transactionType: reversed
            ? 'PAYOUT_REVERSED'
            : next === 'COMPLETED'
              ? 'PAYOUT_COMPLETED'
              : 'PAYOUT_RELEASED',
          debit: from === 'withdrawn' ? 'ORGANIZER_WITHDRAWN' : 'ORGANIZER_RESERVED',
          credit: next === 'COMPLETED' ? 'ORGANIZER_WITHDRAWN' : 'ORGANIZER_AVAILABLE',
          amount: payout.amount,
          referenceId: `xendit:${id}:${result.status}`,
          description: `Payout Xendit ${result.id ?? result.failure_code}`,
        },
      });
      await notifyUser(tx, {
        userId: payout.organizer.userId,
        category: 'PAYOUT',
        title: next === 'COMPLETED' ? 'Withdrawal berhasil' : 'Saldo withdrawal dikembalikan',
        message:
          next === 'COMPLETED'
            ? 'Xendit mengonfirmasi dana sudah ditransfer.'
            : 'Dana sudah kembali ke saldo tersedia.',
        href: '/creator/payouts',
      });
    }
    await tx.payoutRequest.update({ where: { id }, data: { status: next } });
    const note = result.failure_code ?? (reversed ? 'REVERSED' : null);
    await tx.payoutTransaction.upsert({
      where: { idempotencyKey: transferKey(id) },
      create: {
        payoutId: id,
        provider: 'XENDIT',
        providerReference: result.id,
        idempotencyKey: transferKey(id),
        status: next,
        note,
      },
      update: { status: next, note },
    });
    return { processed: true };
  });
}

export async function handlePayoutWebhook(input: VerifyWebhookInput) {
  const result = readPayoutWebhook(input);
  return result ? applyPayoutResult(result) : { ignored: true };
}

export async function dispatchApprovedPayout(id: string) {
  if (!xenditPayoutEnabled) return;
  const payout = await prisma.payoutRequest.findUnique({
    where: { id },
    include: { transactions: { where: { provider: 'XENDIT' } } },
  });
  if (!payout || !['APPROVED', 'PROCESSING'].includes(payout.status)) return;
  const approval = payout.transactions.find((entry) => entry.idempotencyKey === reviewKey(id));
  if (approval?.status !== 'APPROVED') return;
  const transfer = payout.transactions.find((entry) => entry.idempotencyKey === transferKey(id));
  try {
    const result = transfer?.providerReference
      ? await fetchXenditPayout(transfer.providerReference)
      : await submitXenditPayout(id, payout.amount, readPayoutBank(payout.bankSnapshot));
    if (result.reference_id !== xenditPayoutReference(id)) {
      throw new XenditApiError(502, 'PAYOUT_REFERENCE_MISMATCH');
    }
    await applyPayoutResult(result);
  } catch (error) {
    // Unknown submission outcomes stay reserved and are retried by the worker with the same key.
    logger.warn(
      { payoutId: id, code: error instanceof XenditApiError ? error.code : undefined },
      'Sinkronisasi payout Xendit akan dicoba lagi',
    );
    await prisma.payoutRequest.updateMany({
      where: { id, status: payout.status, updatedAt: payout.updatedAt },
      data: { updatedAt: new Date() },
    });
  }
}

export async function processXenditPayouts() {
  if (!xenditPayoutEnabled) return;
  const payouts = await prisma.payoutRequest.findMany({
    where: {
      status: { in: ['APPROVED', 'PROCESSING'] },
      transactions: { some: { provider: 'XENDIT', status: 'APPROVED' } },
    },
    orderBy: { updatedAt: 'asc' },
    select: { id: true },
    take: 8,
  });
  await Promise.all(payouts.map(({ id }) => dispatchApprovedPayout(id)));
}
