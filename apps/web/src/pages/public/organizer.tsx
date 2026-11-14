import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EventPoster } from '@/components/common/event-presentation';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states';
import { assetUrl } from '@/lib/assets';
import { formatDateLong, formatIDR, formatTime } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { usePublicOrganizer } from '@/lib/queries';

export function OrganizerPublicPage() {
  const { slug } = useParams();
  const organizerQuery = usePublicOrganizer(slug);
  const organizer = organizerQuery.data?.organizer;
  useDocumentTitle(organizer?.organizationName ?? 'Organizer');

  if (organizerQuery.isLoading) {
    return (
      <main className="container py-10">
        <LoadingState rows={4} label="Memuat profil organizer" />
      </main>
    );
  }

  if (organizerQuery.isError || !organizer) {
    return (
      <main className="container max-w-3xl py-14">
        <Link to="/events" className="inline-flex items-center gap-2 text-sm font-semibold text-olive">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke jelajah acara
        </Link>
        <ErrorState
          className="mt-6"
          error={organizerQuery.error}
          onRetry={() => void organizerQuery.refetch()}
          title="Profil organizer tidak dapat dibuka"
        />
      </main>
    );
  }

  const logo = assetUrl(organizer.logoKey);
  const events = organizer.events ?? [];

  return (
    <main className="container py-8 sm:py-12">
      <Link to="/events" className="inline-flex items-center gap-2 text-sm font-semibold text-olive hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Jelajah acara
      </Link>

      <header className="mt-6 flex flex-col gap-6 border-b border-ink pb-8 sm:flex-row sm:items-start">
        {logo ? (
          <img
            src={logo}
            alt={`Logo ${organizer.organizationName}`}
            width={112}
            height={112}
            className="h-28 w-28 shrink-0 border border-warm-border object-cover"
          />
        ) : (
          <div className="flex h-28 w-28 shrink-0 items-center justify-center border border-vermilion/40 bg-warm-muted">
            <span className="font-display text-4xl tracking-tightest">
              {organizer.organizationName.charAt(0)}
            </span>
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-olive">Organizer</p>
          <h1 className="mt-2 font-display text-5xl leading-[0.95] tracking-tightest">
            {organizer.organizationName}
          </h1>
          {organizer.description ? (
            <p className="mt-4 max-w-2xl text-[15px] leading-[1.7] text-muted-foreground">
              {organizer.description}
            </p>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Organizer ini belum menuliskan deskripsi profil.
            </p>
          )}
          <p className="mt-4 text-sm font-semibold">
            {events.length} acara publik {events.length > 0 ? 'akan datang' : 'saat ini'}
          </p>
        </div>
      </header>

      <section className="mt-8">
        <h2 className="text-lg font-bold">Acara dari organizer ini</h2>
        {events.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="Belum ada acara publik"
            description="Organizer ini belum memiliki acara tayang yang bisa dibeli. Coba kembali nanti atau jelajahi acara lain."
            action={
              <Link to="/events" className="rounded-md border border-ink px-4 py-2 text-sm font-semibold">
                Lihat acara lain
              </Link>
            }
          />
        ) : (
          <div className="mt-2 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Link key={event.id} to={`/events/${event.slug}`} className="group block">
                <EventPoster
                  title={event.title}
                  coverKey={event.coverKey}
                  category={event.category.name}
                  startsAt={event.startsAt}
                  city={event.city}
                  timezone={event.timezone}
                  className="rounded-sm"
                  sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 90vw"
                />
                <p className="mt-3 text-xs font-semibold text-olive">
                  {formatDateLong(event.startsAt, event.timezone)} · {formatTime(event.startsAt, event.timezone)}
                </p>
                <h3 className="mt-1 text-lg font-bold leading-snug group-hover:underline group-hover:decoration-vermilion group-hover:decoration-2 group-hover:underline-offset-4">
                  {event.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {event.city ?? 'Online'} ·{' '}
                  {event.priceFrom === 0
                    ? 'Gratis'
                    : event.priceFrom !== null
                      ? `Mulai ${formatIDR(event.priceFrom)}`
                      : 'Harga belum tersedia'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}