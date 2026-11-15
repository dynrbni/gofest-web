import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { EventCard, OrganizerAvatar } from '@/components/common/event-presentation';
import { Pagination } from '@/components/common/pagination';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { assetUrl } from '@/lib/assets';
import { useDocumentTitle } from '@/lib/hooks';
import { useLanguage } from '@/lib/language';
import { usePublicOrganizer } from '@/lib/queries';

export function OrganizerPublicPage() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const period = params.get('period') === 'past' ? 'past' : 'active';
  const rawPage = Number(params.get('page') ?? 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const query = usePublicOrganizer(slug, { period, page });
  const organizer = query.data?.organizer;
  const [failedBanner, setFailedBanner] = useState<string | null>(null);
  const { t, language } = useLanguage();
  useDocumentTitle(organizer?.organizationName ?? t('Profil kreator', 'Creator profile'));
  if (query.isLoading || (query.isPlaceholderData && organizer?.slug !== slug))
    return (
      <main className="container py-10">
        <LoadingState rows={4} label="Memuat profil kreator" />
      </main>
    );
  if ((query.isError && !organizer) || !organizer)
    return (
      <main className="container max-w-3xl py-14">
        <Link to="/events" className="text-link">
          <ArrowLeft className="size-4" aria-hidden />
          Kembali ke acara
        </Link>
        <ErrorState
          className="mt-5"
          error={query.error}
          onRetry={() => void query.refetch()}
          title="Profil kreator tidak dapat dibuka"
        />
      </main>
    );
  const banner = assetUrl(organizer.bannerKey ?? organizer.fallbackBannerKey);
  const events = organizer.events ?? [];
  const eventOrganizer = {
    id: organizer.id,
    organizationName: organizer.organizationName,
    slug: organizer.slug,
    logoKey: organizer.logoKey,
    status: organizer.status,
  };
  const counts = organizer.eventCounts ?? { active: 0, past: 0, total: 0 };
  function changePeriod(value: string) {
    const next = new URLSearchParams(params);
    next.delete('page');
    if (value === 'past') next.set('period', 'past');
    else next.delete('period');
    setParams(next, { preventScrollReset: true });
  }
  function changePage(nextPage: number) {
    const next = new URLSearchParams(params);
    if (nextPage === 1) next.delete('page');
    else next.set('page', String(nextPage));
    setParams(next, { preventScrollReset: true });
    document
      .getElementById('creator-events')
      ?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  return (
    <main className="bg-slate-50/70 pb-12 pt-7 sm:pt-10">
      <div className="container">
        <header>
          <div className="creator-cover relative w-full aspect-[7/2] max-h-80 min-h-32 overflow-hidden rounded-2xl bg-blue-100">
            {banner && banner !== failedBanner ? (
              <img
                src={banner}
                alt=""
                width={1600}
                height={460}
                onError={() => setFailedBanner(banner)}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div className="mt-6 flex items-start gap-5 sm:gap-8">
            <OrganizerAvatar
              name={organizer.organizationName}
              logoKey={organizer.logoKey}
              className="size-20 bg-white text-3xl sm:size-32 sm:text-4xl"
            />
            <div className="min-w-0 flex-1">
              <h1 className="break-words text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                {organizer.organizationName}
              </h1>
              <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-4 text-sm sm:mt-6">
                <div>
                  <dt className="text-slate-600">{t('Total Event', 'Total Events')}</dt>
                  <dd className="mt-2 text-xl font-medium tabular-nums sm:text-2xl">
                    {counts.total}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-600">{t('Bergabung pada', 'Joined')}</dt>
                  <dd className="mt-2 text-base font-medium sm:text-xl">
                    {new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'id-ID', {
                      month: 'long',
                      year: 'numeric',
                    }).format(new Date(organizer.createdAt))}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </header>
        <section
          id="creator-events"
          className="mt-8 scroll-mt-28 sm:mt-10"
          aria-label={t('Event kreator', 'Creator events')}
        >
          <Tabs value={period} onValueChange={changePeriod}>
            <TabsList
              className="h-auto bg-blue-50 p-1"
              aria-label={t('Periode event kreator', 'Creator event period')}
            >
              <TabsTrigger value="active" className="min-h-11 px-4">
                {t('Event Aktif', 'Active Events')}{' '}
                <span className="ml-2 text-xs text-slate-600">{counts.active}</span>
              </TabsTrigger>
              <TabsTrigger value="past" className="min-h-11 px-4">
                {t('Event Lalu', 'Past Events')}{' '}
                <span className="ml-2 text-xs text-slate-600">{counts.past}</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value={period} className="mt-6" aria-busy={query.isFetching}>
              <h2 className="sr-only">
                {period === 'active'
                  ? t('Event aktif', 'Active events')
                  : t('Event lalu', 'Past events')}{' '}
                {organizer.organizationName}
              </h2>
              {query.isFetching && query.isPlaceholderData ? (
                <LoadingState rows={4} label="Memuat event kreator" />
              ) : query.isError ? (
                <ErrorState error={query.error} onRetry={() => void query.refetch()} />
              ) : events.length ? (
                <div className="event-grid grid gap-5 min-[480px]:grid-cols-2 lg:grid-cols-4">
                  {events.map((event) => (
                    <EventCard event={{ ...event, organizer: eventOrganizer }} key={event.id} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={
                    period === 'active'
                      ? t('Belum ada event aktif', 'No active events')
                      : t('Belum ada event lalu', 'No past events')
                  }
                  description={
                    period === 'active'
                      ? t(
                          'Event baru kreator ini akan muncul di sini setelah diterbitkan.',
                          'New events will appear here once published.',
                        )
                      : t(
                          'Event yang sudah selesai akan ditampilkan di sini.',
                          'Completed events will appear here.',
                        )
                  }
                />
              )}
              {!query.isPlaceholderData ? (
                <Pagination
                  meta={organizer.eventsPagination}
                  onPageChange={changePage}
                  className="mt-6"
                />
              ) : null}
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </main>
  );
}
