import { Filter, RotateCcw, X } from 'lucide-react';
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
    limit: 10,
  };
}

function dateInputValue(iso: string | undefined, edge: 'start' | 'end') {
  if (!iso) return '';
  try {
    return formatInTimeZone(new Date(iso), TIME_ZONE, 'yyyy-MM-dd');
  } catch {
    return edge === 'start' ? '' : '';
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
    'h-10 w-full rounded-md border border-ink/20 bg-card px-3 text-sm outline-none focus-visible:border-ink';

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="filter-category" className="mb-1.5 block text-sm font-semibold">
          Kategori
        </label>
        <select
          id="filter-category"
          className={selectClass}
          value={filters.category ?? ''}
          onChange={(event) => update({ category: event.target.value || undefined })}
        >
          <option value="">Semua kategori</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filter-city" className="mb-1.5 block text-sm font-semibold">
          Kota
        </label>
        <input
          id="filter-city"
          value={city}
          onChange={(event) => setCity(event.target.value)}
          placeholder="Contoh: Jakarta"
          className={selectClass}
        />
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Tanggal</legend>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="filter-date-from" className="mb-1 block text-xs text-muted-foreground">
              Dari
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
            <label htmlFor="filter-date-to" className="mb-1 block text-xs text-muted-foreground">
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

      <div>
        <label htmlFor="filter-price" className="mb-1.5 block text-sm font-semibold">
          Harga
        </label>
        <select
          id="filter-price"
          className={selectClass}
          value={filters.price}
          onChange={(event) => update({ price: event.target.value })}
        >
          <option value="all">Semua harga</option>
          <option value="free">Gratis</option>
          <option value="paid">Berbayar</option>
        </select>
      </div>

      <div>
        <label htmlFor="filter-availability" className="mb-1.5 block text-sm font-semibold">
          Ketersediaan
        </label>
        <select
          id="filter-availability"
          className={selectClass}
          value={filters.availability}
          onChange={(event) => update({ availability: event.target.value })}
        >
          <option value="all">Semua status</option>
          <option value="available">Masih tersedia</option>
          <option value="sold_out">Tiket habis</option>
        </select>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Urutkan</legend>
        <div className="space-y-1.5">
          {[
            { value: 'starts_soon', label: 'Tanggal terdekat' },
            { value: 'published_newest', label: 'Baru dipublikasikan' },
          ].map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="sort"
                value={option.value}
                checked={filters.sort === option.value}
                onChange={() => update({ sort: option.value })}
                className="h-4 w-4 accent-[#B8432C]"
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
        className="w-full border-ink/25 bg-transparent"
      >
        <RotateCcw className="h-4 w-4" aria-hidden />
        Atur ulang filter
      </Button>
    </div>
  );
}

export function EventsPage() {
  useDocumentTitle('Jelajah acara');
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
    filters.dateFrom ? { key: 'dateFrom', label: 'Tanggal mulai' } : null,
    filters.dateTo ? { key: 'dateTo', label: 'Tanggal akhir' } : null,
    filters.price === 'free' ? { key: 'price', label: 'Gratis' } : null,
    filters.price === 'paid' ? { key: 'price', label: 'Berbayar' } : null,
    filters.availability === 'available' ? { key: 'availability', label: 'Masih tersedia' } : null,
    filters.availability === 'sold_out' ? { key: 'availability', label: 'Tiket habis' } : null,
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
    <main className="container py-8 sm:py-12">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-olive">Jelajah</p>
        <h1 className="mt-2 font-display text-5xl leading-[0.95] tracking-tightest sm:text-6xl">
          Cari acara yang pas.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Filter disimpan di URL, jadi tautan hasil pencarian bisa kamu kirim ke orang lain dan tetap
          bekerja setelah halaman dimuat ulang.
        </p>
      </div>

      <form onSubmit={onSearch} className="mt-6 flex gap-2" role="search">
        <label htmlFor="events-search" className="sr-only">
          Cari acara
        </label>
        <input
          id="events-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Judul, organizer, kota, atau kategori"
          className="h-11 flex-1 rounded-md border border-ink/25 bg-card px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ink"
        />
        <Button type="submit" className="h-11 bg-ink px-5 text-paper hover:bg-ink/90">
          Cari
        </Button>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" className="h-11 border-ink/25 bg-transparent lg:hidden">
              <Filter className="h-4 w-4" aria-hidden />
              Filter
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full overflow-y-auto border-warm-border bg-paper sm:max-w-md">
            <SheetHeader>
              <SheetTitle className="text-left">Filter acara</SheetTitle>
            </SheetHeader>
            <div className="mt-6">{panel}</div>
          </SheetContent>
        </Sheet>
      </form>

      <div className="mt-8 grid gap-10 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 border-t border-ink pt-4">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.12em]">Filter</p>
            {panel}
          </div>
        </aside>

        <section id="event-results" aria-labelledby="results-heading">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink pb-3">
            <div>
              <h2 id="results-heading" className="text-lg font-bold">
                {eventsQuery.isLoading ? 'Memuat acara' : `${meta?.total ?? 0} acara ditemukan`}
              </h2>
              {filters.sort === 'published_newest' ? (
                <p className="text-xs text-muted-foreground">Diurutkan dari yang baru dipublikasikan.</p>
              ) : (
                <p className="text-xs text-muted-foreground">Diurutkan dari tanggal terdekat.</p>
              )}
            </div>
            <label className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Urutkan</span>
              <select
                value={filters.sort}
                onChange={(event) => update({ sort: event.target.value })}
                className="h-9 rounded-md border border-ink/20 bg-card px-2 text-xs font-semibold"
              >
                <option value="starts_soon">Tanggal terdekat</option>
                <option value="published_newest">Baru dipublikasikan</option>
              </select>
            </label>
          </div>

          {activeFilters.length ? (
            <div className="flex flex-wrap gap-2 py-3">
              {activeFilters.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => update({ [item.key]: undefined })}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-warm-border bg-warm-muted px-2 py-1 text-xs font-semibold"
                >
                  {item.label}
                  <X className="h-3 w-3" aria-hidden />
                  <span className="sr-only">Hapus filter {item.label}</span>
                </button>
              ))}
              <button type="button" onClick={reset} className="px-1 text-xs font-semibold text-brick">
                Hapus semua
              </button>
            </div>
          ) : null}

          {eventsQuery.isLoading ? (
            <LoadingState rows={5} />
          ) : eventsQuery.isError ? (
            <ErrorState
              error={eventsQuery.error}
              onRetry={() => void eventsQuery.refetch()}
              className="mt-6"
            />
          ) : events.length === 0 ? (
            <EmptyState
              className="mt-6"
              title="Tidak ada acara yang cocok"
              description="Coba longgarkan filter, hapus kata kunci, atau lihat semua acara yang sedang tayang."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button type="button" onClick={reset} className="bg-ink text-paper">
                    Atur ulang filter
                  </Button>
                  <Link to="/">
                    <Button type="button" variant="outline" className="border-ink/25">
                      Ke beranda
                    </Button>
                  </Link>
                </div>
              }
            />
          ) : (
            <>
              <div className={cn('mt-2', eventsQuery.isFetching && 'opacity-60 transition-opacity')}>
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
              <Pagination
                meta={meta}
                onPageChange={(page) => {
                  update({ page });
                  document.getElementById('event-results')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="mt-6"
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}