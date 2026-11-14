import { Link } from 'react-router-dom';
import { Calendar, MapPin, QrCode, Shield, Users } from 'lucide-react';
import { useStaffEvents } from '@/lib/queries';
import { useDocumentTitle } from '@/lib/hooks';
import { formatEventWhen } from '@/lib/format';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states';
import { EventStatusBadge } from '@/components/common/status-badge';

export function StaffEventsPage() {
  useDocumentTitle('Tugas Check-In');
  const eventsQuery = useStaffEvents();
  const events = eventsQuery.data?.events ?? [];

  return (
    <main className="container max-w-4xl py-8 sm:py-12">
      <div className="border-b border-warm-border pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-olive">Event Staff Portal</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tightest sm:text-4xl">
          Penugasan Scanner & Check-In
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pilih acara yang ditugaskan kepadamu untuk membuka scanner QR dan validasi kehadiran di lokasi
        </p>
      </div>

      <div className="mt-8">
        {eventsQuery.isLoading ? (
          <LoadingState rows={3} label="Memuat acara tugas" />
        ) : eventsQuery.isError ? (
          <ErrorState error={eventsQuery.error} onRetry={() => void eventsQuery.refetch()} />
        ) : events.length === 0 ? (
          <EmptyState
            title="Tidak ada penugasan aktif"
            description="Kamu belum ditugaskan sebagai petugas check-in untuk acara apapun. Hubungi organizer acaramu untuk menambahkan emailmu ke daftar staf."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map((event) => (
              <article
                key={event.id}
                className="flex flex-col justify-between rounded-md border border-warm-border bg-card p-5 transition-shadow hover:shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded bg-warm-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">
                      Peran: {event.accessRole}
                    </span>
                    <EventStatusBadge status={event.status} />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-olive">
                      {event.organizer?.organizationName ?? 'Penyelenggara'}
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-ink">{event.title}</h2>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-ink/70" aria-hidden />
                      {formatEventWhen(event.startsAt, event.endsAt, event.timezone)}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-ink/70" aria-hidden />
                      {event.city ? `${event.venueName ?? ''}, ${event.city}` : 'Acara Online'}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-ink/70" aria-hidden />
                      <span>
                        Hadir: <strong>{event.ticketCounts?.checkedIn ?? 0}</strong> /{' '}
                        {event.ticketCounts?.valid ?? 0} tiket
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-6 border-t border-warm-border pt-4">
                  <Link
                    to={`/staff/events/${event.id}/check-in`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brick px-4 py-2.5 text-sm font-semibold text-paper shadow-sm transition-colors hover:bg-brick/90"
                  >
                    <QrCode className="h-4 w-4" aria-hidden />
                    Buka Scanner Pintu
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
