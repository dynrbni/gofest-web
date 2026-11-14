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
  neutral: 'border-warm-border bg-warm-muted text-ink',
  success: 'border-olive/40 bg-olive/10 text-olive',
  warning: 'border-amber-700/30 bg-amber-100 text-amber-900',
  danger: 'border-brick/30 bg-brick/10 text-brick',
  info: 'border-ink/20 bg-ink/5 text-ink',
};

const eventTones: Record<EventStatus, Tone> = {
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
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border px-2 py-0.5 text-xs font-semibold',
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