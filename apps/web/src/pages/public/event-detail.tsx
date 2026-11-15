import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Globe2,
  MapPin,
  Share2,
  Shapes,
  Ticket,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { EventPoster } from '@/components/common/event-presentation';
import { ErrorState, LoadingState } from '@/components/common/states';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { assetUrl } from '@/lib/assets';
import {
  formatDateLong,
  formatEventWhen,
  formatIDR,
  formatTime,
  formatTimeZoneLabel,
} from '@/lib/format';
import { useDocumentTitle, useReducedMotion } from '@/lib/hooks';
import { usePublicEvent } from '@/lib/queries';
import { cn } from '@/lib/utils';

export function EventDetailPage() {
  const { slug } = useParams();
  const eventQuery = usePublicEvent(slug);
  const event = eventQuery.data?.event;
  const [selectedId, setSelectedId] = useState('');
  const [activeTab, setActiveTab] = useState('about');
  const reducedMotion = useReducedMotion();
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
  const onSale = tickets.filter((ticket) => ticket.isOnSale && (ticket.available ?? 0) > 0);
  const selected = onSale.find((ticket) => ticket.id === selectedId) ?? onSale[0];
  const cancelled = event.status === 'CANCELLED';
  const ended = new Date(event.endsAt).getTime() <= Date.now();
  const soldOut = tickets.length > 0 && tickets.every((ticket) => (ticket.available ?? 0) <= 0);
  const canBook = !cancelled && !ended && Boolean(selected);
  const checkout = `/checkout/${event.slug}${selected ? `?ticket=${encodeURIComponent(selected.id)}` : ''}`;
  const unavailable = cancelled
    ? 'Acara dibatalkan'
    : ended
      ? 'Acara telah selesai'
      : soldOut
        ? 'Tiket sudah habis'
        : 'Penjualan belum dibuka';
  const price = selected?.price ?? event.priceFrom;
  const priceLabel =
    price === 0 ? 'Gratis' : price !== null ? formatIDR(price) : 'Harga belum tersedia';
  const cover = assetUrl(event.coverKey);

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Tautan acara disalin');
    } catch {
      toast.error('Salin tautan acara dari alamat browser.');
    }
  }
  function showTickets() {
    setActiveTab('tickets');
    requestAnimationFrame(() => {
      document
        .getElementById('event-content')
        ?.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'instant' : 'smooth' });
    });
  }
  const bookingButton = canBook ? (
    activeTab === 'tickets' ? (
      <Link to={checkout} className="primary-action w-full">
        Lanjutkan pembelian
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    ) : (
      <button type="button" onClick={showTickets} className="primary-action w-full">
        Beli tiket
      </button>
    )
  ) : (
    <p
      role="status"
      className="rounded-lg bg-slate-100 p-4 text-center text-sm font-medium text-slate-600"
    >
      {unavailable}
    </p>
  );

  return (
    <main className="event-detail-page">
      <div className="event-detail-backdrop" aria-hidden>
        {cover ? (
          <div
            className="event-detail-backdrop-image"
            style={{ backgroundImage: `url(${JSON.stringify(cover)})` }}
          />
        ) : null}
      </div>
      <div className="container event-detail-grid">
        <section className="event-detail-heading" aria-labelledby="event-title">
          <Link
            to="/events"
            className="mb-5 inline-flex min-h-6 items-center gap-2 text-xs font-medium text-white/90 hover:underline"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Semua acara
          </Link>
          <h1
            id="event-title"
            className="text-2xl font-semibold leading-snug text-white sm:text-[28px]"
          >
            {event.title}
          </h1>
          <div className="mt-5 space-y-4 text-sm leading-6 text-white sm:text-base">
            <p className="flex items-start gap-3">
              {event.type === 'ONLINE' ? (
                <Globe2 className="mt-0.5 size-5 shrink-0" aria-hidden />
              ) : (
                <MapPin className="mt-0.5 size-5 shrink-0" aria-hidden />
              )}
              {event.type === 'ONLINE'
                ? 'Acara online'
                : [event.venueName, event.city].filter(Boolean).join(', ') || 'Lokasi menyusul'}
            </p>
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div>
                <p>{formatEventWhen(event.startsAt, event.endsAt, event.timezone)}</p>
                <p className="mt-0.5 text-xs text-white/90">
                  {formatTimeZoneLabel(event.timezone)}
                </p>
              </div>
            </div>
            <p className="flex flex-wrap items-center gap-3">
              <Shapes className="size-5 shrink-0" aria-hidden />
              <Link
                to={`/events?category=${encodeURIComponent(event.category.slug)}`}
                className="hover:underline"
              >
                {event.category.name}
              </Link>
              {event.isDemo ? (
                <span className="rounded bg-white/15 px-2 py-0.5 text-xs">Acara demo</span>
              ) : null}
            </p>
          </div>
        </section>

        <aside className="event-detail-summary" aria-label="Ringkasan pembelian tiket">
          <div className="event-summary-card">
            <EventPoster
              title={event.title}
              coverKey={event.coverKey}
              category={event.category.name}
              startsAt={event.startsAt}
              city={event.city}
              timezone={event.timezone}
              sizes="(min-width: 1024px) 440px, 95vw"
              imageClassName="object-contain"
            />
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-4 sm:p-5">
              <div>
                <p className="text-xs text-slate-500">
                  {activeTab === 'tickets' ? 'Harga per tiket' : 'Harga mulai dari'}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
                  {priceLabel}
                </p>
              </div>
              <div className="min-w-32 flex-1 sm:max-w-44">{bookingButton}</div>
            </div>
            <Link
              to={`/organizers/${event.organizer.slug}`}
              className="flex items-center gap-3 p-5 hover:bg-slate-50"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-950 font-medium text-white">
                {event.organizer.organizationName.charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Diselenggarakan oleh</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-medium">
                  {event.organizer.organizationName}
                  {event.organizer.status === 'ACTIVE' ? (
                    <CheckCircle2
                      className="size-4 shrink-0 text-blue-700"
                      aria-label="Organizer aktif"
                    />
                  ) : null}
                </p>
              </div>
            </Link>
          </div>
          <div className="mt-5 flex items-center justify-between gap-4">
            <p className="text-sm font-medium">Bagikan event</p>
            <button
              type="button"
              onClick={() => void share()}
              className="flex min-h-11 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-medium text-blue-700 hover:bg-blue-50"
              aria-label="Bagikan acara"
            >
              <Share2 className="size-4" aria-hidden />
              Salin tautan
            </button>
          </div>
        </aside>

        <article id="event-content" className="event-detail-content">
          {cancelled || ended ? (
            <div
              role="status"
              className="mb-5 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900"
            >
              <AlertCircle className="size-5 shrink-0" aria-hidden />
              {unavailable}. Penjualan tiket ditutup.
            </div>
          ) : null}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList
              className="detail-tabs flex h-auto w-full justify-start gap-4 overflow-x-auto rounded-none border-b border-slate-200 bg-transparent p-0"
              aria-label="Informasi acara"
            >
              <TabsTrigger value="about">Deskripsi</TabsTrigger>
              <TabsTrigger value="tickets">Tiket</TabsTrigger>
              <TabsTrigger value="rules">Syarat & ketentuan</TabsTrigger>
              <TabsTrigger value="location">Lokasi</TabsTrigger>
            </TabsList>
            <TabsContent value="about" className="detail-tab-content">
              <div className="event-description">
                <ReactMarkdown>{event.description}</ReactMarkdown>
              </div>
            </TabsContent>
            <TabsContent value="tickets" className="detail-tab-content">
              <h2 className="text-xl font-semibold">Pilih tiketmu</h2>
              <p className="mt-2 text-sm text-slate-600">
                Pilih kategori tiket, lalu lanjutkan ke data pembeli.
              </p>
              <fieldset className="mt-5 space-y-3">
                <legend className="sr-only">Kategori tiket</legend>
                {tickets.length ? (
                  tickets.map((ticket) => {
                    const available =
                      Boolean(ticket.isOnSale) &&
                      (ticket.available ?? 0) > 0 &&
                      !cancelled &&
                      !ended;
                    const active = selected?.id === ticket.id && canBook;
                    return (
                      <label
                        key={ticket.id}
                        className={cn(
                          'ticket-option',
                          active && 'ticket-option-selected',
                          !available && 'ticket-option-disabled',
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="ticket-category"
                            value={ticket.id}
                            checked={active}
                            disabled={!available}
                            onChange={() => setSelectedId(ticket.id)}
                            className="mt-1 size-4 shrink-0 accent-blue-600"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <span className="text-sm font-medium">{ticket.name}</span>
                              <span className="text-sm font-semibold tabular-nums">
                                {ticket.price === 0 ? 'Gratis' : formatIDR(ticket.price)}
                              </span>
                            </div>
                            {ticket.description ? (
                              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                                {ticket.description}
                              </p>
                            ) : null}
                            <p
                              className={cn(
                                'mt-3 text-xs font-medium',
                                available ? 'text-emerald-700' : 'text-slate-500',
                              )}
                            >
                              {available
                                ? `Tersedia ${ticket.available} tiket`
                                : (ticket.available ?? 0) <= 0
                                  ? 'Tiket habis'
                                  : 'Tidak sedang dijual'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Min. {ticket.minPerOrder}, maks. {ticket.maxPerOrder} per pesanan
                            </p>
                          </div>
                        </div>
                      </label>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-500">Kategori tiket belum tersedia.</p>
                )}
              </fieldset>
              {event.salesEndAt ? (
                <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
                  <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  Penjualan sampai {formatDateLong(event.salesEndAt, event.timezone)},{' '}
                  {formatTime(event.salesEndAt, event.timezone)}
                </p>
              ) : null}
              <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs text-slate-500">Harga per tiket</p>
                  <p className="mt-1 text-xl font-semibold">{priceLabel}</p>
                </div>
                <div className="sm:min-w-52">{bookingButton}</div>
              </div>
              <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500">
                <Ticket className="mt-0.5 size-4 shrink-0 text-blue-700" aria-hidden />
                E-tiket tersedia setelah pembayaran terkonfirmasi.
              </p>
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
                  : [event.address, event.city].filter(Boolean).join(', ')}
              </p>
              {event.type === 'OFFLINE' && (event.address || event.venueName) ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event.venueName, event.address, event.city].filter(Boolean).join(', '))}`}
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
          <div className="min-w-0">
            <p className="truncate text-xs text-slate-500">{selected?.name}</p>
            <p className="mt-1 font-semibold tabular-nums">{priceLabel}</p>
          </div>
          <div className="max-w-[60%]">{bookingButton}</div>
        </div>
      ) : null}
    </main>
  );
}
