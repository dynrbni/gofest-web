import { ArrowRight, MapPin, Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EventCard } from '@/components/common/event-presentation';
import { EmptyState, PageLoading, ErrorState } from '@/components/common/states';
import { EventCarousel } from '@/components/discovery/event-carousel';
import { EventCategories } from '@/components/discovery/event-categories';
import { CityDestinations } from '@/components/discovery/city-destinations';
import { useCmsSite, type CmsSite } from '@/lib/cms';
import { assetUrl } from '@/lib/assets';
import { PlatformContent } from './platform-content';

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
              {banners.length ? (
                <div className="space-y-4">
                  {banners.map((banner) => (
                    <div key={banner.id} className="relative isolate bg-slate-100">
                      <picture>
                        <source
                          media="(max-width: 640px)"
                          srcSet={assetUrl(banner.mobileImageKey || banner.imageKey)!}
                        />
                        <img
                          src={assetUrl(banner.imageKey)!}
                          alt={banner.title}
                          width={1920}
                          height={800}
                          className="aspect-[12/5] max-h-[620px] w-full object-cover"
                          fetchPriority="high"
                        />
                      </picture>
                      {(banner.title ||
                        banner.subtitle ||
                        banner.description ||
                        banner.ctaText) && (
                        <div className="container py-5">
                          <h2 className="text-2xl font-semibold">{banner.title}</h2>
                          {banner.subtitle && (
                            <p className="mt-2 text-slate-600">{banner.subtitle}</p>
                          )}
                          {banner.description && (
                            <p className="mt-2 text-slate-600">{banner.description}</p>
                          )}
                          {banner.ctaUrl && (
                            <a href={banner.ctaUrl} className="primary-action mt-4">
                              {banner.ctaText || 'Lihat selengkapnya'}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EventCarousel events={section.events} />
              )}
              <div className="container py-5">
                <h2 className="text-xl font-semibold">{section.title}</h2>
                {section.subtitle && <p className="mt-2 text-sm font-medium">{section.subtitle}</p>}
                {section.description && (
                  <p className="mt-2 text-slate-600">{section.description}</p>
                )}
              </div>
            </section>
          );
        if (section.kind === 'promotion')
          return (
            <section key={section.id} aria-label={section.title}>
              <div className="container pt-6">
                <h2 className="section-title">{section.title}</h2>
                {section.description && (
                  <p className="mt-2 text-slate-600">{section.description}</p>
                )}
              </div>
              <PlatformContent limit={section.limit} />
            </section>
          );
        if (section.kind === 'categories')
          return (
            <div key={section.id} className="container">
              <EventCategories
                title={section.title}
                description={section.description}
                limit={section.limit}
              />
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
