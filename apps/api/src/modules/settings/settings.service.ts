import type { Request } from 'express';
import type { PlatformFeeType } from '@gofest/shared';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { writeAudit } from '../../lib/audit';
import { BadRequestError } from '../../lib/errors';

export interface PlatformSettings {
  platformFeeType: PlatformFeeType;
  platformFeeValue: number;
  orderReservationMinutes: number;
  eventReviewRequired: boolean;
}

const KEYS = {
  platformFeeType: 'platform_fee_type',
  platformFeeValue: 'platform_fee_value',
  orderReservationMinutes: 'order_reservation_minutes',
  eventReviewRequired: 'event_review_required',
} as const;

const defaults: PlatformSettings = {
  platformFeeType: env.PLATFORM_FEE_TYPE,
  platformFeeValue: env.PLATFORM_FEE_VALUE,
  orderReservationMinutes: env.ORDER_RESERVATION_MINUTES,
  eventReviewRequired: env.EVENT_REVIEW_REQUIRED,
};

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const rows = await prisma.platformSetting.findMany({
    where: { key: { in: Object.values(KEYS) } },
  });
  const values = new Map(rows.map((row) => [row.key, row.value]));

  const feeType = values.get(KEYS.platformFeeType);
  const feeValue = values.get(KEYS.platformFeeValue);
  const reservation = values.get(KEYS.orderReservationMinutes);
  const reviewRequired = values.get(KEYS.eventReviewRequired);

  return {
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

export async function updatePlatformSettings(
  input: Partial<PlatformSettings>,
  req: Request,
) {
  if (
    input.platformFeeType === 'percentage' &&
    input.platformFeeValue !== undefined &&
    input.platformFeeValue > 100
  ) {
    throw new BadRequestError('Biaya platform dalam persen tidak boleh melebihi 100');
  }
  const entries: Array<[string, unknown]> = [];
  if (input.platformFeeType !== undefined) {
    entries.push([KEYS.platformFeeType, input.platformFeeType]);
  }
  if (input.platformFeeValue !== undefined) {
    entries.push([KEYS.platformFeeValue, input.platformFeeValue]);
  }
  if (input.orderReservationMinutes !== undefined) {
    entries.push([KEYS.orderReservationMinutes, input.orderReservationMinutes]);
  }
  if (input.eventReviewRequired !== undefined) {
    entries.push([KEYS.eventReviewRequired, input.eventReviewRequired]);
  }

  await prisma.$transaction(async (tx) => {
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
        metadata: input as Record<string, unknown>,
        req,
      },
      tx,
    );
  });

  return getPlatformSettings();
}
