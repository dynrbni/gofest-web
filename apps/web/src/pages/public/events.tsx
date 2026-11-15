import {
  ArrowDownWideNarrow,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Ticket,
  X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as Popover from '@radix-ui/react-popover';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { EventCard } from '@/components/common/event-presentation';
import { Pagination } from '@/components/common/pagination';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states';
import { CategoryIcon } from '@/components/discovery/category-icon';
import { categoryName } from '@/lib/categories';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/lib/hooks';
import { useLanguage } from '@/lib/language';
import { useCategories, usePublicEvents, type EventFilters } from '@/lib/queries';
import { cn } from '@/lib/utils';

const TIME_ZONE = 'Asia/Jakarta';
type Patch = Record<string, string | number | undefined>;

function readFilters(params: URLSearchParams): EventFilters {
  const page = Number(params.get('page') ?? '1');
  return {
    q: params.get('q') || undefined,
    category: params.get('category') || undefined,
    city: params.get('city') || undefined,
    dateFrom: params.get('dateFrom') || undefined,
    dateTo: params.get('dateTo') || undefined,
    price:
      params.get('price') === 'free' ? 'free' : params.get('price') === 'paid' ? 'paid' : 'all',
    availability:
      params.get('availability') === 'available'
        ? 'available'
        : params.get('availability') === 'sold_out'
          ? 'sold_out'
          : 'all',
    sort: params.get('sort') === 'published_newest' ? 'published_newest' : 'starts_soon',
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
    limit: 12,
  };
}

function dateValue(iso?: string) {
  if (!iso) return '';
  try {
    return formatInTimeZone(new Date(iso), TIME_ZONE, 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

function toIso(date: string, end = false) {
  return date
    ? fromZonedTime(`${date}T${end ? '23:59:59' : '00:00:00'}`, TIME_ZONE).toISOString()
    : undefined;
}

function DateFilter({
  filters,
  update,
}: {
  filters: EventFilters;
  update: (patch: Patch) => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const invalid = Boolean(from && to && from > to);
  return (
    <Popover.Root
      open={open}
      onOpenChange={(value) => {
        if (value) {
          setFrom(dateValue(filters.dateFrom));
          setTo(dateValue(filters.dateTo));
        }
        setOpen(value);
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn('catalog-filter', (filters.dateFrom || filters.dateTo) && 'text-blue-700')}
        >
          <CalendarDays className="size-4" aria-hidden />
          <span>
            {filters.dateFrom || filters.dateTo
              ? t('Tanggal pilihan', 'Selected dates')
              : t('Semua tanggal', 'Any date')}
          </span>
          <ChevronDown className="ml-auto size-4" aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={10}
          collisionPadding={16}
          className="z-50 w-[min(340px,calc(100vw-32px))] rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
          aria-label={t('Pilih rentang tanggal', 'Choose date range')}
        >
          <h2 className="font-semibold">{t('Kapan mau pergi?', 'When are you going?')}</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (invalid) return;
              update({ dateFrom: toIso(from), dateTo: toIso(to, true) });
              setOpen(false);
            }}
          >
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label htmlFor="events-date-from" className="min-w-0 text-xs font-medium">
                {t('Mulai', 'From')}
                <input
                  id="events-date-from"
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  className="mt-2 h-11 w-full min-w-0 rounded-lg border border-slate-200 px-2"
                />
              </label>
              <label htmlFor="events-date-to" className="min-w-0 text-xs font-medium">
                {t('Sampai', 'To')}
                <input
                  id="events-date-to"
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(event) => setTo(event.target.value)}
                  className="mt-2 h-11 w-full min-w-0 rounded-lg border border-slate-200 px-2"
                />
              </label>
            </div>
            {invalid ? (
              <p className="mt-3 text-xs text-rose-700" role="alert">
                {t(
                  'Tanggal akhir harus setelah tanggal mulai.',
                  'End date must be on or after the start date.',
                )}
              </p>
            ) : null}
            <div className="mt-5 flex justify-between gap-3">
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  update({ dateFrom: undefined, dateTo: undefined });
                  setOpen(false);
                }}
              >
                {t('Hapus tanggal', 'Clear dates')}
              </button>
              <Button type="submit" disabled={invalid}>
                {t('Terapkan', 'Apply')}
              </Button>
            </div>
          </form>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function EventsPage() {
  const { t, language } = useLanguage();
  useDocumentTitle(t('Jelajah acara', 'Explore events'));
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => readFilters(params), [params]);
  const eventsQuery = usePublicEvents(filters);
  const categoriesQuery = useCategories();
  const ribbon = useRef<HTMLElement>(null);
  const categories = categoriesQuery.data?.categories ?? [];
  function update(patch: Patch) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === '' || value === 'all') next.delete(key);
      else next.set(key, String(value));
    }
    if (!('page' in patch)) next.delete('page');
    setParams(next, { flushSync: true });
  }
  function reset() {
    setParams(new URLSearchParams(), { flushSync: true });
  }
  function scrollCategories(direction: number) {
    ribbon.current?.scrollBy({
      left: direction * 400,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }
  const events = eventsQuery.data?.data ?? [];
  const meta = eventsQuery.data?.meta;
  const activeFilters = [
    filters.q ? { key: 'q', label: `${t('Cari', 'Search')}: ${filters.q}` } : null,
    filters.city ? { key: 'city', label: filters.city } : null,
    filters.dateFrom
      ? { key: 'dateFrom', label: `${t('Dari', 'From')}: ${dateValue(filters.dateFrom)}` }
      : null,
    filters.dateTo
      ? { key: 'dateTo', label: `${t('Sampai', 'To')}: ${dateValue(filters.dateTo)}` }
      : null,
  ].filter((item): item is { key: string; label: string } => Boolean(item));
  const hasFilters = Boolean(
    filters.q ||
    filters.category ||
    filters.city ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.price !== 'all' ||
    filters.availability !== 'all',
  );
  return (
    <main className="container catalog-page py-8 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {t('Cari event seru favoritmu', 'Find your next favourite event')}
      </h1>
      <div className="relative mt-8 sm:mt-10">
        <button
          type="button"
          className="category-scroll category-scroll-left"
          onClick={() => scrollCategories(-1)}
          aria-label={t('Kategori sebelumnya', 'Previous categories')}
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <nav
          ref={ribbon}
          className="catalog-categories"
          aria-label={t('Kategori acara', 'Event categories')}
        >
          <button
            type="button"
            className={cn('catalog-category', !filters.category && 'catalog-category-active')}
            aria-pressed={!filters.category}
            onClick={() => update({ category: undefined })}
          >
            <CategoryIcon />
            <span>{t('Semua acara', 'All events')}</span>
          </button>
          {categories.map((category) => (
            <button
              type="button"
              key={category.id}
              className={cn(
                'catalog-category',
                filters.category === category.slug && 'catalog-category-active',
              )}
              aria-pressed={filters.category === category.slug}
              onClick={() => update({ category: category.slug })}
            >
              <CategoryIcon slug={category.slug} />
              <span>{categoryName(category, language)}</span>
            </button>
          ))}
        </nav>
        <button
          type="button"
          className="category-scroll category-scroll-right"
          onClick={() => scrollCategories(1)}
          aria-label={t('Kategori berikutnya', 'Next categories')}
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>
      {categoriesQuery.isError ? (
        <p role="status" className="mt-3 text-sm text-slate-600">
          {t('Kategori belum tersedia.', 'Categories are unavailable.')}{' '}
          <button
            type="button"
            className="text-blue-700 underline"
            onClick={() => void categoriesQuery.refetch()}
          >
            {t('Coba lagi', 'Try again')}
          </button>
        </p>
      ) : null}
      <div className="catalog-filters">
        <select
          aria-label={t('Lokasi acara', 'Event location')}
          value={filters.city ?? ''}
          onChange={(event) => update({ city: event.target.value })}
          className={cn('catalog-filter', filters.city && 'text-blue-700')}
        >
          <option value="">{t('Semua lokasi', 'All locations')}</option>
          {Array.from(
            new Set([
              'Jakarta',
              'Bandung',
              'Yogyakarta',
              'Surabaya',
              'Denpasar',
              'Bali',
              ...(filters.city ? [filters.city] : []),
            ]),
          ).map((city) => (
            <option key={city}>{city}</option>
          ))}
        </select>
        <DateFilter filters={filters} update={update} />
        <select
          aria-label={t('Harga tiket', 'Ticket price')}
          value={filters.price}
          onChange={(event) => update({ price: event.target.value })}
          className={cn('catalog-filter', filters.price !== 'all' && 'text-blue-700')}
        >
          <option value="all">{t('Semua harga', 'Any price')}</option>
          <option value="free">{t('Gratis', 'Free')}</option>
          <option value="paid">{t('Berbayar', 'Paid')}</option>
        </select>
        <select
          aria-label={t('Ketersediaan tiket', 'Ticket availability')}
          value={filters.availability}
          onChange={(event) => update({ availability: event.target.value })}
          className={cn('catalog-filter', filters.availability !== 'all' && 'text-blue-700')}
        >
          <option value="all">{t('Semua status', 'Any availability')}</option>
          <option value="available">{t('Masih tersedia', 'Available')}</option>
          <option value="sold_out">{t('Tiket habis', 'Sold out')}</option>
        </select>
        <button
          type="button"
          onClick={reset}
          disabled={!hasFilters}
          className="catalog-filter justify-center text-blue-700 hover:bg-blue-50 disabled:text-slate-500"
        >
          <RotateCcw className="size-4" aria-hidden />
          {t('Reset', 'Reset')}
        </button>
        <div className="catalog-sort">
          <ArrowDownWideNarrow className="size-4 shrink-0" aria-hidden />
          <select
            aria-label={t('Urutkan hasil acara', 'Sort events')}
            value={filters.sort}
            onChange={(event) => update({ sort: event.target.value })}
            className="catalog-filter w-full"
          >
            <option value="starts_soon">{t('Mulai segera', 'Starting soon')}</option>
            <option value="published_newest">{t('Baru dirilis', 'Recently added')}</option>
          </select>
        </div>
      </div>
      {activeFilters.length ? (
        <div className="mb-5 flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 text-xs font-medium text-blue-700"
              onClick={() => update({ [filter.key]: undefined })}
              aria-label={`${t('Hapus filter', 'Remove filter')}: ${filter.label}`}
            >
              {filter.label}
              <X className="size-3.5" aria-hidden />
            </button>
          ))}
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
          <LoadingState rows={4} />
        ) : eventsQuery.isError ? (
          <ErrorState error={eventsQuery.error} onRetry={() => void eventsQuery.refetch()} />
        ) : events.length === 0 ? (
          <EmptyState
            title={t('Belum ada acara yang cocok', 'No matching events yet')}
            description={t(
              'Coba pilihan kota, kategori, atau tanggal lain.',
              'Try another city, category, or date.',
            )}
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Button type="button" onClick={reset}>
                  {t('Hapus semua filter', 'Clear all filters')}
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
                <EventCard key={event.id} event={event} layout="grid" />
              ))}
            </div>
            <div className="mt-9">
              <Pagination
                meta={meta}
                onPageChange={(page) => {
                  update({ page });
                  document.getElementById('event-results')?.scrollIntoView({ behavior: 'smooth' });
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
