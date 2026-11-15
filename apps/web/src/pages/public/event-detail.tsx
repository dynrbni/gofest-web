import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Globe2,
  MapPin,
  Share2,
  Shapes,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { EventPoster } from '@/components/common/event-presentation';
import { ErrorState, LoadingState } from '@/components/common/states';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateLong, formatIDR, formatTime, formatTimeZoneLabel } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { usePublicEvent } from '@/lib/queries';

export function EventDetailPage() {
  const { slug } = useParams();
  const eventQuery = usePublicEvent(slug);
  const event = eventQuery.data?.event;
  useDocumentTitle(event?.title ?? 'Detail acara');
  if (eventQuery.isLoading)
    return (
      <main className="container py-10">
        <LoadingState rows={4} label="Memuat detail acara" />
      </main>
    );
  if (eventQuery.isError || !event)
    return (
      <main className="container max-w-2xl py-14">
        <Link to="/events" className="text-link">
          <ArrowLeft className="size-4" aria-hidden />
          Kembali ke acara
        </Link>
        <ErrorState
          className="mt-5"
          error={eventQuery.error}
          onRetry={() => void eventQuery.refetch()}
          title="Acara tidak dapat dibuka"
        />
      </main>
    );
  const tickets = event.ticketTypes ?? [];
  const available = tickets.filter(
    (ticket) => ticket.isOnSale && (ticket.available ?? 0) >= ticket.minPerOrder,
  );
  const cancelled = event.status === 'CANCELLED';
  const ended = new Date(event.endsAt).getTime() <= Date.now();
  const canBook = !cancelled && !ended && available.length > 0;
  const unavailable = cancelled
    ? 'Acara dibatalkan'
    : ended
      ? 'Acara telah selesai'
      : tickets.length > 0 && tickets.every((ticket) => (ticket.available ?? 0) <= 0)
        ? 'Tiket sudah habis'
        : 'Penjualan belum tersedia';
  const price = available.length
    ? Math.min(...available.map((ticket) => ticket.price))
    : event.priceFrom;
  const priceLabel = price === 0 ? 'Gratis' : price !== null ? formatIDR(price) : 'Belum tersedia';
  const location =
    event.type === 'ONLINE'
      ? 'Acara online'
      : [event.venueName, event.address, event.city].filter(Boolean).join(', ') ||
        'Lokasi menyusul';
  const bookingButton = canBook ? (
    <Link to={`/checkout/${event.slug}`} className="primary-action">
      Pesan Sekarang
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  ) : (
    <p role="status" className="text-sm font-medium text-slate-600">
      {unavailable}
    </p>
  );

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Tautan acara disalin');
    } catch {
      toast.error('Salin tautan acara dari alamat browser.');
    }
  }

  return (
    <main className="event-detail-page">
      <div className="container event-detail-grid">
        <section className="event-detail-heading" aria-labelledby="event-title">
          <Link
            to={`/events?category=${encodeURIComponent(event.category.slug)}`}
            className="inline-flex min-h-8 items-center gap-2 rounded-full bg-blue-50 px-3 text-sm font-medium text-blue-700"
          >
            <Shapes className="size-4" aria-hidden />
            {event.category.name}
          </Link>
          <h1
            id="event-title"
            className="mt-3 text-2xl font-semibold leading-snug tracking-tight sm:text-3xl"
          >
            {event.title}
          </h1>
          <p className="mt-7 text-sm text-slate-500">Penyelenggara</p>
          <Link
            to={`/organizers/${event.organizer.slug}`}
            className="mt-3 inline-flex items-center gap-3 hover:text-blue-700"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-lg font-medium text-blue-700">
              {event.organizer.organizationName.charAt(0)}
            </span>
            <span className="text-sm font-medium">{event.organizer.organizationName}</span>
            {event.organizer.status === 'ACTIVE' ? (
              <CheckCircle2
                className="size-4 shrink-0 text-blue-700"
                aria-label="Organizer aktif"
              />
            ) : null}
          </Link>
          <button
            type="button"
            onClick={() => void share()}
            className="mt-5 flex min-h-11 items-center gap-2 rounded-full bg-blue-50 px-4 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            <Share2 className="size-4" aria-hidden />
            Bagikan acara
          </button>
          {event.isDemo ? (
            <p className="mt-4 text-xs text-slate-500">Acara demo · pembayaran simulasi</p>
          ) : null}
        </section>
        <aside className="event-detail-summary" aria-label="Ringkasan acara dan pemesanan">
          <EventPoster
            title={event.title}
            coverKey={event.coverKey}
            category={event.category.name}
            startsAt={event.startsAt}
            city={event.city}
            timezone={event.timezone}
            sizes="(min-width: 1024px) 540px, 95vw"
            className="rounded-2xl"
            imageClassName="object-contain"
          />
          <section className="mt-6" aria-labelledby="event-metadata-heading">
            <h2 id="event-metadata-heading" className="text-lg font-semibold">
              Detail Acara
            </h2>
            <div className="mt-4 space-y-4 text-sm leading-6">
              <p className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 size-5 shrink-0 text-blue-600" aria-hidden />
                {formatDateLong(event.startsAt, event.timezone)}
                {formatDateLong(event.startsAt, event.timezone) !==
                formatDateLong(event.endsAt, event.timezone)
                  ? ` – ${formatDateLong(event.endsAt, event.timezone)}`
                  : ''}
              </p>
              <p className="flex items-start gap-3">
                <Clock className="mt-0.5 size-5 shrink-0 text-blue-600" aria-hidden />
                {formatTime(event.startsAt, event.timezone)} –{' '}
                {formatTime(event.endsAt, event.timezone)} · {formatTimeZoneLabel(event.timezone)}
              </p>
              <p className="flex items-start gap-3">
                {event.type === 'ONLINE' ? (
                  <Globe2 className="mt-0.5 size-5 shrink-0 text-blue-600" aria-hidden />
                ) : (
                  <MapPin className="mt-0.5 size-5 shrink-0 text-blue-600" aria-hidden />
                )}
                {location}
              </p>
            </div>
          </section>
          <div className="event-summary-card mt-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-blue-50 p-5 sm:p-6">
            <div>
              <p className="text-sm text-slate-600">Harga mulai dari</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{priceLabel}</p>
            </div>
            {bookingButton}
          </div>
        </aside>
        <article id="event-content" className="event-detail-content">
          <Tabs defaultValue="about">
            <TabsList
              className="detail-tabs h-auto w-full justify-start gap-3 overflow-x-auto rounded-none border-b border-slate-200 bg-transparent p-0"
              aria-label="Informasi acara"
            >
              <TabsTrigger value="about">Deskripsi</TabsTrigger>
              <TabsTrigger value="rules">Syarat & ketentuan</TabsTrigger>
              <TabsTrigger value="location">Lokasi</TabsTrigger>
            </TabsList>
            <TabsContent value="about" className="detail-tab-content">
              <h2 className="mb-3 text-lg font-semibold">Deskripsi</h2>
              <div className="event-description">
                <ReactMarkdown>{event.description}</ReactMarkdown>
              </div>
            </TabsContent>
            <TabsContent value="rules" className="detail-tab-content">
              <h2 className="mb-4 text-lg font-semibold">Syarat & ketentuan</h2>
              <div className="event-description">
                <ReactMarkdown>
                  {event.rules ||
                    'Penyelenggara belum menambahkan ketentuan khusus. Baca syarat layanan Gofest sebelum memesan.'}
                </ReactMarkdown>
              </div>
              <h2 className="mb-4 mt-8 text-lg font-semibold">Pengembalian dana</h2>
              <div className="event-description">
                <ReactMarkdown>
                  {event.refundPolicy ||
                    'Penyelenggara belum menambahkan kebijakan pengembalian dana. Periksa ketentuan acara sebelum membeli tiket.'}
                </ReactMarkdown>
              </div>
            </TabsContent>
            <TabsContent value="location" className="detail-tab-content">
              <h2 className="text-lg font-semibold">
                {event.type === 'ONLINE'
                  ? 'Ikuti dari mana saja'
                  : (event.venueName ?? 'Lokasi menyusul')}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {event.type === 'ONLINE'
                  ? 'Tautan dan petunjuk akses dapat dilihat pada tiket setelah pembayaran berhasil.'
                  : location}
              </p>
              {event.type === 'OFFLINE' && (event.address || event.venueName) ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-link mt-3"
                >
                  Buka peta
                  <MapPin className="size-4" aria-hidden />
                </a>
              ) : null}
            </TabsContent>
          </Tabs>
        </article>
      </div>
      {canBook ? (
        <div className="mobile-booking">
          <div>
            <p className="text-xs text-slate-500">Mulai dari</p>
            <p className="mt-1 font-semibold tabular-nums">{priceLabel}</p>
          </div>
          {bookingButton}
        </div>
      ) : null}
    </main>
  );
}
