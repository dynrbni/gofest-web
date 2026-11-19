import { z } from 'zod';
import { env } from '../../config/env';
import { BadRequestError, ServiceUnavailableError } from '../../lib/errors';
import { logger } from '../../lib/logger';
import type {
  CreatePaymentInput,
  PaymentProvider,
  PaymentStatusResult,
  VerifiedPaymentEvent,
  VerifyWebhookInput,
} from './payment.provider';
import { parseXenditWebhook, XenditApiError, xenditRequest } from './xendit.client';

const sessionSchema = z.object({
  payment_session_id: z.string(),
  reference_id: z.string(),
  status: z.string(),
  currency: z.string(),
  amount: z.number().int().positive(),
  updated: z.string().datetime({ offset: true }).optional(),
  payment_id: z.string().nullish(),
  payment_request_id: z.string().nullish(),
});

const createdSessionSchema = sessionSchema.extend({
  components_sdk_key: z.string().min(1),
  expires_at: z.string().datetime({ offset: true }),
});

function sessionPaymentEvent(session: z.infer<typeof sessionSchema>): VerifiedPaymentEvent | null {
  const status =
    session.status === 'COMPLETED'
      ? 'PAID'
      : ['EXPIRED', 'CANCELED', 'CANCELLED'].includes(session.status)
        ? 'EXPIRED'
        : null;
  if (!status) return null;
  return {
    providerEventId: `${session.payment_session_id}:${status}`,
    providerReference: session.payment_session_id,
    orderCode: session.reference_id,
    amount: session.amount,
    currency: session.currency,
    status,
    paidAt: status === 'PAID' && session.updated ? new Date(session.updated) : null,
    raw: session,
  };
}

export class XenditPaymentProvider implements PaymentProvider {
  readonly name = 'xendit';

  async createPayment(input: CreatePaymentInput) {
    const web = new URL(env.WEB_URL);
    if (web.protocol !== 'https:') {
      throw new ServiceUnavailableError('Checkout Xendit memerlukan alamat HTTPS.');
    }
    try {
      const session = await xenditRequest('/sessions', createdSessionSchema, {
        body: {
          reference_id: input.orderCode,
          session_type: 'PAY',
          mode: 'COMPONENTS',
          amount: input.amount,
          currency: input.currency,
          country: 'ID',
          locale: 'id',
          description: input.description.slice(0, 1000),
          expires_at: input.expiresAt.toISOString(),
          capture_method: 'AUTOMATIC',
          allow_save_payment_method: 'DISABLED',
          customer: {
            reference_id: input.orderCode,
            type: 'INDIVIDUAL',
            email: input.customer.email,
            individual_detail: { given_names: input.customer.name.slice(0, 100) },
          },
          components_configuration: { origins: [web.origin] },
        },
      });
      if (
        session.status !== 'ACTIVE' ||
        session.amount !== input.amount ||
        session.currency !== input.currency ||
        session.reference_id !== input.orderCode
      ) {
        throw new XenditApiError(502, 'SESSION_MISMATCH');
      }
      return {
        providerReference: session.payment_session_id,
        method: 'XENDIT_COMPONENTS',
        redirectUrl: null,
        expiresAt: new Date(session.expires_at),
        componentsSdkKey: session.components_sdk_key,
        raw: {},
      };
    } catch (error) {
      logger.warn(
        {
          orderCode: input.orderCode,
          code: error instanceof XenditApiError ? error.code : undefined,
        },
        'Sesi pembayaran Xendit gagal dibuat',
      );
      throw new ServiceUnavailableError('Pembayaran Xendit belum bisa dimulai. Coba lagi.');
    }
  }

  async verifyWebhook(
    input: VerifyWebhookInput,
    knownReference?: (reference: string) => Promise<boolean>,
  ) {
    const webhook = parseXenditWebhook(input);
    if (!['payment_session.completed', 'payment_session.expired'].includes(webhook.event)) {
      return null;
    }
    const identity = z
      .object({
        payment_session_id: z.string().optional(),
        id: z.string().optional(),
      })
      .passthrough()
      .safeParse(webhook.data);
    const reference = identity.data?.payment_session_id ?? identity.data?.id;
    if (!reference) throw new BadRequestError('ID sesi pembayaran Xendit tidak ditemukan');
    if (knownReference && !(await knownReference(reference))) return null;
    const result = sessionSchema.safeParse({ ...identity.data, payment_session_id: reference });
    const completed = webhook.event === 'payment_session.completed';
    if (!result.success || result.data.status !== (completed ? 'COMPLETED' : 'EXPIRED')) {
      logger.warn(
        {
          event: webhook.event,
          fields: result.success
            ? ['status']
            : result.error.issues.map((issue) => issue.path.join('.')),
        },
        'Format webhook sesi Xendit tidak sesuai',
      );
      throw new BadRequestError('Status sesi pembayaran Xendit tidak valid');
    }
    const session = result.data;
    return sessionPaymentEvent({ ...session, updated: session.updated ?? webhook.created });
  }

  async resumeSession(reference: string) {
    const session = await xenditRequest(
      `/sessions/${encodeURIComponent(reference)}`,
      createdSessionSchema,
    );
    if (session.payment_session_id !== reference) throw new XenditApiError(502, 'SESSION_MISMATCH');
    return session.components_sdk_key;
  }

  async fetchSessionEvent(reference: string) {
    const session = await xenditRequest(
      `/sessions/${encodeURIComponent(reference)}`,
      sessionSchema,
    );
    if (session.payment_session_id !== reference) throw new XenditApiError(502, 'SESSION_MISMATCH');
    return sessionPaymentEvent(session);
  }

  async getPaymentStatus(reference: string): Promise<PaymentStatusResult> {
    const event = await this.fetchSessionEvent(reference);
    return {
      providerReference: reference,
      status: event?.status ?? 'PENDING',
      amount: event?.amount ?? null,
      paidAt: event?.paidAt ?? null,
    };
  }
}
