import { z } from 'zod';

export const moneySchema = z.coerce.number().int().positive().max(2_000_000_000);
export const periodSchema = z
  .object({
    period: z.enum(['today', '7d', '30d', '90d', 'custom', 'all']).default('30d'),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
    eventId: z.string().max(100).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.period === 'custom' &&
      (!value.from || !value.to || new Date(value.from) > new Date(value.to))
    ) {
      ctx.addIssue({ code: 'custom', path: ['from'], message: 'Rentang tanggal tidak valid' });
    }
    if (
      value.from &&
      value.to &&
      new Date(value.to).getTime() - new Date(value.from).getTime() > 366 * 86400000
    ) {
      ctx.addIssue({ code: 'custom', path: ['to'], message: 'Rentang maksimal 366 hari' });
    }
  });
export type PeriodQuery = z.infer<typeof periodSchema>;
export const bankSchema = z.object({
  bankName: z.string().trim().min(2).max(100),
  accountHolder: z.string().trim().min(2).max(150),
  accountNumber: z
    .string()
    .trim()
    .regex(/^\d{6,30}$/, 'Nomor rekening harus 6–30 digit'),
});
export const payoutSchema = z.object({
  bankAccountId: z.string().min(1).max(100),
  amount: moneySchema,
  idempotencyKey: z.string().min(16).max(150),
});
export const payoutReviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().trim().min(5).max(1000),
});
export const refundSchema = z
  .object({
    orderId: z.string().min(1).max(100),
    ticketAmount: z.coerce.number().int().min(0).max(2_000_000_000),
    feeAmount: z.coerce.number().int().min(0).max(2_000_000_000),
    reason: z.string().trim().min(10).max(1000),
    idempotencyKey: z.string().min(16).max(150),
  })
  .refine((value) => value.ticketAmount + value.feeAmount > 0, 'Isi nominal refund');
export const refundReviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().trim().min(5).max(1000),
});
export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(120).optional(),
  status: z.string().max(40).optional(),
});
export type ListQuery = z.infer<typeof listQuerySchema>;
export const ledgerQuerySchema = listQuerySchema.extend({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  eventId: z.string().max(100).optional(),
});
