import { env } from '../../config/env';
import { BadRequestError } from '../../lib/errors';
import { hmacSha256, randomToken, safeCompare } from '../../lib/crypto';
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  PaymentStatusResult,
  VerifiedPaymentEvent,
  VerifyWebhookInput,
} from './payment.provider';

interface MockWebhookPayload {
  eventId?: unknown;
  reference?: unknown;
  orderCode?: unknown;
  amount?: unknown;
  currency?: unknown;
  status?: unknown;
  paidAt?: unknown;
}

export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (env.isProduction) {
      throw new Error('MockPaymentProvider tidak boleh dipakai di production');
    }
    const providerReference = `MOCK-${input.orderCode}`;
    return {
      providerReference,
      redirectUrl: `${input.returnUrl}&mock=1`,
      expiresAt: input.expiresAt,
      method: 'MOCK',
      raw: {
        provider: this.name,
        orderCode: input.orderCode,
        amount: input.amount,
        currency: input.currency,
        description: input.description,
      },
    };
  }

  async verifyWebhook(input: VerifyWebhookInput): Promise<VerifiedPaymentEvent> {
    const signatureHeader = input.headers['x-mock-signature'];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    if (!signature) {
      throw new BadRequestError('Signature webhook tidak ditemukan');
    }
    const expected = hmacSha256(env.PAYMENT_WEBHOOK_SECRET, input.rawBody.toString('utf8'));
    if (!safeCompare(signature, expected)) {
      throw new BadRequestError('Signature webhook tidak valid');
    }

    let payload: MockWebhookPayload;
    try {
      payload = JSON.parse(input.rawBody.toString('utf8')) as MockWebhookPayload;
    } catch {
      throw new BadRequestError('Payload webhook bukan JSON yang valid');
    }

    const status = payload.status;
    if (status !== 'PAID' && status !== 'FAILED' && status !== 'EXPIRED') {
      throw new BadRequestError('Status pembayaran webhook tidak dikenal');
    }
    if (
      typeof payload.eventId !== 'string' ||
      typeof payload.reference !== 'string' ||
      typeof payload.orderCode !== 'string' ||
      typeof payload.amount !== 'number' ||
      !Number.isInteger(payload.amount) ||
      payload.amount < 0 ||
      typeof payload.currency !== 'string'
    ) {
      throw new BadRequestError('Payload webhook tidak lengkap');
    }

    return {
      providerEventId: payload.eventId,
      providerReference: payload.reference,
      orderCode: payload.orderCode,
      amount: payload.amount,
      currency: payload.currency,
      status,
      paidAt:
        payload.paidAt === undefined || payload.paidAt === null
          ? new Date()
          : new Date(String(payload.paidAt)),
      raw: {
        ...payload,
        receivedAt: new Date().toISOString(),
        nonce: randomToken(8),
      } as Record<string, unknown>,
    };
  }

  async getPaymentStatus(reference: string): Promise<PaymentStatusResult> {
    return {
      providerReference: reference,
      status: 'PENDING',
      amount: null,
      paidAt: null,
    };
  }
}
