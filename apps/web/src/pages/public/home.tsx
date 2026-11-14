import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Mic2,
  Music,
  Palette,
  Search,
  Sparkles,
  Trophy,
  Users2,
  Zap,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EventCard } from '@/components/common/event-presentation';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states';
import { assetUrl } from '@/lib/assets';
import { formatDateLong, formatIDR, formatTime } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { useCategories, usePublicEvents } from '@/lib/queries';

const POPULAR_CITIES = [
  { name: 'Semua Kota', city: '' },
  { name: 'Jakarta', city: 'Jakarta' },
  { name: 'Bandung', city: 'Bandung' },
  { name: 'Surabaya', city: 'Surabaya' },
  { name: 'Bali', city: 'Bali' },
  { name: 'Yogyakarta', city: 'Yogyakarta' },
];

const CATEGORY_ICONS: Record<string, typeof Music> = {
  musik: Music,
  festival: Sparkles,
  olahraga: Trophy,
  pameran: Palette,
  workshop: Users2,
  'stand-up-comedy': Mic2,
  standup: Mic2,
};

export function HomePage() {
  useDocumentTitle('Beli Tiket Konser, Festival & Event Resmi');
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);

  const eventsQuery = usePublicEvents({
    limit: 12,
    availability: 'available',
    sort: 'starts_soon',
    city: selectedCity || undefined,
  });
  const categoriesQuery = useCategories();

  const events = eventsQuery.data?.data ?? [];
  const heroEvents = events.slice(0, 5);

  // Auto advance hero carousel every 6s
  useEffect(() => {
    if (heroEvents.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroEvents.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [heroEvents.length]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (selectedCity) params.set('city', selectedCity);
    navigate(`/events?${params.toString()}`);
  }

  const activeHero = heroEvents[currentSlide] ?? heroEvents[0];

  return (
    <main className="min-h-screen">
      {/* 1. Hero Promotional Banner Carousel (Loket & Artatix style) */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        {eventsQuery.isLoading ? (
          <div className="container py-8 sm:py-12">
            <div className="aspect-[21/9] min-h-[360px] w-full animate-pulse rounded-2xl bg-slate-800" />
          </div>
        ) : eventsQuery.isError ? (
          <div className="container py-12">
            <ErrorState error={eventsQuery.error} onRetry={() => void eventsQuery.refetch()} />
          </div>
        ) : activeHero ? (
          <div className="relative">
            {/* Slide Background Visual */}
            <div className="relative min-h-[460px] w-full sm:min-h-[520px] lg:min-h-[580px]">
              {activeHero.coverKey ? (
                <img
                  src={assetUrl(activeHero.coverKey) ?? undefined}
                  alt={activeHero.title}
                  className="absolute inset-0 h-full w-full object-cover opacity-60 transition-opacity duration-700"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-950 via-slate-900 to-indigo-950 opacity-90" />
              )}

              {/* Gradient Dark Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/30" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />

              {/* Content Box */}
              <div className="container relative z-10 flex min-h-[460px] flex-col justify-end pb-16 pt-24 sm:min-h-[520px] sm:pb-20 lg:min-h-[580px]">
                <div className="max-w-2xl">
                  {/* Category & Status Pill */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-xs">
                      {activeHero.category.name}
                    </span>
                    <span className="rounded-full bg-coral-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-xs">
                      Trending Sekarang
                    </span>
                    {activeHero.city && (
                      <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
                        {activeHero.city}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                    {activeHero.title}
                  </h1>

                  {/* Date & Location */}
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-300 sm:text-sm">
                    <div className="flex items-center gap-1.5 text-blue-400">
                      <CalendarDays className="h-4 w-4" />
                      <span>
                        {formatDateLong(activeHero.startsAt, activeHero.timezone)} ·{' '}
                        {formatTime(activeHero.startsAt, activeHero.timezone)}
                      </span>
                    </div>
                    {activeHero.venueName && (
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span>{activeHero.venueName}</span>
                      </div>
                    )}
                  </div>

                  {/* Price and CTA Actions */}
                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                        Harga Tiket
                      </p>
                      <p className="text-xl font-black text-white sm:text-2xl">
                        {activeHero.priceFrom === 0
                          ? 'Gratis'
                          : activeHero.priceFrom !== null
                            ? formatIDR(activeHero.priceFrom)
                            : 'Harga Menyusul'}
                      </p>
                    </div>

                    <Link
                      to={`/events/${activeHero.slug}`}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 text-sm font-bold text-white shadow-lg transition-all hover:bg-blue-500 hover:shadow-blue-600/30 active:scale-95"
                    >
                      Beli Tiket Sekarang
                      <ArrowRight className="h-4 w-4" />
                    </Link>

                    <Link
                      to={`/events/${activeHero.slug}`}
                      className="inline-flex h-12 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20"
                    >
                      Detail Event
                    </Link>
                  </div>
                </div>
              </div>

              {/* Carousel Controls (Arrows & Dots) */}
              {heroEvents.length > 1 && (
                <div className="container absolute inset-x-0 bottom-4 z-20 flex items-center justify-between sm:bottom-8">
                  {/* Slide Indicators */}
                  <div className="flex items-center gap-2">
                    {heroEvents.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentSlide(idx)}
                        className={`h-2.5 rounded-full transition-all duration-300 ${
                          currentSlide === idx ? 'w-8 bg-blue-500' : 'w-2.5 bg-white/40 hover:bg-white/70'
                        }`}
                        aria-label={`Lihat slide ${idx + 1}`}
                      />
                    ))}
                  </div>

                  {/* Arrow Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentSlide((prev) => (prev - 1 + heroEvents.length) % heroEvents.length)
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/25"
                      aria-label="Slide sebelumnya"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentSlide((prev) => (prev + 1) % heroEvents.length)}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/25"
                      aria-label="Slide berikutnya"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="container py-20 text-center">
            <h2 className="text-2xl font-bold">Belum Ada Event Aktif</h2>
            <p className="mt-2 text-sm text-slate-400">Silakan kembali lagi nanti untuk melihat event terbaru.</p>
          </div>
        )}
      </section>

      {/* 2. Quick Search & Discovery Filter Bar */}
      <section className="relative z-20 -mt-7">
        <div className="container">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xl sm:p-5">
            <form onSubmit={onSearch} className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari konser favorit, nama artis, festival, atau atraksi..."
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 transition-colors focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-700 active:scale-95"
              >
                <Search className="h-4 w-4" />
                Cari Tiket
              </button>
            </form>

            {/* City Shortcut Pills */}
            <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pilih Kota:</span>
              {POPULAR_CITIES.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setSelectedCity(item.city)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                    selectedCity === item.city
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Category Navigation Chips */}
      {categoriesQuery.data?.categories.length ? (
        <section className="container mt-12 sm:mt-16">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Eksplorasi</p>
              <h2 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">Kategori Event</h2>
            </div>
            <Link
              to="/events"
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              Lihat Semua
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {categoriesQuery.data.categories.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.slug] ?? Sparkles;
              return (
                <Link
                  key={cat.id}
                  to={`/events?category=${cat.slug}`}
                  className="group flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="mt-3 text-sm font-bold text-slate-800 transition-colors group-hover:text-blue-600">
                    {cat.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* 4. Featured / Trending Events Section */}
      <section className="container mt-14 sm:mt-18">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-coral-500" />
              <p className="text-xs font-bold uppercase tracking-wider text-coral-600">Paling Diminati</p>
            </div>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Event Pilihan Minggu Ini
            </h2>
          </div>
          <Link
            to="/events"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700"
          >
            Lihat Semua Acara
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {eventsQuery.isLoading ? (
          <div className="mt-6">
            <LoadingState rows={4} />
          </div>
        ) : events.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="Belum Ada Acara Yang Sesuai"
              description="Tidak ada acara ditemukan untuk filter kota saat ini. Coba pilih kota lain atau buka katalog lengkap."
              action={
                <button
                  type="button"
                  onClick={() => setSelectedCity('')}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                >
                  Tampilkan Semua Kota
                </button>
              }
            />
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {events.map((event) => (
              <EventCard key={event.id} event={event} layout="grid" />
            ))}
          </div>
        )}
      </section>

      {/* 5. City Explorer Section (Loket Style) */}
      <section className="container mt-16 sm:mt-20">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-10">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Destinasi Acara</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
              Jelajah Acara Seru di Kotamu
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Temukan festival musik, bazar kuliner, dan exhibition terpopuler di kota-kota besar Indonesia.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { name: 'Jakarta', events: 'Konser & Pameran Terbesar' },
              { name: 'Bandung', events: 'Indie Fest & Kreatif' },
              { name: 'Surabaya', events: 'Music Tour & Expo' },
              { name: 'Bali', events: 'Beach Fest & Budaya' },
              { name: 'Yogyakarta', events: 'Seni, Teater & Musik' },
            ].map((c) => (
              <Link
                key={c.name}
                to={`/events?city=${c.name}`}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-blue-400 hover:bg-white hover:shadow-md"
              >
                <div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <h3 className="mt-3 text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {c.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">{c.events}</p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-blue-600">
                  <span>Jelajahi</span>
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Commercial Organizer CTA Banner (Loket Creator Style) */}
      <section className="container mt-16 sm:mt-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 p-8 text-white shadow-xl sm:p-12 lg:p-16">
          <div className="relative z-10 grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-200 backdrop-blur-md">
                <Zap className="h-3.5 w-3.5 text-amber-300" />
                Untuk Kreator & Event Organizer
              </div>
              <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                Buat Event & Jual Tiket Lebih Cepat di Gofest
              </h2>
              <p className="mt-4 text-base leading-relaxed text-blue-100">
                Kelola penjualan tiket berbayar atau gratis, atur kupon diskon fleksibel, dan pantau
                kehadiran peserta secara realtime dengan aplikasi scanner QR camera langsung di HP panitia.
              </p>

              {/* Trust Value Points */}
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs font-semibold text-blue-200">
                <div className="rounded-xl bg-white/10 p-3 backdrop-blur-xs">
                  <span className="block font-bold text-white">⚡ Pencairan Cepat</span>
                  Dana aman dan transparan
                </div>
                <div className="rounded-xl bg-white/10 p-3 backdrop-blur-xs">
                  <span className="block font-bold text-white">📱 QR Scanner HP</span>
                  Check-in instan tanpa alat mahal
                </div>
                <div className="rounded-xl bg-white/10 p-3 backdrop-blur-xs">
                  <span className="block font-bold text-white">📊 Laporan Realtime</span>
                  Pantau traffic & omset langsung
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start gap-4 lg:items-end">
              <Link
                to="/organizer/apply"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-white px-8 text-base font-extrabold text-blue-900 shadow-xl transition-all hover:bg-blue-50 active:scale-95"
              >
                Mulai Buat Event Sekarang
                <ArrowRight className="h-5 w-5 text-blue-600" />
              </Link>
              <Link
                to="/login"
                className="text-sm font-semibold text-blue-200 underline underline-offset-4 hover:text-white"
              >
                Sudah punya akun organizer? Masuk ke Workspace
              </Link>
            </div>
          </div>

          {/* Decorative background circle */}
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
        </div>
      </section>
    </main>
  );
}
