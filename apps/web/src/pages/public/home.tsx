import { ArrowRight, MapPin, Ticket, ArrowUpRight, Megaphone } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EventCard } from '@/components/common/event-presentation';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states';
import { EventCarousel } from '@/components/discovery/event-carousel';
import { useLanguage } from '@/lib/language';
import { useDocumentTitle } from '@/lib/hooks';
import { usePublicEvents } from '@/lib/queries';
import { cn } from '@/lib/utils';

const cities = ['', 'Jakarta', 'Bandung', 'Yogyakarta', 'Surabaya', 'Denpasar'];

export function HomePage() {
  const { t } = useLanguage();
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
  const events = eventsQuery.data?.data ?? [];

  return (
    <main id="main-content" className="discovery-page">
      <h1 className="sr-only">
        {t('Temukan acara dan pengalaman seru di Gofest', 'Find events and experiences on Gofest')}
      </h1>
      <EventCarousel events={heroQuery.data?.data ?? []} />
      <div className="container">
        <section className="py-8 sm:py-10" aria-labelledby="featured-heading">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 id="featured-heading" className="section-title flex items-center gap-3">
              <Megaphone className="size-6 shrink-0 text-blue-950" aria-hidden />
              {t('Event Seru Untukmu', 'Events for you')}
            </h2>
            <Link
              to={city ? `/events?city=${encodeURIComponent(city)}` : '/events'}
              className="text-link"
            >
              {t('Lihat semua', 'View all')} <ArrowRight className="size-4" aria-hidden />
            </Link>
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
              <h2 id="creator-heading" className="text-xl font-semibold sm:text-2xl">
                {t('Punya ide acara? Waktunya jadi nyata.', 'An event in mind? Make it happen.')}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {t(
                  'Buat acara, atur penjualan tiket, dan sambut penontonmu di Gofest.',
                  'Create your event, manage ticket sales, and welcome your audience on Gofest.',
                )}
              </p>
            </div>
          </div>
          <Link to="/organizer/apply" className="primary-action shrink-0">
            {t('Jadi Partner Kami', 'Partner with us')}{' '}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </section>
        <section className="py-10 sm:py-14" aria-labelledby="cities-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="cities-heading" className="section-title flex items-center gap-3">
              <MapPin className="size-6 shrink-0 text-blue-950" aria-hidden />
              {t('Jelajahi Event di Kotamu', 'Explore events in your city')}
            </h2>
            <Link to="/events" className="text-link">
              {t('Lihat semua', 'View all')} <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="city-destinations">
            {cities.filter(Boolean).map((value, index) => (
              <Link
                to={`/events?city=${encodeURIComponent(value)}`}
                key={value}
                className="city-destination group"
              >
                <span className="city-name">
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
