import { z } from 'zod';
import { env } from '../../config/env';
import { safeCompare } from '../../lib/crypto';
import { BadRequestError, ForbiddenError, ServiceUnavailableError } from '../../lib/errors';
import type { VerifyWebhookInput } from './payment.provider';

export class XenditApiError extends Error {
  constructor(
    readonly status: number,
    readonly code?: string,
  ) {
    super('Xendit API request failed');
  }
}

export async function xenditRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  input?: { body: object; idempotencyKey?: string },
): Promise<T> {
  if (!env.XENDIT_SECRET_API_KEY) throw new ServiceUnavailableError('Xendit belum dikonfigurasi');
  const response = await fetch(`https://api.xendit.co${path}`, {
    method: input ? 'POST' : 'GET',
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.XENDIT_SECRET_API_KEY}:`).toString('base64')}`,
      Accept: 'application/json',
      ...(input ? { 'Content-Type': 'application/json' } : {}),
      ...(input?.idempotencyKey ? { 'idempotency-key': input.idempotencyKey } : {}),
    },
    body: input ? JSON.stringify(input.body) : undefined,
    signal: AbortSignal.timeout(8000),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = z.object({ error_code: z.string().optional() }).safeParse(payload);
    throw new XenditApiError(response.status, error.data?.error_code);
  }
  const result = schema.safeParse(payload);
  if (!result.success) throw new XenditApiError(502, 'INVALID_RESPONSE');
  return result.data;
}

const webhookEnvelope = z.object({
  event: z.string(),
  created: z.string().datetime({ offset: true }).optional(),
  data: z.unknown(),
});

export function parseXenditWebhook({ headers, rawBody }: VerifyWebhookInput) {
  const token = headers['x-callback-token'];
  if (
    !env.XENDIT_WEBHOOK_TOKEN ||
    typeof token !== 'string' ||
    !safeCompare(token, env.XENDIT_WEBHOOK_TOKEN)
  ) {
    throw new ForbiddenError('Token webhook Xendit tidak valid');
  }
  try {
    return webhookEnvelope.parse(JSON.parse(rawBody.toString('utf8')));
  } catch {
    throw new BadRequestError('Payload webhook Xendit tidak valid');
  }
}
