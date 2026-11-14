import { ArrowRight, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EventCard, EventPoster } from '@/components/common/event-presentation';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states';
import { useCategories, usePublicEvents } from '@/lib/queries';
import { useDocumentTitle } from '@/lib/hooks';
import { dateParts, formatDateLong, formatIDR, formatTime } from '@/lib/format';

export function HomePage() {
  useDocumentTitle('');
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const eventsQuery = usePublicEvents({ limit: 6, availability: 'available', sort: 'starts_soon' });
  const categoriesQuery = useCategories();

  const events = eventsQuery.data?.data ?? [];
  const lead = events[0];
  const rest = events.slice(1);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    navigate(query.trim() ? `/events?q=${encodeURIComponent(query.trim())}` : '/events');
  }

  return (
    <main>
      <section className="border-b border-warm-border">
        <div className="container grid gap-10 py-10 sm:py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:py-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-olive">
              Panduan acara · Indonesia
            </p>
            <h1 className="mt-4 font-display text-5xl leading-[0.95] tracking-tightest sm:text-6xl lg:text-7xl">
              Acara yang layak keluar rumah.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
              Temukan konser, festival, dan pertemuan yang tiketnya benar-benar tersedia. Harga, sisa
              kuota, dan waktu penjualan terlihat sebelum kamu membayar.
            </p>
            <form onSubmit={onSearch} className="mt-7 flex max-w-lg flex-col gap-2 sm:flex-row" role="search">
              <label htmlFor="home-search" className="sr-only">
                Cari acara, kota, atau organizer
              </label>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input
                  id="home-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari acara, kota, atau organizer"
                  className="h-11 w-full rounded-md border border-ink/25 bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ink"
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brick px-5 text-sm font-semibold text-paper transition-colors hover:bg-brick/90"
              >
                Cari acara
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </form>
            {categoriesQuery.data?.categories.length ? (
              <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-olive">Indeks</span>
                {categoriesQuery.data.categories.map((category) => (
                  <Link
                    key={category.id}
                    to={`/events?category=${category.slug}`}
                    className="underline decoration-warm-border underline-offset-4 hover:decoration-vermilion"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative">
            {eventsQuery.isLoading ? (
              <div className="aspect-[4/5] w-full animate-pulse bg-warm-muted" aria-hidden />
            ) : eventsQuery.isError ? (
              <ErrorState error={eventsQuery.error} onRetry={() => void eventsQuery.refetch()} />
            ) : lead ? (
              <Link to={`/events/${lead.slug}`} className="group block">
                <EventPoster
                  title={lead.title}
                  coverKey={lead.coverKey}
                  category={lead.category.name}
                  startsAt={lead.startsAt}
                  city={lead.city}
                  timezone={lead.timezone}
                  className="rounded-sm shadow-[0_1px_0_0_rgba(25,27,26,0.12)]"
                  sizes="(min-width: 1024px) 560px, 90vw"
                />
                <div className="mt-3 flex flex-wrap items-start justify-between gap-2 border-t border-ink/20 pt-3">
                  <div>
                    <p className="text-sm font-bold leading-snug group-hover:underline group-hover:decoration-vermilion group-hover:decoration-2 group-hover:underline-offset-4">
                      {lead.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateLong(lead.startsAt, lead.timezone)} · {formatTime(lead.startsAt, lead.timezone)}
                      {lead.city ? ` · ${lead.city}` : ''}
                    </p>
                  </div>
                  <span className="text-sm font-bold tabular-nums">
                    {lead.priceFrom === 0 ? 'Gratis' : lead.priceFrom !== null ? formatIDR(lead.priceFrom) : 'Harga menyusul'}
                  </span>
                </div>
              </Link>
            ) : (
              <EmptyState
                title="Belum ada acara yang tayang"
                description="Event yang sudah dipublikasikan organizer akan tampil di sini. Sementara itu, kamu bisa membuka halaman jelajah untuk melihat semua acara."
                action={
                  <Link to="/events" className="rounded-md border border-ink px-4 py-2 text-sm font-semibold">
                    Buka jelajah acara
                  </Link>
                }
              />
            )}
          </div>
        </div>
      </section>

      <section className="container py-10 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-olive">Sedang dijual</p>
            <h2 className="mt-1 font-display text-4xl tracking-tightest sm:text-5xl">Acara terdekat</h2>
          </div>
          <Link
            to="/events"
            className="inline-flex items-center gap-2 text-sm font-semibold underline decoration-warm-border underline-offset-4 hover:decoration-vermilion"
          >
            Lihat semua acara
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        {eventsQuery.isLoading ? (
          <LoadingState rows={3} />
        ) : eventsQuery.isError ? (
          <ErrorState error={eventsQuery.error} onRetry={() => void eventsQuery.refetch()} className="mt-6" />
        ) : rest.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            {lead
              ? 'Baru ada satu acara yang sedang dijual. Daftar akan bertambah saat organizer memublikasikan event lain.'
              : 'Belum ada acara yang bisa ditampilkan. Coba buka halaman jelajah acara.'}
          </p>
        ) : (
          <div className="mt-2">
            {rest.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {categoriesQuery.data?.categories.length ? (
        <section className="border-y border-warm-border bg-warm-muted/40">
          <div className="container py-10 sm:py-12">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-olive">Indeks kategori</p>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              {categoriesQuery.data.categories.map((category, index) => (
                <Link
                  key={category.id}
                  to={`/events?category=${category.slug}`}
                  className="group flex items-baseline gap-2 text-lg font-semibold"
                >
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="border-b border-transparent group-hover:border-vermilion">{category.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="container py-12 sm:py-16">
        <div className="grid gap-8 bg-ink px-6 py-8 text-paper sm:px-10 sm:py-12 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-paper/60">Untuk organizer</p>
            <h2 className="mt-3 max-w-2xl font-display text-4xl leading-[0.98] tracking-tightest sm:text-5xl">
              Jual tiket tanpa kehilangan kendali atas data peserta.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-paper/70">
              Buat event, atur tipe tiket dan kupon, pantau pesanan, lalu pindai tiket di pintu masuk.
              Setiap pemindaian tercatat di server dan tiket yang sama tidak bisa dipakai dua kali.
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <Link
              to="/organizer/apply"
              className="inline-flex items-center justify-center rounded-md bg-paper px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-warm-muted"
            >
              Ajukan akun organizer
            </Link>
            <Link to="/login" className="text-center text-sm font-semibold text-paper/80 underline underline-offset-4">
              Sudah punya akun? Masuk
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}