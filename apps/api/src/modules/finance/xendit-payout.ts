import { z } from 'zod';
import { env } from '../../config/env';
import { BadRequestError } from '../../lib/errors';
import type { VerifyWebhookInput } from '../payments/payment.provider';
import { parseXenditWebhook, XenditApiError, xenditRequest } from '../payments/xendit.client';

export const xenditPayoutEnabled = env.XENDIT_PAYOUTS_ENABLED;
export const xenditPayoutReference = (id: string) => `gofest-payout-${id}`;

const bankCodes: Record<string, string> = {
  BCA: 'ID_BCA',
  BNI: 'ID_BNI',
  BRI: 'ID_BRI',
  MANDIRI: 'ID_MANDIRI',
  BSI: 'ID_BSI',
  CIMB: 'ID_CIMB',
  CIMBNIAGA: 'ID_CIMB',
  PERMATA: 'ID_PERMATA',
  BTN: 'ID_BTN',
  DANAMON: 'ID_DANAMON',
  BTPNSYARIAH: 'ID_BTPN_SYARIAH',
  JAGO: 'ID_JAGO',
  SEABANK: 'ID_SEABANK',
};

export function payoutBankCode(bankName: string) {
  const name = bankName
    .toUpperCase()
    .trim()
    .replace(/^(ID_|BANK\s+)/, '')
    .replace(/[^A-Z0-9]/g, '');
  const code = bankCodes[name];
  if (!code) {
    throw new BadRequestError(
      'Bank belum didukung. Pilih BCA, BNI, BRI, Mandiri, BSI, CIMB Niaga, Permata, BTN, Danamon, BTPN Syariah, Jago, atau SeaBank.',
    );
  }
  return code;
}

const payoutSchema = z.object({
  id: z.string().min(1),
  reference_id: z.string().min(1),
  amount: z.number().int().positive(),
  currency: z.literal('IDR'),
  status: z.enum([
    'ACCEPTED',
    'REQUESTED',
    'SUCCEEDED',
    'FAILED',
    'REVERSED',
    'CANCELLED',
    'CANCELED',
  ]),
  failure_code: z.string().nullish(),
});

export type XenditPayout = z.infer<typeof payoutSchema>;
export type XenditPayoutResult =
  | XenditPayout
  | (Omit<XenditPayout, 'id'> & {
      id: null;
      status: 'FAILED';
      failure_code: string;
    });
const rejectedTransferCodes = new Set([
  'CHANNEL_CODE_NOT_SUPPORTED',
  'MINIMUM_TRANSFER_LIMIT_ERROR',
  'MAXIMUM_TRANSFER_LIMIT_ERROR',
  'AMOUNT_INCREMENT_NOT_SUPPORTED',
  'RECIPIENT_ACCOUNT_NUMBER_ERROR',
]);
type Destination = { bankName: string; accountHolder: string; accountNumber: string };

export function readPayoutBank(snapshot: unknown): Destination {
  return z
    .object({
      bankName: z.string(),
      accountHolder: z.string(),
      accountNumber: z.string(),
    })
    .parse(snapshot);
}

export async function submitXenditPayout(
  id: string,
  amount: number,
  destination: Destination,
): Promise<XenditPayoutResult> {
  const referenceId = xenditPayoutReference(id);
  const lookup = async () => {
    const result = await xenditRequest(
      `/v2/payouts?reference_id=${encodeURIComponent(referenceId)}`,
      z.object({ data: z.array(payoutSchema), has_more: z.boolean().optional() }),
    );
    if (result.has_more || result.data.length > 1) {
      throw new XenditApiError(502, 'PAYOUT_REFERENCE_COLLISION');
    }
    return result.data[0];
  };
  const existing = await lookup();
  if (existing) return existing;

  try {
    return await xenditRequest('/v2/payouts', payoutSchema, {
      idempotencyKey: referenceId,
      body: {
        reference_id: referenceId,
        amount,
        currency: 'IDR',
        channel_code: payoutBankCode(destination.bankName),
        channel_properties: {
          account_number: destination.accountNumber,
          account_holder_name: destination.accountHolder,
        },
        description: 'Payout GoFest',
      },
    });
  } catch (error) {
    if (error instanceof XenditApiError && error.code === 'DUPLICATE_ERROR') {
      const replay = await lookup();
      if (replay) return replay;
    }
    if (
      error instanceof XenditApiError &&
      error.status === 400 &&
      error.code &&
      rejectedTransferCodes.has(error.code)
    ) {
      const replay = await lookup();
      if (replay) return replay;
      return {
        id: null,
        reference_id: referenceId,
        amount,
        currency: 'IDR',
        status: 'FAILED',
        failure_code: error.code,
      };
    }
    throw error;
  }
}

export function fetchXenditPayout(providerReference: string) {
  return xenditRequest(`/v2/payouts/${encodeURIComponent(providerReference)}`, payoutSchema);
}

const payoutEvents = new Map([
  ['payout.succeeded', 'SUCCEEDED'],
  ['payout.failed', 'FAILED'],
  ['payout.reversed', 'REVERSED'],
]);

export function readPayoutWebhook(input: VerifyWebhookInput) {
  const webhook = parseXenditWebhook(input);
  const status = payoutEvents.get(webhook.event);
  if (!status) return null;
  const identity = z.object({ reference_id: z.string() }).safeParse(webhook.data);
  if (!identity.success)
    throw new BadRequestError('Referensi webhook payout Xendit tidak ditemukan');
  if (!identity.data.reference_id.startsWith(xenditPayoutReference(''))) return null;
  const result = payoutSchema.safeParse(webhook.data);
  if (!result.success || result.data.status !== status) {
    throw new BadRequestError('Status webhook payout Xendit tidak valid');
  }
  return result.data;
}
