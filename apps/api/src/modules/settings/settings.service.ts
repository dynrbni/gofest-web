import type { Request } from 'express';
import type { PlatformFeeType } from '@gofest/shared';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { writeAudit } from '../../lib/audit';
import { BadRequestError } from '../../lib/errors';
import type { Prisma } from '@prisma/client';

export interface PlatformSettings {
  platformFeeType: PlatformFeeType;
  platformFeeValue: number;
  orderReservationMinutes: number;
  eventReviewRequired: boolean;
  minimumWithdrawal: number;
  platformName: string;
  platformLogo: string;
  contactEmail: string;
  contactPhone: string;
  notificationsEnabled: boolean;
}

const KEYS = {
  platformFeeType: 'platform_fee_type',
  platformFeeValue: 'platform_fee_value',
  orderReservationMinutes: 'order_reservation_minutes',
  eventReviewRequired: 'event_review_required',
  minimumWithdrawal: 'minimum_withdrawal',
  platformName: 'platform_name',
  platformLogo: 'platform_logo',
  contactEmail: 'contact_email',
  contactPhone: 'contact_phone',
  notificationsEnabled: 'notifications_enabled',
} as const;

const defaults: PlatformSettings = {
  platformFeeType: env.PLATFORM_FEE_TYPE,
  platformFeeValue: env.PLATFORM_FEE_VALUE,
  orderReservationMinutes: env.ORDER_RESERVATION_MINUTES,
  eventReviewRequired: env.EVENT_REVIEW_REQUIRED,
  minimumWithdrawal: 50_000,
  platformName: 'GOFEST',
  platformLogo: '',
  contactEmail: '',
  contactPhone: '',
  notificationsEnabled: true,
};

export async function getPlatformSettings(
  db: Prisma.TransactionClient = prisma,
): Promise<PlatformSettings> {
  const rows = await db.platformSetting.findMany({
    where: { key: { in: Object.values(KEYS) } },
  });
  const values = new Map(rows.map((row) => [row.key, row.value]));

  const feeType = values.get(KEYS.platformFeeType);
  const feeValue = values.get(KEYS.platformFeeValue);
  const reservation = values.get(KEYS.orderReservationMinutes);
  const reviewRequired = values.get(KEYS.eventReviewRequired);

  return {
    ...defaults,
    ...Object.fromEntries(
      Object.entries(KEYS).flatMap(([field, key]) => {
        const value = values.get(key);
        return value !== undefined &&
          typeof value === typeof defaults[field as keyof PlatformSettings]
          ? [[field, value]]
          : [];
      }),
    ),
    platformFeeType:
      feeType === 'none' || feeType === 'fixed' || feeType === 'percentage'
        ? feeType
        : defaults.platformFeeType,
    platformFeeValue:
      typeof feeValue === 'number' && Number.isInteger(feeValue) && feeValue >= 0
        ? feeValue
        : defaults.platformFeeValue,
    orderReservationMinutes:
      typeof reservation === 'number' && Number.isInteger(reservation) && reservation >= 5
        ? reservation
        : defaults.orderReservationMinutes,
    eventReviewRequired:
      typeof reviewRequired === 'boolean' ? reviewRequired : defaults.eventReviewRequired,
  };
}

export async function updatePlatformSettings(input: Partial<PlatformSettings>, req: Request) {
  const entries = Object.entries(input).map(
    ([field, value]) => [KEYS[field as keyof PlatformSettings], value] as const,
  );

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(61001)`;
    const current = await getPlatformSettings(tx);
    const next = { ...current, ...input };
    if (next.platformFeeType === 'percentage' && next.platformFeeValue > 100)
      throw new BadRequestError('Biaya platform dalam persen tidak boleh melebihi 100');
    for (const [key, value] of entries) {
      await tx.platformSetting.upsert({
        where: { key },
        create: { key, value: value as never, updatedByUserId: req.auth?.userId ?? null },
        update: { value: value as never, updatedByUserId: req.auth?.userId ?? null },
      });
    }
    await writeAudit(
      {
        actorUserId: req.auth?.userId,
        action: 'PLATFORM_SETTINGS_UPDATED',
        resourceType: 'PLATFORM_SETTINGS',
        resourceId: 'global',
        metadata: { before: current, after: input },
        req,
      },
      tx,
    );
  });

  return getPlatformSettings();
}
