import { z } from 'zod';
import {
  DISCOUNT_TYPES,
  EVENT_STAFF_ROLES,
  EVENT_STATUSES,
  EVENT_TYPES,
  ORDER_STATUSES,
  ORGANIZER_STATUSES,
  PLATFORM_FEE_TYPES,
  USER_STATUSES,
} from './enums';
import { DEFAULT_PAGE_SIZE, DEFAULT_TIMEZONE, MAX_PAGE_SIZE } from './constants';

const optionalDateTime = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.string().datetime({ offset: true }).optional(),
);

const optionalDateTimeOrNull = z.preprocess(
  (value) => (value === '' ? null : value),
  z.string().datetime({ offset: true }).nullable().optional(),
);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5)
  .max(254)
  .email('Format email tidak valid');

export const phoneSchema = z
  .string()
  .trim()
  .max(24)
  .optional()
  .transform((value) => (value ? value.replace(/[\s-]/g, '') : value))
  .refine((value) => !value || /^(\+62|62|0)8[1-9][0-9]{6,12}$/.test(value), {
    message: 'Nomor WhatsApp tidak valid',
  });

export const passwordSchema = z
  .string()
  .min(8, 'Password minimal 8 karakter')
  .max(72, 'Password maksimal 72 karakter')
  .regex(/[A-Za-z]/, 'Password harus mengandung huruf')
  .regex(/[0-9]/, 'Password harus mengandung angka');

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: phoneSchema,
});

export const organizerApplicationSchema = z.object({
  organizationName: z.string().trim().min(2).max(120),
  slug: slugSchema,
  description: z.string().trim().max(3000).optional(),
});

export const organizerUpdateSchema = organizerApplicationSchema.partial().extend({
  description: z.string().trim().max(3000).optional(),
  logoKey: z.string().max(300).optional().nullable(),
});

export const organizerReviewSchema = z
  .object({
    status: z.enum(ORGANIZER_STATUSES),
    note: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if ((value.status === 'REJECTED' || value.status === 'SUSPENDED') && !value.note) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['note'],
        message: 'Alasan wajib diisi untuk status ini',
      });
    }
  });

const eventBaseSchema = z.object({
  title: z.string().trim().min(4).max(140),
  slug: slugSchema,
  summary: z.string().trim().min(20).max(240),
  description: z.string().trim().min(40).max(30000),
  categoryId: z.string().min(1),
  coverKey: z.string().max(500).optional().nullable(),
  type: z.enum(EVENT_TYPES),
  venueName: z.string().trim().max(160).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  onlineAccessUrl: z
    .string()
    .trim()
    .url('URL akses online tidak valid')
    .max(1000)
    .optional()
    .nullable(),
  onlineAccessNote: z.string().trim().max(500).optional().nullable(),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  timezone: z.string().trim().min(1).max(64).default(DEFAULT_TIMEZONE),
  salesStartAt: optionalDateTime,
  salesEndAt: optionalDateTime,
  rules: z.string().trim().max(10000).optional().nullable(),
  refundPolicy: z.string().trim().max(10000).optional().nullable(),
});

type EventInputBase = z.infer<typeof eventBaseSchema>;
type EventWindowValue = Partial<Omit<EventInputBase, 'salesStartAt' | 'salesEndAt'>> & {
  salesStartAt?: string | null;
  salesEndAt?: string | null;
};

function refineEventWindow(
  value: EventWindowValue,
  ctx: z.RefinementCtx,
  requireOfflineDetails: boolean,
) {
  if (value.startsAt && value.endsAt && new Date(value.endsAt) <= new Date(value.startsAt)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endsAt'],
      message: 'Waktu selesai harus setelah waktu mulai',
    });
  }
  if (value.salesStartAt && value.salesEndAt) {
    if (new Date(value.salesEndAt) <= new Date(value.salesStartAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['salesEndAt'],
        message: 'Akhir penjualan harus setelah mulai penjualan',
      });
    }
  }
  if (value.salesEndAt && value.startsAt && new Date(value.salesEndAt) > new Date(value.startsAt)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['salesEndAt'],
      message: 'Penjualan tiket tidak boleh melewati waktu mulai event',
    });
  }
  if (value.type === 'OFFLINE' && requireOfflineDetails) {
    if (!value.venueName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['venueName'],
        message: 'Nama venue wajib diisi untuk event offline',
      });
    }
    if (!value.address) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['address'],
        message: 'Alamat wajib diisi untuk event offline',
      });
    }
    if (!value.city) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['city'],
        message: 'Kota wajib diisi untuk event offline',
      });
    }
  }
}

