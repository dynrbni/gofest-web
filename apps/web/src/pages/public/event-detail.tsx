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
  Ticket,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { EventPoster } from '@/components/common/event-presentation';
import { ErrorState, LoadingState } from '@/components/common/states';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateLong, formatEventWhen, formatIDR, formatTime } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { usePublicEvent } from '@/lib/queries';
import { cn } from '@/lib/utils';

export function EventDetailPage() {
  const { slug } = useParams();
  const eventQuery = usePublicEvent(slug);
  const event = eventQuery.data?.event;
  const [selectedId, setSelectedId] = useState('');
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

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Tautan acara disalin');
    } catch {
      toast.error('Salin tautan acara dari alamat browser.');
    }
  }
  const bookingButton = canBook ? (
    <Link to={checkout} className="primary-action w-full">
      Lanjutkan pembelian
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  ) : (
    <p
      role="status"
      className="rounded-lg bg-slate-100 p-4 text-center text-sm font-semibold text-slate-600"
    >
      {unavailable}
    </p>
  );

  return (
    <main className="bg-slate-50/70 pb-28 lg:pb-12">
      <div className="container py-5">
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-2 text-xs text-slate-500"
        >
          <Link to="/" className="hover:text-blue-700">
            Beranda
          </Link>
          <span aria-hidden>/</span>
          <Link to="/events" className="hover:text-blue-700">
            Acara
          </Link>
          <span aria-hidden>/</span>
          <span className="truncate text-slate-700" aria-current="page">
            {event.title}
          </span>
        </nav>
      </div>
      <div className="container grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_350px] xl:gap-9">
        <article className="min-w-0">
          <div className="overflow-hidden rounded-xl">
            <EventPoster
              title={event.title}
              coverKey={event.coverKey}
              category={event.category.name}
              startsAt={event.startsAt}
              city={event.city}
              timezone={event.timezone}
              sizes="(min-width: 1024px) 800px, 95vw"
            />
          </div>
          <div className="mt-6 flex items-start justify-between gap-3">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Link
                  to={`/events?category=${event.category.slug}`}
                  className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
                >
                  {event.category.name}
                </Link>
                {event.isDemo ? <span className="text-xs text-slate-500">Acara demo</span> : null}
              </div>
              <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">{event.title}</h1>
            </div>
            <button
              type="button"
              onClick={() => void share()}
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:border-blue-600 hover:text-blue-700"
              aria-label="Bagikan acara"
            >
              <Share2 className="size-4" aria-hidden />
            </button>
          </div>
          {cancelled || ended ? (
            <div
              role="status"
              className="mt-5 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900"
            >
              <AlertCircle className="size-5 shrink-0" aria-hidden />
              {unavailable}. Penjualan tiket ditutup.
            </div>
          ) : null}
          <div className="mt-6 grid gap-5 border-b border-slate-200 pb-7 sm:grid-cols-2">
            <div className="flex gap-3">
              <CalendarDays className="mt-1 size-5 shrink-0 text-blue-700" aria-hidden />
              <div>
                <p className="text-xs text-slate-500">Tanggal & waktu</p>
                <p className="mt-1 text-sm font-semibold">
                  {formatEventWhen(event.startsAt, event.endsAt, event.timezone)}
                </p>
                <p className="mt-1 text-xs text-slate-500">{event.timezone}</p>
              </div>
            </div>
            <div className="flex gap-3">
              {event.type === 'ONLINE' ? (
                <Globe2 className="mt-1 size-5 shrink-0 text-blue-700" aria-hidden />
              ) : (
                <MapPin className="mt-1 size-5 shrink-0 text-blue-700" aria-hidden />
              )}
              <div>
                <p className="text-xs text-slate-500">Lokasi acara</p>
                <p className="mt-1 text-sm font-semibold">
                  {event.type === 'ONLINE'
                    ? 'Acara online'
                    : (event.venueName ?? 'Lokasi menyusul')}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {event.type === 'ONLINE'
                    ? 'Informasi akses tersedia di tiket setelah pembayaran.'
                    : [event.address, event.city].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
          </div>
          <Tabs defaultValue="about" className="mt-6">
            <TabsList className="detail-tabs flex h-auto w-full justify-start gap-3 overflow-x-auto rounded-none border-b border-slate-200 bg-transparent p-0">
              <TabsTrigger value="about">Tentang acara</TabsTrigger>
              <TabsTrigger value="rules">Syarat & ketentuan</TabsTrigger>
              <TabsTrigger value="refund">Pengembalian dana</TabsTrigger>
              <TabsTrigger value="location">Lokasi</TabsTrigger>
            </TabsList>
            <TabsContent value="about" className="detail-tab-content">
              <div className="event-description">
                <ReactMarkdown>{event.description}</ReactMarkdown>
              </div>
            </TabsContent>
            <TabsContent value="rules" className="detail-tab-content">
              <div className="event-description">
                <ReactMarkdown>
                  {event.rules ||
                    'Penyelenggara belum menambahkan ketentuan khusus. Baca syarat layanan GoFest sebelum memesan.'}
                </ReactMarkdown>
              </div>
            </TabsContent>
            <TabsContent value="refund" className="detail-tab-content">
              <div className="event-description">
                <ReactMarkdown>
                  {event.refundPolicy ||
                    'Penyelenggara belum menambahkan kebijakan pengembalian dana. Periksa ketentuan acara sebelum membeli tiket.'}
                </ReactMarkdown>
              </div>
            </TabsContent>
            <TabsContent value="location" className="detail-tab-content">
              <h2 className="text-lg font-bold">
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
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-950 font-bold text-white">
                {event.organizer.organizationName.charAt(0)}
              </span>
              <div>
                <p className="text-xs text-slate-500">Diselenggarakan oleh</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-bold">
                  {event.organizer.organizationName}
                  {event.organizer.status === 'ACTIVE' ? (
                    <CheckCircle2 className="size-4 text-blue-700" aria-label="Organizer aktif" />
                  ) : null}
                </p>
              </div>
            </div>
            <Link to={`/organizers/${event.organizer.slug}`} className="text-link">
              Profil organizer
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </article>
        <aside className="booking-panel lg:sticky lg:top-36">
          <div className="border-b border-slate-200 pb-5">
            <h2 className="text-xl font-extrabold">Pilih tiketmu</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Pilih kategori yang pas, lanjutkan ke data pembeli.
            </p>
          </div>
          <fieldset className="mt-5 space-y-3">
            <legend className="sr-only">Kategori tiket</legend>
            {tickets.length ? (
              tickets.map((ticket) => {
                const available =
                  Boolean(ticket.isOnSale) && (ticket.available ?? 0) > 0 && !cancelled && !ended;
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
                          <span className="text-sm font-bold">{ticket.name}</span>
                          <span className="text-sm font-extrabold tabular-nums">
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
                            'mt-3 text-xs font-semibold',
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
          <div className="mt-6 border-t border-slate-200 pt-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <span className="text-sm text-slate-600">Harga per tiket</span>
              <span className="text-xl font-extrabold tabular-nums">{priceLabel}</span>
            </div>
            {bookingButton}
            <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
              <Ticket className="mt-0.5 size-4 shrink-0 text-blue-700" aria-hidden />
              E-tiket tersedia setelah pembayaran terkonfirmasi.
            </p>
          </div>
        </aside>
      </div>
      {canBook ? (
        <div className="mobile-booking">
          <div>
            <p className="text-xs text-slate-500">{selected?.name}</p>
            <p className="mt-1 font-extrabold tabular-nums">{priceLabel}</p>
          </div>
          <Link to={checkout} className="primary-action">
            Beli tiket
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      ) : null}
    </main>
  );
}
