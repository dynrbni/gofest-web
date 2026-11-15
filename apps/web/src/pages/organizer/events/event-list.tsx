import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Calendar, MapPin, ExternalLink, Settings2 } from 'lucide-react';
import type { EventStatus } from '@gofest/shared';
import { useOrganizerEvents, pageMeta } from '@/lib/queries';
import { useDocumentTitle, useDebouncedValue } from '@/lib/hooks';
import { formatEventWhen } from '@/lib/format';
import { EventStatusBadge } from '@/components/common/status-badge';
import { Pagination } from '@/components/common/pagination';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states';
import { cn } from '@/lib/utils';

const statusTabs: Array<{ label: string; value: EventStatus | 'ALL' }> = [
  { label: 'Semua', value: 'ALL' },
  { label: 'Terbit', value: 'PUBLISHED' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Review', value: 'PENDING_REVIEW' },
  { label: 'Batal', value: 'CANCELLED' },
];

export function OrganizerEventListPage() {
  useDocumentTitle('Daftar Acara');
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const currentStatus = (searchParams.get('status') as EventStatus) || undefined;
  const initialQ = searchParams.get('q') ?? '';

  const [search, setSearch] = useState(initialQ);
  const debouncedSearch = useDebouncedValue(search, 400);

  const eventsQuery = useOrganizerEvents({
    page,
    limit: 10,
    status: currentStatus,
    q: debouncedSearch.trim() || undefined,
  });

  const events = eventsQuery.data?.data ?? [];
  const meta = pageMeta(eventsQuery.data?.meta);

  function setPage(newPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(newPage));
    setSearchParams(next);
  }

  function setStatus(status: EventStatus | 'ALL') {
    const next = new URLSearchParams(searchParams);
    next.delete('page');
    if (status === 'ALL') {
      next.delete('status');
    } else {
      next.set('status', status);
    }
    setSearchParams(next);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-warm-border pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tightest sm:text-4xl">
            Acara Saya
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Kelola jadwal, tiket, kupon diskon, dan petugas untuk seluruh acaramu
          </p>
        </div>

        <Link
          to="/organizer/events/new"
          className="inline-flex items-center gap-2 rounded-md bg-brick px-4 py-2 text-sm font-semibold text-paper shadow-sm transition-colors hover:bg-brick/90"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Buat Acara Baru
        </Link>
      </div>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-1.5">
          {statusTabs.map((tab) => {
            const isActive = tab.value === 'ALL' ? !currentStatus : currentStatus === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatus(tab.value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                  isActive
                    ? 'bg-ink text-paper'
                    : 'bg-warm-muted/60 text-ink/75 hover:bg-warm-muted hover:text-ink',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            aria-label="Cari judul acara"
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              const next = new URLSearchParams(searchParams);
              next.delete('page');
              if (e.target.value.trim()) {
                next.set('q', e.target.value.trim());
              } else {
                next.delete('q');
              }
              setSearchParams(next);
            }}
            placeholder="Cari judul acara..."
            className="h-9 w-full rounded-md border border-ink/20 bg-card pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ink"
          />
        </div>
      </div>

      {eventsQuery.isLoading ? (
        <LoadingState rows={4} label="Memuat daftar acara" />
      ) : eventsQuery.isError ? (
        <ErrorState error={eventsQuery.error} onRetry={() => void eventsQuery.refetch()} />
      ) : events.length === 0 ? (
        <EmptyState
          title="Tidak ada acara ditemukan"
          description={
            debouncedSearch || currentStatus
              ? 'Tidak ada acara yang cocok dengan filter pencarian.'
              : 'Kamu belum membuat acara. Mulai buat acaramu sekarang!'
          }
          action={
            <Link
              to="/organizer/events/new"
              className="inline-flex h-9 items-center justify-center rounded-md bg-brick px-4 text-xs font-semibold text-paper hover:bg-brick/90"
            >
              Buat Acara Baru
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="divide-y divide-warm-border rounded-md border border-warm-border bg-card">
            {events.map((event) => (
              <article
                key={event.id}
                className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <EventStatusBadge status={event.status} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-olive">
                      {event.category?.name ?? 'Umum'}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-ink">
                    <Link
                      to={`/organizer/events/${event.id}/edit`}
                      className="hover:underline hover:underline-offset-4"
                    >
                      {event.title}
                    </Link>
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" aria-hidden />
                      {formatEventWhen(event.startsAt, event.endsAt, event.timezone)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" aria-hidden />
                      {event.city ? `${event.venueName ?? ''}, ${event.city}` : 'Acara Online'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  {event.status === 'PUBLISHED' ? (
                    <Link
                      to={`/events/${event.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-warm-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-warm-muted hover:text-ink"
                    >
                      Lihat di web
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </Link>
                  ) : null}

                  <Link
                    to={`/organizer/events/${event.id}/edit`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-xs font-semibold text-paper transition-colors hover:bg-ink/90"
                  >
                    <Settings2 className="h-3.5 w-3.5" aria-hidden />
                    Kelola Acara
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <Pagination meta={meta} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