export const eventInputSchema = eventBaseSchema.superRefine((value, ctx) => {
  refineEventWindow(value, ctx, true);
});

export const eventUpdateSchema = eventBaseSchema
  .partial()
  .extend({ salesStartAt: optionalDateTimeOrNull, salesEndAt: optionalDateTimeOrNull })
  .superRefine((value, ctx) => {
    refineEventWindow(value, ctx, false);
  });

export const eventReviewSchema = z
  .object({
    status: z.enum(['PUBLISHED', 'REJECTED', 'CANCELLED']),
    note: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if ((value.status === 'REJECTED' || value.status === 'CANCELLED') && !value.note) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['note'],
        message: 'Alasan wajib diisi untuk status ini',
      });
    }
  });

export const eventCancelSchema = z.object({
  reason: z.string().trim().min(10).max(1000),
});

const ticketTypeBaseSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(1000).optional().nullable(),
  price: z.coerce.number().int().min(0).max(1_000_000_000),
  quotaTotal: z.coerce.number().int().min(1).max(1_000_000),
  salesStartAt: optionalDateTime,
  salesEndAt: optionalDateTime,
  minPerOrder: z.coerce.number().int().min(1).max(20).default(1),
  maxPerOrder: z.coerce.number().int().min(1).max(50).default(10),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
});

type TicketTypeBase = z.infer<typeof ticketTypeBaseSchema>;
type TicketTypeWindowValue = Partial<Omit<TicketTypeBase, 'salesStartAt' | 'salesEndAt'>> & {
  salesStartAt?: string | null;
  salesEndAt?: string | null;
};

function refineTicketType(value: TicketTypeWindowValue, ctx: z.RefinementCtx) {
  if (value.minPerOrder !== undefined && value.maxPerOrder !== undefined) {
    if (value.minPerOrder > value.maxPerOrder) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxPerOrder'],
        message: 'Maksimal per order harus lebih besar atau sama dengan minimal',
      });
    }
  }
  if (value.salesStartAt && value.salesEndAt) {
    if (new Date(value.salesEndAt) <= new Date(value.salesStartAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['salesEndAt'],
        message: 'Akhir penjualan harus setelah mulai penjualan',
      });
    }
  }
}

export const ticketTypeInputSchema = ticketTypeBaseSchema.superRefine(refineTicketType);
export const ticketTypeUpdateSchema = ticketTypeBaseSchema
  .partial()
  .extend({ salesStartAt: optionalDateTimeOrNull, salesEndAt: optionalDateTimeOrNull })
  .superRefine(refineTicketType);

const couponBaseSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(3)
    .max(24)
    .regex(/^[A-Z0-9_-]+$/, 'Kode hanya boleh huruf, angka, tanda hubung, dan garis bawah'),
  discountType: z.enum(DISCOUNT_TYPES),
  discountValue: z.coerce.number().int().min(1),
  maxDiscount: z.coerce.number().int().min(1).optional().nullable(),
  minimumPurchase: z.coerce.number().int().min(0).default(0),
  maxRedemptions: z.coerce.number().int().min(1).optional().nullable(),
  maxPerUser: z.coerce.number().int().min(1).optional().nullable(),
  validFrom: optionalDateTime,
  validUntil: optionalDateTime,
  isActive: z.boolean().default(true),
});

type CouponBase = z.infer<typeof couponBaseSchema>;
type CouponValidityValue = Partial<Omit<CouponBase, 'validFrom' | 'validUntil'>> & {
  validFrom?: string | null;
  validUntil?: string | null;
};

function refineCoupon(value: CouponValidityValue, ctx: z.RefinementCtx) {
  if (value.discountType === 'PERCENTAGE' && value.discountValue && value.discountValue > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['discountValue'],
      message: 'Diskon persentase maksimal 100',
    });
  }
  if (value.validFrom && value.validUntil) {
    if (new Date(value.validUntil) <= new Date(value.validFrom)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['validUntil'],
        message: 'Akhir masa berlaku harus setelah awal masa berlaku',
      });
    }
  }
}

export const couponInputSchema = couponBaseSchema.superRefine(refineCoupon);
export const couponUpdateSchema = couponBaseSchema
  .partial()
  .extend({ validFrom: optionalDateTimeOrNull, validUntil: optionalDateTimeOrNull })
  .superRefine(refineCoupon);

