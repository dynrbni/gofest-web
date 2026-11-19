import { ArrowLeft } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { EventCard } from '@/components/common/event-presentation';
import { Pagination } from '@/components/common/pagination';
import { EmptyState, ErrorState, LoadingState, PageLoading } from '@/components/common/states';
import { OrganizerProfileHeader } from '@/components/common/organizer-profile-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const { t } = useLanguage();
  useDocumentTitle(organizer?.organizationName ?? t('Profil kreator', 'Creator profile'));
  if (query.isLoading || (query.isPlaceholderData && organizer?.slug !== slug))
    return <PageLoading label="Memuat profil kreator" />;
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
        <OrganizerProfileHeader organizer={organizer} />
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
                <LoadingState variant="events" rows={4} label="Memuat event kreator" />
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
