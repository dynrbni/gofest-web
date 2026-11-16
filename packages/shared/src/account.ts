import { z } from 'zod';
import { ORDER_STATUSES, PAYMENT_STATUSES } from './enums';
import { paginationSchema } from './schemas';

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Gunakan format YYYY-MM-DD')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00+07:00`);
    return (
      Number.isFinite(parsed.getTime()) &&
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(parsed) === value
    );
  }, 'Tanggal tidak valid')
  .optional();

const filters = paginationSchema.extend({
  q: z.string().trim().max(140).optional(),
  dateFrom: date,
  dateTo: date,
});

function dateRange(value: { dateFrom?: string; dateTo?: string }, ctx: z.RefinementCtx) {
  if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dateTo'],
      message: 'Tanggal akhir harus setelah tanggal awal',
    });
  }
}

export const accountTicketQuerySchema = filters
  .extend({
    period: z.enum(['upcoming', 'past', 'invalid']).default('upcoming'),
  })
  .superRefine(dateRange);

export const accountHistoryQuerySchema = filters
  .extend({
    status: z.enum(ORDER_STATUSES).optional(),
    paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  })
  .superRefine(dateRange);

export type AccountTicketQuery = z.infer<typeof accountTicketQuerySchema>;
export type AccountHistoryQuery = z.infer<typeof accountHistoryQuerySchema>;
