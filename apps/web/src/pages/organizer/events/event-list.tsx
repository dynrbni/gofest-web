import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Calendar, MapPin, ExternalLink, Settings2 } from 'lucide-react';
import { EVENT_STATUSES, EVENT_STATUS_LABELS, type EventStatus } from '@gofest/shared';
import { useOrganizerEvents, pageMeta } from '@/lib/queries';
import { useDocumentTitle, useDebouncedValue } from '@/lib/hooks';
import { formatEventWhen } from '@/lib/format';
import { EventStatusBadge } from '@/components/common/status-badge';
import { Pagination } from '@/components/common/pagination';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states';
import { cn } from '@/lib/utils';

const eventFilters = [
  { label: 'Semua Event', value: 'ALL' },
  { label: 'Event Aktif', value: 'ACTIVE' },
  { label: 'Event Draft', value: 'DRAFT' },
  { label: 'Event Lalu', value: 'PAST' },
] as const;
type EventFilter = (typeof eventFilters)[number]['value'];

export function OrganizerEventListPage() {
  useDocumentTitle('Event Saya');
  const [searchParams, setSearchParams] = useSearchParams();
  const rawPage = Number(searchParams.get('page') ?? 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const currentStatus = EVENT_STATUSES.find((status) => status === searchParams.get('status'));
  const past = searchParams.get('period') === 'past';
  const active = !past && searchParams.get('active') === 'true';
  const selectedFilter = past ? 'PAST' : active ? 'ACTIVE' : (currentStatus ?? 'ALL');
  const search = searchParams.get('q') ?? '';
  const debouncedSearch = useDebouncedValue(search.trim(), 350);

  const eventsQuery = useOrganizerEvents({
    page,
    limit: 10,
    status: currentStatus,
    active: active ? 'true' : undefined,
    period: past ? 'past' : undefined,
    q: debouncedSearch || undefined,
  });

  const events = eventsQuery.data?.data ?? [];
  const meta = pageMeta(eventsQuery.data?.meta);

  function setPage(newPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(newPage));
    setSearchParams(next);
  }

  function setFilter(filter: EventFilter | EventStatus) {
    const next = new URLSearchParams(searchParams);
    next.delete('page');
    next.delete('status');
    next.delete('active');
    next.delete('period');
    if (filter === 'ACTIVE') next.set('active', 'true');
    else if (filter === 'PAST') next.set('period', 'past');
    else if (filter !== 'ALL') next.set('status', filter);
    setSearchParams(next, { preventScrollReset: true });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-warm-border pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tightest sm:text-4xl">
            Event Saya
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Kelola jadwal, tiket, kupon diskon, dan petugas untuk seluruh acaramu
          </p>
        </div>

        <Link
          to="/creator/events/new"
          className="inline-flex items-center gap-2 rounded-md bg-brick px-4 py-2 text-sm font-medium text-paper shadow-sm transition-colors hover:bg-brick/90"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Buat Acara Baru
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div
          role="group"
          aria-label="Filter event"
          className="grid grid-cols-2 gap-x-2 border-b border-slate-200 px-3 sm:flex sm:flex-wrap sm:px-5"
        >
          {eventFilters.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              aria-pressed={value === selectedFilter}
              onClick={() => setFilter(value)}
              className={cn(
                'min-h-12 border-b-2 px-2 py-2 text-left text-sm font-semibold transition-colors sm:px-3 sm:text-base',
                value === selectedFilter
                  ? 'border-primary text-blue-800'
                  : 'border-transparent text-slate-700 hover:text-primary',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] sm:p-5">
          <div className="relative min-w-0">
            <Search
              className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-500"
              aria-hidden
            />
            <input
              aria-label="Cari judul acara"
              type="search"
              maxLength={120}
              value={search}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams);
                next.delete('page');
                if (event.target.value.trim()) next.set('q', event.target.value);
                else next.delete('q');
                setSearchParams(next, { replace: true, preventScrollReset: true, flushSync: true });
              }}
              placeholder="Cari judul acara…"
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm sm:text-base"
            />
          </div>
          <select
            aria-label="Status lainnya"
            value={!active && !past && currentStatus !== 'DRAFT' ? (currentStatus ?? '') : ''}
            onChange={(event) => {
              const status = EVENT_STATUSES.find((value) => value === event.target.value);
              setFilter(status ?? 'ALL');
            }}
            className="min-h-11 min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm sm:text-base"
          >
            <option value="">Status lainnya</option>
            {EVENT_STATUSES.filter((status) => status !== 'DRAFT').map((status) => (
              <option key={status} value={status}>
                {EVENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
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
            debouncedSearch || selectedFilter !== 'ALL'
              ? 'Tidak ada acara yang cocok dengan filter pencarian.'
              : 'Kamu belum membuat acara. Mulai buat acaramu sekarang!'
          }
          action={
            <Link
              to="/creator/events/new"
              className="inline-flex h-9 items-center justify-center rounded-md bg-brick px-4 text-xs font-medium text-paper hover:bg-brick/90"
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
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <EventStatusBadge status={event.status} />
                    <span className="text-xs font-medium uppercase tracking-wider text-olive">
                      {event.category?.name ?? 'Umum'}
                    </span>
                  </div>
                  <h2 className="break-words text-lg font-semibold text-ink">
                    <Link
                      to={`/creator/events/${event.id}/edit`}
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
                      {event.type === 'ONLINE'
                        ? 'Acara Online'
                        : [event.venueName, event.city].filter(Boolean).join(', ') ||
                          'Lokasi belum ditentukan'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  {event.status === 'PUBLISHED' ? (
                    <Link
                      to={`/events/${event.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-warm-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-warm-muted hover:text-ink"
                    >
                      Lihat di web
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </Link>
                  ) : null}

                  <Link
                    to={`/creator/events/${event.id}/edit`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-paper transition-colors hover:bg-ink/90"
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