export const createOrderSchema = z.object({
  eventId: z.string().min(1),
  buyerName: z.string().trim().min(2).max(120),
  buyerEmail: emailSchema,
  buyerPhone: phoneSchema,
  couponCode: z
    .string()
    .trim()
    .toUpperCase()
    .max(24)
    .optional()
    .transform((value) => value || undefined),
  items: z
    .array(
      z.object({
        ticketTypeId: z.string().min(1),
        quantity: z.coerce.number().int().min(1).max(50),
      }),
    )
    .min(1)
    .max(10),
  acceptTerms: z.literal(true),
  idempotencyKey: z.string().trim().min(8).max(100),
});

export const orderAccessSchema = z.object({
  email: emailSchema,
});

export const eventListQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(120).optional(),
  city: z.string().trim().max(80).optional(),
  dateFrom: z.string().datetime({ offset: true }).optional(),
  dateTo: z.string().datetime({ offset: true }).optional(),
  price: z.enum(['all', 'free', 'paid']).default('all'),
  availability: z.enum(['all', 'available', 'sold_out']).default('all'),
  sort: z.enum(['starts_soon', 'published_newest']).default('starts_soon'),
});

export const eventManageQuerySchema = paginationSchema.extend({
  status: z.enum(EVENT_STATUSES).optional(),
  q: z.string().trim().max(120).optional(),
});

export type EventListQuery = z.infer<typeof eventListQuerySchema>;
export type EventManageQuery = z.infer<typeof eventManageQuerySchema>;
export type ScanTicketInput = z.infer<typeof scanTicketSchema>;
export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;
export type AdminUserQuery = z.infer<typeof adminUserQuerySchema>;
export type AdminOrganizerQuery = z.infer<typeof adminOrganizerQuerySchema>;
export type AdminAuditQuery = z.infer<typeof adminAuditQuerySchema>;

export const scanTicketSchema = z
  .object({
    eventId: z.string().min(1),
    token: z.string().trim().min(20).max(500).optional(),
    ticketCode: z.string().trim().min(4).max(40).optional(),
    gate: z.string().trim().max(40).optional(),
    idempotencyKey: z.string().trim().min(8).max(100).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.token && !value.ticketCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['token'],
        message: 'Token QR atau kode tiket wajib diisi',
      });
    }
  });

export const addStaffSchema = z.object({
  email: emailSchema,
  role: z.enum(EVENT_STAFF_ROLES).default('CHECK_IN'),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema,
  description: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const categoryUpdateSchema = categoryInputSchema.partial();

export const userStatusInputSchema = z
  .object({
    status: z.enum(USER_STATUSES),
    note: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === 'SUSPENDED' && !value.note) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['note'],
        message: 'Alasan suspensi wajib diisi',
      });
    }
  });

export const paymentReviewResolveSchema = z
  .object({
    action: z.enum(['ISSUE_TICKETS', 'REFUND']),
    note: z.string().trim().min(5).max(1000),
  })
  .superRefine((value, ctx) => {
    if (value.action === 'REFUND' && value.note.length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['note'],
        message: 'Catatan refund minimal 10 karakter',
      });
    }
  });

export const platformSettingsSchema = z.object({
  platformFeeType: z.enum(PLATFORM_FEE_TYPES).optional(),
  platformFeeValue: z.coerce.number().int().min(0).max(10_000_000).optional(),
  orderReservationMinutes: z.coerce.number().int().min(5).max(120).optional(),
  eventReviewRequired: z.boolean().optional(),
});

export const orderListQuerySchema = paginationSchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
  q: z.string().trim().max(120).optional(),
});

export const ticketListQuerySchema = paginationSchema.extend({
  status: z.enum(['VALID', 'CHECKED_IN', 'CANCELLED', 'REFUNDED']).optional(),
  q: z.string().trim().max(120).optional(),
});

export const adminListQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  status: z.enum([...EVENT_STATUSES, ...ORGANIZER_STATUSES, ...USER_STATUSES]).optional(),
});

export const adminUserQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  status: z.enum(USER_STATUSES).optional(),
});

export const adminOrganizerQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  status: z.enum(ORGANIZER_STATUSES).optional(),
});

export const adminAuditQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  action: z.string().trim().max(80).optional(),
  resourceType: z.string().trim().max(80).optional(),
});
