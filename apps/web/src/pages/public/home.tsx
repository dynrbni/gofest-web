import { ArrowRight, MapPin, Megaphone } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { EventCard } from '@/components/common/event-presentation';
import { EmptyState, ErrorState, LoadingState, PageLoading } from '@/components/common/states';
import { EventCarousel } from '@/components/discovery/event-carousel';
import { EventCategories } from '@/components/discovery/event-categories';
import { CitySkeleton } from '@/components/common/page-skeleton';
import { DeferredSection } from '@/components/common/deferred-section';
import { useLanguage } from '@/lib/language';
import { useDocumentTitle } from '@/lib/hooks';
import { usePublicEvents } from '@/lib/queries';
import { cn } from '@/lib/utils';

const CityDestinations = lazy(() =>
  import('@/components/discovery/city-destinations').then((module) => ({
    default: module.CityDestinations,
  })),
);

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

  if (heroQuery.isLoading) return <PageLoading label={t('Memuat beranda', 'Loading home')} />;

  return (
    <main id="main-content" className="discovery-page">
      <h1 className="sr-only">
        {t('Temukan acara dan pengalaman seru di Gofest', 'Find events and experiences on Gofest')}
      </h1>
      <EventCarousel events={heroQuery.data?.data ?? []} />
      <div className="container">
        <section className="py-8 sm:py-10" aria-labelledby="featured-heading">
          <div className="home-section-heading">
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
              <LoadingState variant="events" rows={4} label="Memuat pilihan acara" />
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
                role="region"
                aria-label={t('Pilihan acara', 'Event selection')}
                tabIndex={0}
                className={cn(
                  'home-event-shelf event-grid',
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
        <EventCategories />
        <section className="py-10 sm:py-14" aria-labelledby="cities-heading">
          <div className="home-section-heading">
            <h2 id="cities-heading" className="section-title flex items-center gap-3">
              <MapPin className="size-6 shrink-0 text-blue-950" aria-hidden />
              {t('Jelajahi Event di Kotamu', 'Explore events in your city')}
            </h2>
            <Link to="/cities" className="text-link">
              {t('Lihat semua', 'View all')} <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <DeferredSection fallback={<CitySkeleton />}>
            <Suspense fallback={<CitySkeleton />}>
              <CityDestinations />
            </Suspense>
          </DeferredSection>
        </section>
      </div>
    </main>
  );
}
