export const USER_ROLES = ['USER', 'ADMIN', 'SUPERADMIN', 'CREATOR'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export function isOperationalAdmin(role: string | undefined): boolean {
  return role === 'ADMIN' || role === 'SUPERADMIN';
}

export const USER_STATUSES = ['ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'DELETED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const ORGANIZER_STATUSES = ['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED'] as const;
export type OrganizerStatus = (typeof ORGANIZER_STATUSES)[number];

export const EVENT_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'NEEDS_REVISION',
  'APPROVED',
  'PUBLISHED',
  'REJECTED',
  'CANCELLED',
  'COMPLETED',
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_TYPES = ['ONLINE', 'OFFLINE'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_STAFF_ROLES = ['CHECK_IN', 'MANAGER'] as const;
export type EventStaffRole = (typeof EVENT_STAFF_ROLES)[number];

export const DISCOUNT_TYPES = ['PERCENTAGE', 'FIXED_AMOUNT'] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'PAID',
  'EXPIRED',
  'CANCELLED',
  'PAYMENT_REVIEW',
  'REFUND_PENDING',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  'PENDING',
  'PAID',
  'FAILED',
  'EXPIRED',
  'REFUND_PENDING',
  'REFUNDED',
  'UNKNOWN',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const TICKET_STATUSES = ['VALID', 'CHECKED_IN', 'CANCELLED', 'REFUNDED'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const CHECK_IN_RESULTS = [
  'VALID',
  'ALREADY_USED',
  'INVALID',
  'CANCELLED',
  'WRONG_EVENT',
] as const;
export type CheckInResult = (typeof CHECK_IN_RESULTS)[number];

export const EMAIL_STATUSES = ['PENDING', 'SENT', 'FAILED'] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export const EMAIL_TEMPLATES = [
  'ORDER_CREATED',
  'PAYMENT_SUCCESS',
  'EVENT_CANCELLED',
  'PASSWORD_RESET',
] as const;
export type EmailTemplate = (typeof EMAIL_TEMPLATES)[number];

export const WEBHOOK_STATUSES = ['RECEIVED', 'PROCESSED', 'FAILED'] as const;
export type WebhookStatus = (typeof WEBHOOK_STATUSES)[number];

export const PLATFORM_FEE_TYPES = ['none', 'fixed', 'percentage'] as const;
export type PlatformFeeType = (typeof PLATFORM_FEE_TYPES)[number];
