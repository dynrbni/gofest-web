import { ArrowRight, MapPin, Ticket, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EventCard } from '@/components/common/event-presentation';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states';
import { EventCarousel } from '@/components/discovery/event-carousel';
import { CategoryIcon } from '@/components/discovery/category-icon';
import { categoryName } from '@/lib/categories';
import { useLanguage } from '@/lib/language';
import { useDocumentTitle } from '@/lib/hooks';
import { useCategories, usePublicEvents } from '@/lib/queries';
import { cn } from '@/lib/utils';

const cities = ['', 'Jakarta', 'Bandung', 'Yogyakarta', 'Surabaya', 'Denpasar'];

export function HomePage() {
  const { t, language } = useLanguage();
  useDocumentTitle(
    t('Temukan Konser, Festival & Pengalaman Seru', 'Discover concerts, festivals & experiences'),
  );
  const [city, setCity] = useState('');
  const heroQuery = usePublicEvents({ limit: 12, availability: 'available', sort: 'starts_soon' });
  const eventsQuery = usePublicEvents({
    limit: 12,
    availability: 'available',
    sort: 'starts_soon',
    city: city || undefined,
  });
  const categoriesQuery = useCategories();
  const events = eventsQuery.data?.data ?? [];

  return (
    <main id="main-content" className="discovery-page">
      <h1 className="sr-only">
        {t('Temukan acara dan pengalaman seru di GoFest', 'Find events and experiences on GoFest')}
      </h1>
      <div className="container pt-5 sm:pt-7">
        <EventCarousel events={heroQuery.data?.data ?? []} />
        {categoriesQuery.data?.categories.length ? (
          <nav className="category-strip" aria-label="Jelajahi kategori acara">
            <Link to="/events" className="category-shortcut group">
              <span className="category-symbol bg-blue-600 text-white">
                <Ticket aria-hidden />
              </span>
              <span>{t('Semua acara', 'All events')}</span>
            </Link>
            {categoriesQuery.data.categories.map((category) => {
              return (
                <Link
                  key={category.id}
                  to={`/events?category=${encodeURIComponent(category.slug)}`}
                  className="category-shortcut group"
                >
                  <CategoryIcon slug={category.slug} />
                  <span>{categoryName(category, language)}</span>
                </Link>
              );
            })}
          </nav>
        ) : null}
        <section className="py-8 sm:py-10" aria-labelledby="featured-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="featured-heading" className="section-title">
                {t('Ada acara seru buat kamu', 'Your next great experience')}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(
                  'Dari musisi favorit sampai pengalaman baru. Mulai di sini.',
                  'From favourite artists to something new. Start here.',
                )}
              </p>
            </div>
            <Link
              to={city ? `/events?city=${encodeURIComponent(city)}` : '/events'}
              className="text-link"
            >
              {t('Lihat semua', 'View all')} <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="city-tabs" aria-label="Pilih kota acara">
            {cities.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={city === value}
                onClick={() => setCity(value)}
                className={cn('city-tab', city === value && 'city-tab-active')}
              >
                {value || t('Semua kota', 'All cities')}
              </button>
            ))}
          </div>
          <div className="mt-6" aria-busy={eventsQuery.isFetching}>
            {eventsQuery.isLoading ? (
              <LoadingState rows={4} label="Memuat pilihan acara" />
            ) : eventsQuery.isError ? (
              <ErrorState error={eventsQuery.error} onRetry={() => void eventsQuery.refetch()} />
            ) : events.length === 0 ? (
              <EmptyState
                title={t(
                  `Belum ada acara${city ? ` di ${city}` : ''}`,
                  `No events yet${city ? ` in ${city}` : ''}`,
                )}
                description={t(
                  'Coba kota lain atau jelajahi seluruh acara yang tersedia.',
                  'Try another city or explore all available events.',
                )}
                action={
                  <button type="button" onClick={() => setCity('')} className="text-link">
                    {t('Tampilkan semua kota', 'Show all cities')}
                  </button>
                }
              />
            ) : (
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
            )}
          </div>
        </section>
        <section className="creator-banner" aria-labelledby="creator-heading">
          <div className="flex items-start gap-4 sm:items-center">
            <span className="hidden size-14 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-700 sm:flex">
              <Ticket className="size-7" aria-hidden />
            </span>
            <div>
              <h2 id="creator-heading" className="text-xl font-extrabold sm:text-2xl">
                {t('Punya ide acara? Waktunya jadi nyata.', 'An event in mind? Make it happen.')}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {t(
                  'Buat acara, atur penjualan tiket, dan sambut penontonmu di GoFest.',
                  'Create your event, manage ticket sales, and welcome your audience on GoFest.',
                )}
              </p>
            </div>
          </div>
          <Link to="/organizer/apply" className="primary-action shrink-0">
            {t('Buat acara', 'Create event')} <ArrowRight className="size-4" aria-hidden />
          </Link>
        </section>
        <section className="py-10 sm:py-14" aria-labelledby="cities-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="cities-heading" className="section-title">
                {t('Beda kota, beda cerita', 'A new city, a new story')}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(
                  'Cari pengalaman berikutnya, dekat rumah atau di kota tujuanmu.',
                  'Find your next experience, close to home or somewhere new.',
                )}
              </p>
            </div>
            <MapPin className="hidden size-7 text-blue-600 sm:block" aria-hidden />
          </div>
          <div className="mt-7 grid grid-cols-1 gap-5 min-[580px]:grid-cols-2 lg:grid-cols-3">
            {cities.filter(Boolean).map((value, index) => (
              <Link
                to={`/events?city=${encodeURIComponent(value)}`}
                key={value}
                className="city-destination group"
              >
                <span className="relative z-10 block text-2xl font-extrabold leading-snug">
                  {t('Kota', 'Explore')}
                  <br />
                  {value}
                </span>
                <ArrowUpRight className="relative z-10 mt-3 size-7 text-blue-600" aria-hidden />
                <span
                  className="city-landmark"
                  style={{ backgroundPosition: `${index * 25}% center` }}
                  aria-hidden
                />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
