import { ArrowLeft, CalendarDays, Ticket } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EventCard } from '@/components/common/event-presentation';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states';
import { assetUrl } from '@/lib/assets';
import { useDocumentTitle } from '@/lib/hooks';
import { usePublicOrganizer } from '@/lib/queries';

export function OrganizerPublicPage() {
  const { slug } = useParams();
  const query = usePublicOrganizer(slug);
  const organizer = query.data?.organizer;
  useDocumentTitle(organizer?.organizationName ?? 'Profil organizer');
  if (query.isLoading)
    return (
      <main className="container py-10">
        <LoadingState rows={4} label="Memuat profil organizer" />
      </main>
    );
  if (query.isError || !organizer)
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
          title="Profil organizer tidak dapat dibuka"
        />
      </main>
    );
  const logo = assetUrl(organizer.logoKey);
  const events = organizer.events ?? [];
  const eventOrganizer = {
    id: organizer.id,
    organizationName: organizer.organizationName,
    slug: organizer.slug,
    logoKey: organizer.logoKey,
    status: organizer.status,
  };
  return (
    <main className="container py-8 sm:py-10">
      <Link to="/events" className="text-link">
        <ArrowLeft className="size-4" aria-hidden />
        Jelajah acara
      </Link>
      <header className="relative mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="h-24 bg-blue-950 sm:h-32">
          <div className="flex h-full items-center justify-end px-8">
            <Ticket className="size-16 -rotate-12 text-blue-300/30" aria-hidden />
          </div>
        </div>
        <div className="relative flex flex-col gap-5 px-6 pb-7 sm:flex-row sm:items-end sm:px-8">
          <div className="-mt-10 flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-blue-600 text-3xl font-semibold text-white">
            {logo ? (
              <img src={logo} alt="" className="h-full w-full object-cover" />
            ) : (
              organizer.organizationName.charAt(0)
            )}
          </div>
          <div className="min-w-0 pt-3">
            <p className="text-xs font-medium text-blue-700">Organizer Gofest</p>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
              {organizer.organizationName}
            </h1>
            {organizer.description ? (
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                {organizer.description}
              </p>
            ) : null}
            <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <CalendarDays className="size-4" aria-hidden />
              {events.length} acara tersedia
            </p>
          </div>
        </div>
      </header>
      <section className="mt-10">
        <h2 className="section-title">Acara dari {organizer.organizationName}</h2>
        {events.length ? (
          <div className="event-grid mt-6 grid gap-5 min-[480px]:grid-cols-2 lg:grid-cols-4">
            {events.map((event) => (
              <EventCard event={{ ...event, organizer: eventOrganizer }} key={event.id} />
            ))}
          </div>
        ) : (
          <EmptyState
            className="mt-6"
            title="Belum ada acara publik"
            description="Acara terbaru akan muncul di sini setelah diterbitkan oleh organizer."
            action={
              <Link to="/events" className="primary-action">
                Lihat acara lainnya
              </Link>
            }
          />
        )}
      </section>
    </main>
  );
}
