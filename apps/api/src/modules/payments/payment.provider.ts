export interface CreatePaymentInput {
  orderCode: string;
  amount: number;
  currency: string;
  expiresAt: Date;
  description: string;
  customer: { name: string; email: string; phone?: string | null };
  returnUrl: string;
}

export interface CreatePaymentResult {
  providerReference: string;
  redirectUrl: string | null;
  componentsSdkKey?: string;
  expiresAt: Date;
  method: string;
  raw: Record<string, unknown>;
}

export interface VerifyWebhookInput {
  headers: Record<string, string | string[] | undefined>;
  rawBody: Buffer;
}

export interface VerifiedPaymentEvent {
  providerEventId: string;
  providerReference: string;
  orderCode: string;
  amount: number;
  currency: string;
  status: 'PAID' | 'FAILED' | 'EXPIRED';
  paidAt: Date | null;
  raw: Record<string, unknown>;
}

export interface PaymentStatusResult {
  providerReference: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'UNKNOWN';
  amount: number | null;
  paidAt: Date | null;
}

export interface RefundInput {
  providerReference: string;
  amount: number;
  reason: string;
}

export interface RefundResult {
  providerReference: string;
  status: 'PENDING' | 'REFUNDED' | 'FAILED';
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyWebhook(input: VerifyWebhookInput): Promise<VerifiedPaymentEvent | null>;
  getPaymentStatus(reference: string): Promise<PaymentStatusResult>;
  refund?(input: RefundInput): Promise<RefundResult>;
}
