import { env } from '../../config/env';
import { ServiceUnavailableError } from '../../lib/errors';
import { MockPaymentProvider } from './mock.provider';
import type { PaymentProvider } from './payment.provider';

let provider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (env.PAYMENT_PROVIDER === 'mock') {
    if (env.isProduction) {
      throw new ServiceUnavailableError(
        'Payment provider belum dikonfigurasi untuk production. Hubungi admin platform.',
      );
    }
    provider ??= new MockPaymentProvider();
    return provider;
  }
  throw new ServiceUnavailableError('Payment provider belum dikonfigurasi');
}
