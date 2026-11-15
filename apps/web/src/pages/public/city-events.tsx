import { findEventCity } from '@gofest/shared';
import { ChevronRight } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { EventCard } from '@/components/common/event-presentation';
import { Pagination } from '@/components/common/pagination';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states';
import { CityDestinations } from '@/components/discovery/city-destinations';
import { useDocumentTitle } from '@/lib/hooks';
import { useLanguage } from '@/lib/language';
import { useCityEvents } from '@/lib/queries';

type EventCity = NonNullable<ReturnType<typeof findEventCity>>;

export function CitiesPage() {
  const { t } = useLanguage();
  useDocumentTitle(t('Jelajahi Event di Kotamu', 'Explore events in your city'));
  return (
    <main className="container min-h-[60vh] py-8 sm:py-12">
      <h1 className="section-title">
        {t('Jelajahi Event di Kotamu', 'Explore events in your city')}
      </h1>
      <p className="mt-3 text-sm text-slate-600">
        {t('Pilih kota untuk melihat acara di sekitarmu.', 'Choose a city to see local events.')}
      </p>
      <CityDestinations />
    </main>
  );
}

export function CityEventsPage() {
  const { citySlug } = useParams();
  const city = findEventCity(citySlug);
  const { t } = useLanguage();
  useDocumentTitle(
    city
      ? t(`Event Menarik di Kota ${city.name}`, `Events in ${city.name}`)
      : t('Kota tidak ditemukan', 'City not found'),
  );

  if (!city) {
    return (
      <main className="container min-h-[60vh] py-12">
        <h1 className="section-title">{t('Kota tidak ditemukan', 'City not found')}</h1>
        <p className="mt-3 text-sm text-slate-600">
          {t(
            'Pilih kota yang tersedia untuk melihat acaranya.',
            'Choose an available city to see its events.',
          )}
        </p>
        <CityDestinations />
      </main>
    );
  }

  return <CityEventListing key={city.slug} city={city} />;
}

function CityEventListing({ city }: { city: EventCity }) {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const requestedPage = Number(params.get('page') ?? 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const query = useCityEvents(city.slug, page);
  const events = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <main className="min-h-[60vh] bg-slate-50/70">
      <div className="container py-6 sm:py-10">
        <nav
          aria-label={t('Jejak navigasi', 'Breadcrumb')}
          className="flex flex-wrap items-center gap-2 text-sm text-slate-600"
        >
          <Link to="/" className="hover:text-blue-700 hover:underline">
            {t('Beranda', 'Home')}
          </Link>
          <ChevronRight className="size-4" aria-hidden />
          <Link to="/cities" className="hover:text-blue-700 hover:underline">
            {t('Kota', 'Cities')}
          </Link>
          <ChevronRight className="size-4" aria-hidden />
          <span aria-current="page" className="font-medium text-slate-900">
            {city.name}
          </span>
        </nav>
        <header className="flex items-center gap-5 py-8 sm:gap-8 sm:py-10">
          <span
            role="img"
            aria-label={city.landmark}
            className="block h-[140px] w-[84px] shrink-0 bg-no-repeat sm:h-[180px] sm:w-[108px]"
            style={{
              backgroundImage: "url('/images/city-landmarks.webp')",
              backgroundSize: '500% 100%',
              backgroundPosition: city.landmarkPosition,
              clipPath: 'inset(0 3px 0 8px)',
            }}
          />
          <h1 className="min-w-0 font-semibold tracking-tight text-slate-950">
            <span className="block text-lg sm:text-2xl">
              {t('Event Menarik di Kota', 'Events in')}
            </span>{' '}
            <span className="mt-2 block text-3xl sm:text-4xl">{city.name}</span>
          </h1>
        </header>
        <section
          id="city-event-results"
          aria-label={t(`Daftar acara di ${city.name}`, `Events in ${city.name}`)}
          aria-busy={query.isFetching}
        >
          <h2 className="sr-only">
            {t(`Daftar acara di ${city.name}`, `Event list in ${city.name}`)}
          </h2>
          {query.isLoading ? (
            <LoadingState
              rows={4}
              label={t(`Memuat acara di ${city.name}`, `Loading events in ${city.name}`)}
            />
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => void query.refetch()} />
          ) : events.length === 0 ? (
            <EmptyState
              title={t(`Belum ada acara di ${city.name}`, `No events in ${city.name} yet`)}
              description={t(
                'Acara terbaru di kota ini akan tampil di sini saat tersedia.',
                'New events in this city will appear here when available.',
              )}
              action={
                page > 1 ? (
                  <button type="button" className="text-link" onClick={() => setParams({})}>
                    {t('Kembali ke halaman pertama', 'Back to the first page')}
                  </button>
                ) : (
                  <Link to="/cities" className="text-link">
                    {t('Jelajahi kota lain', 'Explore other cities')}
                  </Link>
                )
              }
            />
          ) : (
            <>
              <p role="status" className="mb-5 text-sm text-slate-600">
                {meta?.total ?? events.length}{' '}
                {t(`acara di ${city.name}`, `events in ${city.name}`)}
              </p>
              <div className="event-grid grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-4">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
              <div className="mt-9">
                <Pagination
                  meta={meta}
                  onPageChange={(nextPage) => {
                    setParams(nextPage > 1 ? { page: String(nextPage) } : {});
                    document.getElementById('city-event-results')?.scrollIntoView({
                      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
                        ? 'auto'
                        : 'smooth',
                    });
                  }}
                />
              </div>
            </>
          )}
        </section>
        <div className="mt-10 border-t border-slate-200 pt-6">
          <Link to="/cities" className="text-link">
            {t('Jelajahi kota lain', 'Explore other cities')}
          </Link>
        </div>
      </div>
    </main>
  );
}
