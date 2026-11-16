import {
  CHECK_IN_RESULT_LABELS,
  EVENT_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  ORGANIZER_STATUS_LABELS,
  TICKET_STATUS_LABELS,
  USER_STATUS_LABELS,
  type CheckInResult,
  type EventStatus,
  type OrderStatus,
  type OrganizerStatus,
  type TicketStatus,
  type UserStatus,
} from '@gofest/shared';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const toneClasses: Record<Tone, string> = {
  neutral: 'border-slate-200 bg-slate-100 text-slate-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 font-medium',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 font-medium',
  danger: 'border-rose-200 bg-rose-50 text-rose-700 font-medium',
  info: 'border-blue-200 bg-blue-50 text-blue-700 font-medium',
};

const eventTones: Record<EventStatus, Tone> = {
  NEEDS_REVISION: 'warning',
  APPROVED: 'success',
  DRAFT: 'neutral',
  PENDING_REVIEW: 'warning',
  PUBLISHED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'danger',
  COMPLETED: 'info',
};

const orderTones: Record<OrderStatus, Tone> = {
  PENDING_PAYMENT: 'warning',
  PAID: 'success',
  EXPIRED: 'neutral',
  CANCELLED: 'danger',
  PAYMENT_REVIEW: 'warning',
  REFUND_PENDING: 'info',
  REFUNDED: 'info',
  PARTIALLY_REFUNDED: 'info',
};

const ticketTones: Record<TicketStatus, Tone> = {
  VALID: 'success',
  CHECKED_IN: 'info',
  CANCELLED: 'danger',
  REFUNDED: 'neutral',
};

const organizerTones: Record<OrganizerStatus, Tone> = {
  PENDING: 'warning',
  ACTIVE: 'success',
  REJECTED: 'danger',
  SUSPENDED: 'danger',
};

const userTones: Record<UserStatus, Tone> = {
  ACTIVE: 'success',
  PENDING_VERIFICATION: 'warning',
  SUSPENDED: 'danger',
  DELETED: 'neutral',
};

const checkInTones: Record<CheckInResult, Tone> = {
  VALID: 'success',
  ALREADY_USED: 'warning',
  INVALID: 'danger',
  CANCELLED: 'danger',
  WRONG_EVENT: 'danger',
};

function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return <Badge tone={eventTones[status]}>{EVENT_STATUS_LABELS[status] ?? status}</Badge>;
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={orderTones[status]}>{ORDER_STATUS_LABELS[status] ?? status}</Badge>;
}

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <Badge tone={ticketTones[status]}>{TICKET_STATUS_LABELS[status] ?? status}</Badge>;
}

export function OrganizerStatusBadge({ status }: { status: OrganizerStatus }) {
  return <Badge tone={organizerTones[status]}>{ORGANIZER_STATUS_LABELS[status] ?? status}</Badge>;
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return <Badge tone={userTones[status]}>{USER_STATUS_LABELS[status] ?? status}</Badge>;
}

export function CheckInResultBadge({ result }: { result: CheckInResult }) {
  return <Badge tone={checkInTones[result]}>{CHECK_IN_RESULT_LABELS[result] ?? result}</Badge>;
}

export function ToneBadge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <Badge tone={tone}>{children}</Badge>;
}
