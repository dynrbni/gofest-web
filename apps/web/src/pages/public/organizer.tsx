import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EventPoster } from '@/components/common/event-presentation';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states';
import { assetUrl } from '@/lib/assets';
import { formatDateLong, formatIDR } from '@/lib/format';
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
      <Link to="/events" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Jelajah Acara
      </Link>

      <header className="mt-6 flex flex-col gap-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:flex-row sm:items-start sm:p-8">
        {logo ? (
          <img
            src={logo}
            alt={`Logo ${organizer.organizationName}`}
            width={112}
            height={112}
            className="h-24 w-24 shrink-0 rounded-2xl border border-slate-200 object-cover shadow-2xs"
          />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
            <span className="text-3xl font-black">
              {organizer.organizationName.charAt(0)}
            </span>
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Penyelenggara Resmi</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            {organizer.organizationName}
          </h1>
          {organizer.description ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
              {organizer.description}
            </p>
          ) : (
            <p className="mt-3 text-xs text-slate-400">
              Organizer ini belum menuliskan deskripsi profil.
            </p>
          )}
          <p className="mt-3 text-xs font-bold text-slate-700">
            {events.length} acara publik {events.length > 0 ? 'akan datang' : 'saat ini'}
          </p>
        </div>
      </header>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900">Acara dari Organizer Ini</h2>
        {events.length === 0 ? (
          <EmptyState
            className="mt-4 rounded-2xl border border-slate-200 bg-white p-10 text-center"
            title="Belum ada acara publik"
            description="Organizer ini belum memiliki acara tayang yang bisa dibeli. Coba kembali nanti atau jelajahi acara lain."
            action={
              <Link to="/events" className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700">
                Lihat Acara Lain
              </Link>
            }
          />
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Link
                key={event.id}
                to={`/events/${event.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
              >
                <EventPoster
                  title={event.title}
                  coverKey={event.coverKey}
                  category={event.category.name}
                  startsAt={event.startsAt}
                  city={event.city}
                  timezone={event.timezone}
                  className="rounded-t-2xl rounded-b-none"
                  sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 90vw"
                />
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <p className="text-xs font-bold text-blue-600">
                      {formatDateLong(event.startsAt, event.timezone)}
                    </p>
                    <h3 className="mt-1.5 line-clamp-2 text-base font-bold text-slate-900 group-hover:text-blue-600">
                      {event.title}
                    </h3>
                  </div>
                  <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-500 truncate">{event.city ?? 'Online'}</span>
                    <span className="font-extrabold text-blue-600 tabular-nums">
                      {event.priceFrom === 0
                        ? 'Gratis'
                        : event.priceFrom !== null
                          ? formatIDR(event.priceFrom)
                          : 'Harga menyusul'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}