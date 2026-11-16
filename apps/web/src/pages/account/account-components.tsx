import type { ReactNode } from 'react';
import { CalendarDays, MapPin, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PaginationMeta, PaymentStatus } from '@gofest/shared';
import { EventPoster } from '@/components/common/event-presentation';
import { ToneBadge } from '@/components/common/status-badge';
import { formatEventWhen } from '@/lib/format';
import { useLanguage } from '@/lib/language';
import type { OrderEvent } from '@/lib/models';

export function AccountAvatar({ name }: { name: string }) {
  return (
    <span className="account-avatar" aria-hidden>
      {name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join('')
        .toLocaleUpperCase('id-ID')}
    </span>
  );
}
export function AccountHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="account-page-heading">
      <div className="min-w-0">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
export function AccountPoster({ event }: { event: OrderEvent & { coverKey?: string | null } }) {
  return (
    <EventPoster
      title={event.title}
      coverKey={event.coverKey ?? null}
      category="Event"
      startsAt={event.startsAt}
      city={event.city}
      className="account-event-poster"
    />
  );
}
export function AccountEventMeta({ event }: { event: OrderEvent }) {
  const { t } = useLanguage();
  return (
    <div className="account-event-meta">
      <p>
        <CalendarDays size={16} aria-hidden />
        <span>{formatEventWhen(event.startsAt, event.endsAt, event.timezone)}</span>
      </p>
      <p>
        <MapPin size={16} aria-hidden />
        <span>
          {event.type === 'ONLINE'
            ? t('Event online', 'Online event')
            : [event.venueName, event.city].filter(Boolean).join(', ') ||
              t('Lokasi belum tersedia', 'Venue unavailable')}
        </span>
      </p>
    </div>
  );
}
const paymentLabels: Record<PaymentStatus, [string, string]> = {
  PENDING: ['Menunggu pembayaran', 'Pending payment'],
  PAID: ['Lunas', 'Paid'],
  FAILED: ['Gagal', 'Failed'],
  EXPIRED: ['Kedaluwarsa', 'Expired'],
  REFUND_PENDING: ['Proses refund', 'Refund pending'],
  REFUNDED: ['Dikembalikan', 'Refunded'],
  UNKNOWN: ['Belum diketahui', 'Unknown'],
};
export function PaymentBadge({ status }: { status: PaymentStatus | undefined }) {
  const { t } = useLanguage();
  if (!status)
    return <ToneBadge tone="neutral">{t('Belum ada pembayaran', 'No payment yet')}</ToneBadge>;
  return (
    <ToneBadge
      tone={
        status === 'PAID'
          ? 'success'
          : status === 'FAILED'
            ? 'danger'
            : status === 'PENDING'
              ? 'warning'
              : 'neutral'
      }
    >
      {t(...paymentLabels[status])}
    </ToneBadge>
  );
}
export function AccountSectionHeading({
  title,
  to,
  linkLabel,
}: {
  title: string;
  to?: string;
  linkLabel?: string;
}) {
  return (
    <div className="account-section-heading">
      <h2>{title}</h2>
      {to ? (
        <Link className="account-text-link" to={to}>
          {linkLabel}
          <ArrowRight size={16} aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
export function AccountPagination({
  meta,
  onPageChange,
}: {
  meta: PaginationMeta | null;
  onPageChange: (page: number) => void;
}) {
  const { t } = useLanguage();
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <nav className="account-pagination" aria-label={t('Navigasi halaman', 'Pagination')}>
      <p>
        {t(
          `Halaman ${meta.page} dari ${meta.totalPages} · ${meta.total} hasil`,
          `Page ${meta.page} of ${meta.totalPages} · ${meta.total} results`,
        )}
      </p>
      <div className="flex gap-2">
        <button
          className="account-secondary"
          onClick={() => onPageChange(meta.page - 1)}
          disabled={meta.page <= 1}
        >
          <ChevronLeft size={16} aria-hidden />
          {t('Sebelumnya', 'Previous')}
        </button>
        <button
          className="account-secondary"
          onClick={() => onPageChange(meta.page + 1)}
          disabled={meta.page >= meta.totalPages}
        >
          {t('Berikutnya', 'Next')}
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>
    </nav>
  );
}
