export interface PayoutInstruction {
  payoutId: string;
  idempotencyKey: string;
  organizerId: string;
  amount: number;
  currency: 'IDR';
  destination: { bankName: string; accountNumber: string; accountHolder: string };
}
export type PayoutProviderResult =
  | { status: 'UNAVAILABLE'; message: string }
  | { status: 'PROCESSING' | 'COMPLETED'; providerReference: string }
  | { status: 'FAILED'; message: string; providerReference?: string };
export interface PayoutProvider {
  name: string;
  supportsTransfers: boolean;
  submit(instruction: PayoutInstruction): Promise<PayoutProviderResult>;
}
export const payoutProvider: PayoutProvider = {
  name: 'INTERNAL',
  supportsTransfers: false,
  async submit() {
    return {
      status: 'UNAVAILABLE',
      message: 'Persetujuan internal menunggu integrasi payout provider. Belum ada transfer dana.',
    };
  },
};
