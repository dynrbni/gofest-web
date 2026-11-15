import { Ticket, X } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EventCard } from '@/components/common/event-presentation';
import { Pagination } from '@/components/common/pagination';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states';
import { CategoryRibbon } from '@/components/discovery/category-ribbon';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/lib/hooks';
import { useLanguage } from '@/lib/language';
import { usePublicEvents, type EventFilters } from '@/lib/queries';
import { cn } from '@/lib/utils';

type CatalogFilters = Pick<EventFilters, 'q' | 'category' | 'page' | 'limit'>;
type Patch = Partial<Omit<CatalogFilters, 'limit'>>;

function catalogParams(params: URLSearchParams) {
  const next = new URLSearchParams();
  for (const key of ['q', 'category', 'page']) {
    const value = params.get(key);
    if (value) next.set(key, value);
  }
  return next;
}

function readFilters(params: URLSearchParams): CatalogFilters {
  const page = Number(params.get('page') ?? '1');
  return {
    q: params.get('q') || undefined,
    category: params.get('category') || undefined,
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
    limit: 12,
  };
}

export function EventsPage() {
  const { t } = useLanguage();
  useDocumentTitle(t('Jelajah acara', 'Explore events'));
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => readFilters(params), [params]);
  const eventsQuery = usePublicEvents(filters);

  useEffect(() => {
    const next = catalogParams(params);
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [params, setParams]);

  function update(patch: Patch) {
    const next = catalogParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, String(value));
    }
    if (!('page' in patch)) next.delete('page');
    setParams(next, { flushSync: true });
  }

  const events = eventsQuery.data?.data ?? [];
  const meta = eventsQuery.data?.meta;

  return (
    <main className="container catalog-page py-6 sm:py-9">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {t('Cari event seru favoritmu', 'Find your next favourite event')}
      </h1>
      <CategoryRibbon selected={filters.category} onSelect={(category) => update({ category })} />
      {filters.q ? (
        <div className="mb-5">
          <button
            type="button"
            className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-medium text-blue-700"
            onClick={() => update({ q: undefined })}
            aria-label={`${t('Hapus pencarian', 'Clear search')}: ${filters.q}`}
          >
            <span className="min-w-0 break-words">
              {t('Cari', 'Search')}: {filters.q}
            </span>
            <X className="size-4 shrink-0" aria-hidden />
          </button>
        </div>
      ) : null}
      <section
        id="event-results"
        aria-labelledby="results-heading"
        aria-busy={eventsQuery.isFetching}
      >
        <h2 id="results-heading" className="sr-only">
          {t('Hasil pencarian acara', 'Event results')}
        </h2>
        <p className="mb-5 text-sm text-slate-600" role="status">
          {eventsQuery.isLoading
            ? t('Mencari acara...', 'Finding events...')
            : `${meta?.total ?? 0} ${t('acara', 'events')}`}
        </p>
        {eventsQuery.isLoading ? (
          <LoadingState variant="events" rows={4} />
        ) : eventsQuery.isError ? (
          <ErrorState error={eventsQuery.error} onRetry={() => void eventsQuery.refetch()} />
        ) : events.length === 0 ? (
          <EmptyState
            title={t('Belum ada acara yang cocok', 'No matching events yet')}
            description={t(
              'Coba kategori lain atau lihat semua acara yang tersedia.',
              'Try another category or browse all available events.',
            )}
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  type="button"
                  onClick={() => setParams(new URLSearchParams(), { flushSync: true })}
                >
                  {t('Lihat semua acara', 'View all events')}
                </Button>
                <Link to="/" className="text-link">
                  {t('Ke beranda', 'Go home')}
                </Link>
              </div>
            }
          />
        ) : (
          <>
            <div
              className={cn(
                'event-grid grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-4',
                eventsQuery.isFetching && 'opacity-60',
              )}
            >
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            <div className="mt-9">
              <Pagination
                meta={meta}
                onPageChange={(page) => {
                  update({ page });
                  document.getElementById('event-results')?.scrollIntoView({
                    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
                      ? 'auto'
                      : 'smooth',
                  });
                }}
              />
            </div>
          </>
        )}
      </section>
      <div className="mt-12 flex items-center gap-3 border-t border-slate-100 pt-6 text-sm text-slate-600">
        <Ticket className="size-5 text-blue-700" aria-hidden />
        <p>
          {t('Punya acara untuk dibagikan?', 'Have an event to share?')}{' '}
          <Link to="/organizer/apply" className="font-medium text-blue-700 hover:underline">
            {t('Jadi event creator', 'Become an event creator')}
          </Link>
        </p>
      </div>
    </main>
  );
}
