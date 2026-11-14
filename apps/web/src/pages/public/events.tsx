import {
  Filter,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EventCard } from '@/components/common/event-presentation';
import { Pagination } from '@/components/common/pagination';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useDebouncedValue, useDocumentTitle } from '@/lib/hooks';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { useCategories, usePublicEvents, type EventFilters } from '@/lib/queries';
import { cn } from '@/lib/utils';

const TIME_ZONE = 'Asia/Jakarta';

function readFilters(params: URLSearchParams): EventFilters {
  const number = Number(params.get('page') ?? '1');
  return {
    q: params.get('q') ?? undefined,
    category: params.get('category') ?? undefined,
    city: params.get('city') ?? undefined,
    dateFrom: params.get('dateFrom') ?? undefined,
    dateTo: params.get('dateTo') ?? undefined,
    price: (params.get('price') as EventFilters['price']) ?? 'all',
    availability: (params.get('availability') as EventFilters['availability']) ?? 'all',
    sort: (params.get('sort') as EventFilters['sort']) ?? 'starts_soon',
    page: Number.isFinite(number) && number > 0 ? number : 1,
    limit: 12,
  };
}

function dateInputValue(iso: string | undefined, _edge: 'start' | 'end') {
  if (!iso) return '';
  try {
    return formatInTimeZone(new Date(iso), TIME_ZONE, 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

function toIso(date: string, edge: 'start' | 'end') {
  if (!date) return undefined;
  return fromZonedTime(`${date}T${edge === 'start' ? '00:00:00' : '23:59:59'}`, TIME_ZONE).toISOString();
}

function FilterPanel({
  filters,
  update,
  categories,
  reset,
}: {
  filters: EventFilters;
  update: (patch: Record<string, string | number | undefined>) => void;
  categories: Array<{ id: string; name: string; slug: string }>;
  reset: () => void;
}) {
  const [city, setCity] = useState(filters.city ?? '');
  const debouncedCity = useDebouncedValue(city, 500);

  useEffect(() => {
    setCity(filters.city ?? '');
  }, [filters.city]);

  useEffect(() => {
    if (debouncedCity !== (filters.city ?? '')) {
      update({ city: debouncedCity || undefined });
    }
  }, [debouncedCity]);

  const selectClass =
    'h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 transition-colors focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100';

  return (
    <div className="space-y-6">
      {/* Kategori */}
      <div>
        <label htmlFor="filter-category" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
          Kategori Event
        </label>
        <select
          id="filter-category"
          className={selectClass}
          value={filters.category ?? ''}
          onChange={(event) => update({ category: event.target.value || undefined })}
        >
          <option value="">Semua Kategori</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Kota */}
      <div>
        <label htmlFor="filter-city" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
          Kota
        </label>
        <input
          id="filter-city"
          value={city}
          onChange={(event) => setCity(event.target.value)}
          placeholder="Contoh: Jakarta, Bandung..."
          className={selectClass}
        />
      </div>

      {/* Rentang Tanggal */}
      <fieldset>
        <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-700">
          Rentang Tanggal
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="filter-date-from" className="mb-1 block text-[11px] font-medium text-slate-500">
              Mulai
            </label>
            <input
              id="filter-date-from"
              type="date"
              className={selectClass}
              value={dateInputValue(filters.dateFrom, 'start')}
              onChange={(event) => update({ dateFrom: toIso(event.target.value, 'start') })}
            />
          </div>
          <div>
            <label htmlFor="filter-date-to" className="mb-1 block text-[11px] font-medium text-slate-500">
              Sampai
            </label>
            <input
              id="filter-date-to"
              type="date"
              className={selectClass}
              value={dateInputValue(filters.dateTo, 'end')}
              onChange={(event) => update({ dateTo: toIso(event.target.value, 'end') })}
            />
          </div>
        </div>
      </fieldset>

      {/* Harga */}
      <div>
        <label htmlFor="filter-price" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
          Jenis Tiket
        </label>
        <select
          id="filter-price"
          className={selectClass}
          value={filters.price}
          onChange={(event) => update({ price: event.target.value })}
        >
          <option value="all">Semua Harga</option>
          <option value="free">Gratis Saja</option>
          <option value="paid">Berbayar</option>
        </select>
      </div>

      {/* Ketersediaan */}
      <div>
        <label htmlFor="filter-availability" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
          Ketersediaan Tiket
        </label>
        <select
          id="filter-availability"
          className={selectClass}
          value={filters.availability}
          onChange={(event) => update({ availability: event.target.value })}
        >
          <option value="all">Semua Status</option>
          <option value="available">Masih Tersedia</option>
          <option value="sold_out">Sudah Habis</option>
        </select>
      </div>

      {/* Urutkan */}
      <fieldset>
        <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-700">
          Urutkan Menurut
        </legend>
        <div className="space-y-2">
          {[
            { value: 'starts_soon', label: 'Tanggal Terdekat' },
            { value: 'published_newest', label: 'Baru Dirilis' },
          ].map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg p-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <input
                type="radio"
                name="sort"
                value={option.value}
                checked={filters.sort === option.value}
                onChange={() => update({ sort: option.value })}
                className="h-4 w-4 accent-blue-600"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <Button
        type="button"
        variant="outline"
        onClick={reset}
        className="w-full rounded-xl border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      >
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        Reset Filter
      </Button>
    </div>
  );
}

export function EventsPage() {
  useDocumentTitle('Jelajah Acara & Konser di Indonesia');
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const [query, setQuery] = useState(filters.q ?? '');
  const debouncedQuery = useDebouncedValue(query, 400);
  const [mobileOpen, setMobileOpen] = useState(false);
  const eventsQuery = usePublicEvents(filters);
  const categoriesQuery = useCategories();

  useEffect(() => {
    setQuery(filters.q ?? '');
  }, [filters.q]);

  useEffect(() => {
    if (debouncedQuery !== (filters.q ?? '')) {
      const next = new URLSearchParams(searchParams);
      if (debouncedQuery) next.set('q', debouncedQuery);
      else next.delete('q');
      next.delete('page');
      setSearchParams(next, { replace: true });
    }
  }, [debouncedQuery]);

  function update(patch: Record<string, string | number | undefined>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === '' || value === 'all') next.delete(key);
      else next.set(key, String(value));
    }
    if (!('page' in patch)) next.delete('page');
    setSearchParams(next, { replace: true });
    setMobileOpen(false);
  }

  function reset() {
    setQuery('');
    setSearchParams(new URLSearchParams(), { replace: true });
  }

  function onSearch(event: FormEvent) {
    event.preventDefault();
    update({ q: query.trim() || undefined });
    document.getElementById('event-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const activeFilters = [
    filters.category
      ? {
          key: 'category',
          label:
            categoriesQuery.data?.categories.find((category) => category.slug === filters.category)?.name ??
            filters.category,
        }
      : null,
    filters.city ? { key: 'city', label: `Kota: ${filters.city}` } : null,
    filters.dateFrom ? { key: 'dateFrom', label: 'Dari tanggal pilihan' } : null,
    filters.dateTo ? { key: 'dateTo', label: 'Sampai tanggal pilihan' } : null,
    filters.price === 'free' ? { key: 'price', label: 'Gratis' } : null,
    filters.price === 'paid' ? { key: 'price', label: 'Berbayar' } : null,
    filters.availability === 'available' ? { key: 'availability', label: 'Tersedia' } : null,
    filters.availability === 'sold_out' ? { key: 'availability', label: 'Habis' } : null,
    filters.q ? { key: 'q', label: `Cari: ${filters.q}` } : null,
  ].filter((item): item is { key: string; label: string } => Boolean(item));

  const meta = eventsQuery.data?.meta;
  const events = eventsQuery.data?.data ?? [];

  const panel = (
    <FilterPanel
      filters={filters}
      update={update}
      categories={categoriesQuery.data?.categories ?? []}
      reset={reset}
    />
  );

  return (
    <main className="container py-8 sm:py-10">
      {/* Header Banner */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Katalog Eksklusif</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Jelajah Semua Acara
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Temukan tiket resmi konser musik, festival budaya, olahraga, dan workshop terpopuler di Indonesia.
          </p>
        </div>

        {/* Mobile Filter Button */}
        <div className="flex items-center gap-2 lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" className="h-10 rounded-xl border-slate-200 font-semibold text-slate-700 shadow-2xs">
                <SlidersHorizontal className="mr-2 h-4 w-4 text-blue-600" />
                Filter & Urutkan
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full overflow-y-auto border-slate-200 bg-white sm:max-w-md">
              <SheetHeader>
                <SheetTitle className="text-left font-black text-slate-900">Filter Acara</SheetTitle>
              </SheetHeader>
              <div className="mt-6">{panel}</div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Grid: Sidebar + Event Cards */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Desktop Sidebar Filter (Loket Style) */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-900">
                <Filter className="h-3.5 w-3.5 text-blue-600" />
                Filter Acara
              </p>
              {activeFilters.length > 0 && (
                <button
                  type="button"
                  onClick={reset}
                  className="text-[11px] font-bold text-blue-600 hover:underline"
                >
                  Reset
                </button>
              )}
            </div>
            {panel}
          </div>
        </aside>

        {/* Results Area */}
        <section id="event-results" aria-labelledby="results-heading">
          {/* Search bar & Sort Controls */}
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <form onSubmit={onSearch} className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="events-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari berdasarkan judul, nama artis, atau venue..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder:text-slate-400 transition-colors focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </form>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                {eventsQuery.isLoading ? 'Memuat...' : `${meta?.total ?? 0} acara`}
              </span>
              <select
                value={filters.sort}
                onChange={(event) => update({ sort: event.target.value })}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
              >
                <option value="starts_soon">Tanggal Terdekat</option>
                <option value="published_newest">Baru Dirilis</option>
              </select>
            </div>
          </div>

          {/* Active Filter Chips */}
          {activeFilters.length ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Filter Aktif:</span>
              {activeFilters.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => update({ [item.key]: undefined })}
                  className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 shadow-2xs hover:bg-blue-100 transition-colors"
                >
                  {item.label}
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              ))}
              <button
                type="button"
                onClick={reset}
                className="text-xs font-bold text-rose-600 hover:underline px-2"
              >
                Hapus Semua
              </button>
            </div>
          ) : null}

          {/* Event Results Grid */}
          <div className="mt-6">
            {eventsQuery.isLoading ? (
              <LoadingState rows={4} />
            ) : eventsQuery.isError ? (
              <ErrorState
                error={eventsQuery.error}
                onRetry={() => void eventsQuery.refetch()}
                className="mt-6"
              />
            ) : events.length === 0 ? (
              <EmptyState
                className="mt-6 rounded-2xl border border-slate-200 bg-white p-12 text-center"
                title="Tidak Ada Acara Ditemukan"
                description="Coba ubah kata kunci pencarian atau bersihkan filter kota/kategori untuk melihat acara lainnya."
                action={
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button
                      type="button"
                      onClick={reset}
                      className="rounded-xl bg-blue-600 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                    >
                      Reset Semua Filter
                    </Button>
                    <Link to="/">
                      <Button type="button" variant="outline" className="rounded-xl border-slate-200 text-xs font-bold">
                        Kembali ke Beranda
                      </Button>
                    </Link>
                  </div>
                }
              />
            ) : (
              <>
                <div
                  className={cn(
                    'grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3',
                    eventsQuery.isFetching && 'opacity-60 transition-opacity',
                  )}
                >
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} layout="grid" />
                  ))}
                </div>

                <div className="mt-8 border-t border-slate-100 pt-6">
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
          </div>
        </section>
      </div>
    </main>
  );
}
