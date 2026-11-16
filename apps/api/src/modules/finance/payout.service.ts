import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import type { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { writeAudit } from '../../lib/audit';
import { BadRequestError, ConflictError, NotFoundError } from '../../lib/errors';
import { getPlatformSettings } from '../settings/settings.service';
import { reserveFunds } from './ledger.service';
import type { bankSchema, payoutSchema, payoutReviewSchema, ListQuery } from './finance.schemas';
import { notifyAdmins, notifyUser } from '../notifications/inbox.service';
import { payoutProvider } from './payout.provider';
import { moneyNumber } from './money';

export const maskAccountNumber = (value: string) => `•••• ${value.slice(-4)}`;
export const bankSelect = {
  id: true,
  bankName: true,
  accountHolder: true,
  accountNumber: true,
  isActive: true,
} as const;
export const maskBank = <T extends { accountNumber: string }>(bank: T) => ({
  ...bank,
  accountNumber: maskAccountNumber(bank.accountNumber),
});

export async function listBanks(organizerId: string) {
  return (
    await prisma.bankAccount.findMany({
      where: { organizerId, isActive: true },
      select: bankSelect,
    })
  ).map(maskBank);
}
export async function addBank(
  organizerId: string,
  input: z.infer<typeof bankSchema>,
  req: Request,
) {
  return prisma.$transaction(async (tx) => {
    const bank = await tx.bankAccount.upsert({
      where: {
        organizerId_bankName_accountNumber: {
          organizerId,
          bankName: input.bankName,
          accountNumber: input.accountNumber,
        },
      },
      create: { ...input, organizerId },
      update: { accountHolder: input.accountHolder, isActive: true },
      select: bankSelect,
    });
    await writeAudit(
      {
        actorUserId: req.auth!.userId,
        action: 'BANK_ACCOUNT_SAVED',
        resourceType: 'BANK_ACCOUNT',
        resourceId: bank.id,
        metadata: { bankName: bank.bankName, lastFour: bank.accountNumber.slice(-4) },
        req,
      },
      tx,
    );
    return maskBank(bank);
  });
}

export async function removeBank(organizerId: string, id: string, req: Request) {
  return prisma.$transaction(async (tx) => {
    const bank = await tx.bankAccount.findFirst({ where: { id, organizerId, isActive: true } });
    if (!bank) throw new NotFoundError('Rekening tidak ditemukan');
    await tx.bankAccount.update({ where: { id }, data: { isActive: false } });
    await writeAudit(
      {
        actorUserId: req.auth!.userId,
        action: 'BANK_ACCOUNT_DEACTIVATED',
        resourceType: 'BANK_ACCOUNT',
        resourceId: id,
        req,
      },
      tx,
    );
    return { removed: true };
  });
}

const payoutInclude = {
  organizer: { select: { organizationName: true, userId: true } },
  reviewedBy: { select: { id: true, name: true } },
  transactions: { orderBy: { createdAt: 'asc' as const } },
};
function presentPayout<T extends { bankSnapshot: Prisma.JsonValue }>(payout: T) {
  const snapshot = payout.bankSnapshot as {
    bankName: string;
    accountHolder: string;
    accountNumber: string;
  };
  return {
    ...payout,
    bankSnapshot: maskBank(snapshot),
    providerMessage:
      'Workflow internal. Belum ada transfer dana; persetujuan menunggu integrasi payout provider.',
  };
}
export async function listPayouts(query: ListQuery, organizerId?: string) {
  const statuses = [
    'PENDING',
    'APPROVED',
    'REJECTED',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
  ] as const;
  if (query.status && !statuses.includes(query.status as (typeof statuses)[number]))
    throw new BadRequestError('Status payout tidak valid');
  const where: Prisma.PayoutRequestWhereInput = {
    ...(organizerId ? { organizerId } : {}),
    ...(query.status ? { status: query.status as (typeof statuses)[number] } : {}),
    ...(query.q
      ? {
          OR: [
            { id: { contains: query.q, mode: 'insensitive' } },
            { organizer: { organizationName: { contains: query.q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.payoutRequest.count({ where }),
    prisma.payoutRequest.findMany({
      where,
      include: payoutInclude,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return {
    data: rows.map(presentPayout),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}
export async function getPayout(id: string, organizerId?: string) {
  const row = await prisma.payoutRequest.findFirst({
    where: { id, ...(organizerId ? { organizerId } : {}) },
    include: payoutInclude,
  });
  if (!row) throw new NotFoundError('Permintaan payout tidak ditemukan');
  const wallet = await prisma.organizerWallet.findUnique({
    where: { organizerId: row.organizerId },
  });
  return {
    ...presentPayout(row),
    wallet: wallet
      ? {
          ...wallet,
          available: moneyNumber(wallet.available),
          reserved: moneyNumber(wallet.reserved),
          pending: moneyNumber(wallet.pending),
          withdrawn: moneyNumber(wallet.withdrawn),
        }
      : null,
  };
}
export async function requestPayout(
  organizerId: string,
  input: z.infer<typeof payoutSchema>,
  req: Request,
) {
  const settings = await getPlatformSettings();
  const replay = async () => {
    const existing = await prisma.payoutRequest.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (!existing) return null;
    if (
      existing.organizerId !== organizerId ||
      existing.amount !== input.amount ||
      existing.bankAccountId !== input.bankAccountId
    ) {
      throw new ConflictError('Idempotency key sudah digunakan untuk permintaan lain');
    }
    return getPayout(existing.id, organizerId);
  };
  const existing = await replay();
  if (existing) return existing;
  if (input.amount < settings.minimumWithdrawal)
    throw new BadRequestError(
      `Minimum withdrawal Rp${settings.minimumWithdrawal.toLocaleString('id-ID')}`,
    );
  let id: string;
  try {
    id = await prisma.$transaction(async (tx) => {
      const bank = await tx.bankAccount.findFirst({
        where: { id: input.bankAccountId, organizerId, isActive: true },
      });
      if (!bank) throw new NotFoundError('Rekening aktif milik organizer tidak ditemukan');
      // The unique insert waits for concurrent retries before any wallet mutation.
      const inserted = await tx.payoutRequest.createMany({
        data: [
          {
            organizerId,
            bankAccountId: bank.id,
            amount: input.amount,
            idempotencyKey: input.idempotencyKey,
            bankSnapshot: {
              bankName: bank.bankName,
              accountHolder: bank.accountHolder,
              accountNumber: bank.accountNumber,
            },
          },
        ],
        skipDuplicates: true,
      });
      const payout = await tx.payoutRequest.findUniqueOrThrow({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (!inserted.count) {
        if (
          payout.organizerId !== organizerId ||
          payout.amount !== input.amount ||
          payout.bankAccountId !== bank.id
        )
          throw new ConflictError('Idempotency key sudah digunakan untuk permintaan lain');
        return payout.id;
      }
      await reserveFunds(tx, organizerId, input.amount);
      await tx.financialLedger.create({
        data: {
          organizerId,
          payoutId: payout.id,
          transactionType: 'PAYOUT_RESERVED',
          debit: 'ORGANIZER_AVAILABLE',
          credit: 'ORGANIZER_RESERVED',
          amount: input.amount,
          referenceId: `reserve:${payout.id}`,
          description: 'Reservasi permintaan withdrawal internal',
        },
      });
      await tx.payoutTransaction.create({
        data: {
          payoutId: payout.id,
          provider: payoutProvider.name,
          status: 'PENDING',
          idempotencyKey: `request:${payout.id}`,
        },
      });
      await writeAudit(
        {
          actorUserId: req.auth!.userId,
          action: 'PAYOUT_REQUESTED',
          resourceType: 'PAYOUT',
          resourceId: payout.id,
          metadata: { amount: input.amount },
          req,
        },
        tx,
      );
      await notifyAdmins(tx, {
        category: 'PAYOUT',
        title: 'Permintaan withdrawal baru',
        message: `Withdrawal Rp${input.amount.toLocaleString('id-ID')} menunggu review.`,
        href: '/admin/payouts',
      });
      return payout.id;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const duplicate = await replay();
      if (duplicate) return duplicate;
    }
    throw error;
  }
  return getPayout(id, organizerId);
}
export async function reviewPayout(
  id: string,
  input: z.infer<typeof payoutReviewSchema>,
  req: Request,
) {
  await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM payout_requests WHERE id = ${id} FOR UPDATE`;
    if (!rows.length) throw new NotFoundError('Permintaan payout tidak ditemukan');
    const payout = await tx.payoutRequest.findUniqueOrThrow({ where: { id } });
    if (payout.status === input.status) return;
    if (payout.status !== 'PENDING')
      throw new ConflictError('Payout sudah ditinjau', 'PAYOUT_ALREADY_REVIEWED');
    const rejected = input.status === 'REJECTED';
    if (rejected) {
      const released = await tx.organizerWallet.updateMany({
        where: { organizerId: payout.organizerId, reserved: { gte: payout.amount } },
        data: { reserved: { decrement: payout.amount }, available: { increment: payout.amount } },
      });
      if (!released.count) throw new ConflictError('Reservasi saldo tidak konsisten');
    }
    await tx.payoutRequest.update({
      where: { id },
      data: { ...input, reviewedByUserId: req.auth!.userId, reviewedAt: new Date() },
    });
    await tx.payoutTransaction.create({
      data: {
        payoutId: id,
        provider: payoutProvider.name,
        status: input.status,
        idempotencyKey: `review:${id}`,
        note: input.note,
      },
    });
    await tx.financialLedger.create({
      data: {
        organizerId: payout.organizerId,
        payoutId: id,
        transactionType: rejected ? 'PAYOUT_RELEASED' : 'PAYOUT_APPROVED',
        debit: 'ORGANIZER_RESERVED',
        credit: rejected ? 'ORGANIZER_AVAILABLE' : 'ORGANIZER_RESERVED',
        amount: payout.amount,
        referenceId: `review:${id}`,
        description: rejected
          ? 'Reservasi dilepas setelah penolakan'
          : 'Persetujuan internal; saldo tetap direservasi, menunggu payout provider',
      },
    });
    await writeAudit(
      {
        actorUserId: req.auth!.userId,
        action: `PAYOUT_${input.status}`,
        resourceType: 'PAYOUT',
        resourceId: id,
        metadata: { amount: payout.amount, note: input.note },
        req,
      },
      tx,
    );
    const organizer = await tx.organizerProfile.findUniqueOrThrow({
      where: { id: payout.organizerId },
    });
    await notifyUser(tx, {
      category: 'PAYOUT',
      userId: organizer.userId,
      title: `Withdrawal ${input.status === 'APPROVED' ? 'disetujui' : 'ditolak'}`,
      message: rejected
        ? input.note
        : 'Disetujui secara internal. Menunggu integrasi payout provider; belum ada transfer.',
      href: '/creator/payouts',
    });
  });
  return getPayout(id);
}
