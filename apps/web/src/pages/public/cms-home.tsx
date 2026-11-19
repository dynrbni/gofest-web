import { ArrowRight, MapPin, Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EventCard } from '@/components/common/event-presentation';
import { EmptyState, PageLoading, ErrorState } from '@/components/common/states';
import { EventCarousel } from '@/components/discovery/event-carousel';
import { EventCategories } from '@/components/discovery/event-categories';
import { CityDestinations } from '@/components/discovery/city-destinations';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCmsSite, type CmsSite } from '@/lib/cms';
import { useLanguage } from '@/lib/language';
import { usePublicEvents } from '@/lib/queries';
import { PlatformContent } from './platform-content';

const homeEventLimit = 8;

function UpcomingEvents() {
  const { t } = useLanguage();
  const query = usePublicEvents({ limit: homeEventLimit });
  const events = query.data?.data ?? [];

  return (
    <section className="pb-8 sm:pb-12" aria-labelledby="upcoming-events-heading">
      <h2 id="upcoming-events-heading" className="section-title">
        {t('Event Mendatang', 'Upcoming events')}
      </h2>
      {query.isPending ? (
        <div className="home-upcoming-grid mt-5" role="status">
          <span className="sr-only">{t('Memuat event', 'Loading events')}</span>
          {Array.from({ length: homeEventLimit }, (_, index) => (
            <Skeleton key={index} className="aspect-[4/3]" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : events.length ? (
        <>
          <div className="event-grid home-upcoming-grid mt-5">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          <div className="mt-6 text-center">
            <Button variant="outline" asChild>
              <Link to="/events">
                {t('Lihat semua event', 'View all events')}
                <ArrowRight className="ml-2 size-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </>
      ) : (
        <EmptyState
          title={t('Belum ada event mendatang', 'No upcoming events yet')}
          description={t('Cek kembali untuk jadwal terbaru.', 'Check back for new dates.')}
        />
      )}
    </section>
  );
}

export function CmsHomepage({ site }: { site: CmsSite }) {
  const sections = site.sections
    .filter((section) => section.visible)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const banners = site.banners
    .filter((banner) => banner.visible)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    <main id="main-content" className="discovery-page">
      <h1 className="sr-only">
        {site.settings.description || `Temukan pengalaman seru di ${site.settings.websiteName}`}
      </h1>
      {sections.map((section) => {
        if (section.kind === 'hero')
          return (
            <section key={section.id} aria-label={section.title}>
              <EventCarousel banners={banners} events={section.events} />
            </section>
          );
        if (section.kind === 'promotion')
          return (
            <PlatformContent
              key={section.id}
              limit={section.limit}
              title={section.title}
              description={section.description}
            />
          );
        if (section.kind === 'categories')
          return (
            <div key={section.id} className="container">
              <EventCategories
                title={section.title}
                description={section.description}
                limit={section.limit}
              />
              <UpcomingEvents />
            </div>
          );
        if (section.kind === 'cities')
          return (
            <section
              key={section.id}
              className="container py-10 sm:py-14"
              aria-labelledby={`heading-${section.key}`}
            >
              <div className="home-section-heading">
                <h2 id={`heading-${section.key}`} className="section-title flex items-center gap-3">
                  <MapPin className="size-6" aria-hidden />
                  {section.title}
                </h2>
                <Link to="/cities" className="text-link">
                  Lihat semua <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
              {section.subtitle && <p className="mt-2 text-sm font-medium">{section.subtitle}</p>}
              {section.description && <p className="mt-2 text-slate-600">{section.description}</p>}
              <CityDestinations limit={section.limit} cities={site.cities} />
            </section>
          );
        return (
          <section
            key={section.id}
            className="container py-8 sm:py-10"
            aria-labelledby={
              section.key === 'events-for-you' ? 'featured-heading' : `heading-${section.key}`
            }
          >
            <div className="home-section-heading">
              <h2
                id={
                  section.key === 'events-for-you' ? 'featured-heading' : `heading-${section.key}`
                }
                className="section-title flex items-center gap-3"
              >
                <Megaphone className="size-6 shrink-0 text-blue-950" aria-hidden />
                {section.title}
              </h2>
              <Link to="/events" className="text-link">
                Lihat semua <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            {section.subtitle && <p className="mt-2 text-sm font-medium">{section.subtitle}</p>}
            {section.description && <p className="mt-2 text-slate-600">{section.description}</p>}
            {section.events.length ? (
              <div
                role="region"
                aria-label="Pilihan acara"
                tabIndex={0}
                className={
                  section.layout === 'shelf'
                    ? 'home-event-shelf mt-6 flex gap-5 overflow-x-auto pb-4 *:w-[280px] *:shrink-0'
                    : 'home-event-shelf event-grid mt-6'
                }
              >
                {section.events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <div className="mt-6">
                <EmptyState
                  title="Belum ada acara untuk bagian ini"
                  description="Acara yang aktif dan sudah dipublikasikan akan tampil di sini."
                />
              </div>
            )}
          </section>
        );
      })}
    </main>
  );
}

export function PublishedHome() {
  const query = useCmsSite();
  if (query.isLoading) return <PageLoading label="Memuat beranda" />;
  if (!query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  return <CmsHomepage site={query.data} />;
}
