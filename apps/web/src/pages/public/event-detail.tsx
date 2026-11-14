import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Globe2,
  MapPin,
  Share2,
  ShieldCheck,
  Sparkles,
  Ticket,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '@/components/common/states';
import { assetUrl } from '@/lib/assets';
import { formatDateLong, formatEventWhen, formatIDR, formatTime } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { usePublicEvent } from '@/lib/queries';
import { cn } from '@/lib/utils';

export function EventDetailPage() {
  const { slug } = useParams();
  const eventQuery = usePublicEvent(slug);
  const event = eventQuery.data?.event;
  const [activeTab, setActiveTab] = useState<'desc' | 'rules' | 'refund'>('desc');
  useDocumentTitle(event?.title ? `${event.title} - Tiket Resmi Gofest` : 'Detail Acara');

  if (eventQuery.isLoading) {
    return (
      <main className="container py-12">
        <LoadingState rows={4} label="Memuat detail acara..." />
      </main>
    );
  }

  if (eventQuery.isError || !event) {
    return (
      <main className="container max-w-2xl py-16">
        <Link to="/events" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke Jelajah Acara
        </Link>
        <ErrorState
          className="mt-6"
          error={eventQuery.error}
          onRetry={() => void eventQuery.refetch()}
          title="Acara Tidak Ditemukan"
        />
      </main>
    );
  }

  const ticketTypes = event.ticketTypes ?? [];
  const onSale = ticketTypes.filter((ticket) => ticket.isOnSale);
  const soldOut = ticketTypes.length > 0 && ticketTypes.every((ticket) => (ticket.available ?? 0) <= 0);
  const cancelled = event.status === 'CANCELLED';

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Tautan acara berhasil disalin ke clipboard!');
    } catch {
      toast.error('Gagal menyalin tautan otomatis. Silakan salin dari browser URL bar.');
    }
  }

  return (
    <main className="min-h-screen pb-28 lg:pb-16">
      {/* 1. Breadcrumbs */}
      <div className="border-b border-slate-200/80 bg-white">
        <div className="container flex items-center justify-between py-3.5 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-2 truncate">
            <Link to="/" className="hover:text-blue-600">
              Beranda
            </Link>
            <span>/</span>
            <Link to="/events" className="hover:text-blue-600">
              Acara
            </Link>
            <span>/</span>
            <Link to={`/events?category=${event.category.slug}`} className="hover:text-blue-600">
              {event.category.name}
            </Link>
            <span>/</span>
            <span className="truncate font-semibold text-slate-800">{event.title}</span>
          </div>

          <button
            type="button"
            onClick={() => void share()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-blue-600"
          >
            <Share2 className="h-3.5 w-3.5" />
            Bagikan
          </button>
        </div>
      </div>

      {/* 2. Main Detail Grid */}
      <div className="container mt-8 grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-12">
        {/* Left Column: Event Poster, Metadata, & Content */}
        <article className="min-w-0">
          {/* Hero Banner Visual Card */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900 sm:aspect-[21/9]">
              {event.coverKey ? (
                <img
                  src={assetUrl(event.coverKey) ?? undefined}
                  alt={event.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-700 to-indigo-900 p-8 text-center text-white">
                  <div>
                    <Sparkles className="mx-auto mb-3 h-10 w-10 text-blue-200" />
                    <h2 className="text-2xl font-black">{event.title}</h2>
                  </div>
                </div>
              )}

              {/* Badges on Poster */}
              <div className="absolute left-4 top-4 flex items-center gap-2">
                <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
                  {event.category.name}
                </span>
                <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-xs">
                  {event.type === 'ONLINE' ? 'Online Event' : 'Offline'}
                </span>
              </div>
            </div>

            {/* Event Header Info */}
            <div className="p-6 sm:p-8">
              <h1 className="text-2xl font-black leading-tight tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
                {event.title}
              </h1>

              {cancelled && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700 border border-rose-200">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-bold">Acara Ini Dibatalkan</p>
                    <p className="text-xs text-rose-600">
                      Organizer telah membatalkan acara ini. Penjualan tiket ditutup.
                    </p>
                  </div>
                </div>
              )}

              {/* Key Meta Strip (Date, Venue, Organizer) */}
              <div className="mt-6 grid grid-cols-1 gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Waktu & Tanggal</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-800">
                      {formatEventWhen(event.startsAt, event.endsAt, event.timezone)}
                    </p>
                    <p className="text-xs text-slate-500">Zona waktu {event.timezone}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    {event.type === 'ONLINE' ? <Globe2 className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Lokasi Acara</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-800">
                      {event.type === 'ONLINE' ? 'Event Online' : event.venueName ?? 'Venue Belum Ditentukan'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {event.type === 'ONLINE'
                        ? 'Tautan streaming dikirim via email'
                        : `${event.address ? `${event.address}, ` : ''}${event.city ?? ''}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Organizer Profile Card */}
              <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-200/80 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                    {event.organizer.organizationName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-slate-900">{event.organizer.organizationName}</p>
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-xs text-slate-500">Penyelenggara Resmi Terverifikasi</p>
                  </div>
                </div>

                <Link
                  to={`/organizers/${event.organizer.slug}`}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                >
                  Lihat Profil
                </Link>
              </div>
            </div>
          </div>

          {/* Navigation Tabs (Deskripsi, Syarat & Ketentuan, Refund) */}
          <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8">
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('desc')}
                className={cn(
                  '-mb-px border-b-2 px-5 py-3 text-sm font-bold transition-colors',
                  activeTab === 'desc'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900',
                )}
              >
                Deskripsi Acara
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('rules')}
                className={cn(
                  '-mb-px border-b-2 px-5 py-3 text-sm font-bold transition-colors',
                  activeTab === 'rules'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900',
                )}
              >
                Syarat & Ketentuan
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('refund')}
                className={cn(
                  '-mb-px border-b-2 px-5 py-3 text-sm font-bold transition-colors',
                  activeTab === 'refund'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900',
                )}
              >
                Kebijakan Refund
              </button>
            </div>

            <div className="mt-6 text-sm leading-relaxed text-slate-700">
              {activeTab === 'desc' && (
                <div className="space-y-4 whitespace-pre-line leading-7">
                  {event.description}
                </div>
              )}

              {activeTab === 'rules' && (
                <div className="space-y-4 whitespace-pre-line leading-7">
                  {event.rules ||
                    'Tidak ada syarat dan ketentuan khusus dari organizer untuk acara ini. Patuhi norma kenyamanan umum selama acara berlangsung.'}
                </div>
              )}

              {activeTab === 'refund' && (
                <div className="space-y-4 whitespace-pre-line leading-7">
                  {event.refundPolicy ||
                    'Tiket yang sudah dibeli bersifat non-refundable (tidak dapat dikembalikan) kecuali acara dibatalkan secara resmi oleh pihak penyelenggara.'}
                </div>
              )}
            </div>
          </div>
        </article>

        {/* Right Column: Sticky Booking Widget (Loket / Artatix Standard) */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-lg">
            {/* Header / Starting Price */}
            <div className="border-b border-slate-100 pb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Pilih Kategori Tiket
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-blue-600 tabular-nums">
                  {event.priceFrom === 0
                    ? 'Gratis'
                    : event.priceFrom !== null
                      ? formatIDR(event.priceFrom)
                      : 'Harga Menyusul'}
                </span>
                <span className="text-xs text-slate-400">/ tiket</span>
              </div>
              {event.salesEndAt && (
                <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-slate-500">
                  <Clock className="h-3 w-3 text-slate-400" />
                  Penjualan berakhir {formatDateLong(event.salesEndAt, event.timezone)},{' '}
                  {formatTime(event.salesEndAt, event.timezone)}
                </p>
              )}
            </div>

            {/* Available Ticket Categories List */}
            <div className="mt-4 divide-y divide-slate-100">
              {ticketTypes.length === 0 ? (
                <p className="py-4 text-xs text-slate-500">
                  Organizer belum menambahkan kategori tiket untuk acara ini.
                </p>
              ) : (
                ticketTypes.map((ticket) => (
                  <div key={ticket.id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{ticket.name}</p>
                        {ticket.description && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                            {ticket.description}
                          </p>
                        )}
                        <p className="mt-1 text-[11px] font-medium text-slate-400">
                          Maks. {ticket.maxPerOrder} tiket / pesanan
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-extrabold text-slate-900 tabular-nums">
                          {ticket.price === 0 ? 'Gratis' : formatIDR(ticket.price)}
                        </p>
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            (ticket.available ?? 0) > 0
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-rose-50 text-rose-600'
                          }`}
                        >
                          {(ticket.available ?? 0) > 0 ? `${ticket.available} Tersisa` : 'Habis'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Action CTA */}
            <div className="mt-6 border-t border-slate-100 pt-5">
              {cancelled ? (
                <div className="rounded-xl bg-slate-100 p-3 text-center text-xs font-bold text-slate-500">
                  Penjualan Ditutup (Event Dibatalkan)
                </div>
              ) : soldOut ? (
                <div className="rounded-xl bg-rose-50 p-3 text-center text-xs font-bold text-rose-600">
                  Tiket Habis Terjual (Sold Out)
                </div>
              ) : onSale.length === 0 ? (
                <div className="rounded-xl bg-slate-100 p-3 text-center text-xs font-bold text-slate-500">
                  Periode Penjualan Belum Dibuka
                </div>
              ) : (
                <Link
                  to={`/checkout/${event.slug}`}
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-700 active:scale-95"
                >
                  <Ticket className="mr-2 h-4 w-4" />
                  Beli Tiket Sekarang
                </Link>
              )}

              {/* Trust Badges */}
              <div className="mt-4 space-y-2 text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Jaminan e-tiket resmi langsung terbit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                  <span>Metode pembayaran QRIS, Virtual Account, & E-Wallet</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Floating Bottom Action Bar on Mobile */}
      {!cancelled && !soldOut && onSale.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3.5 backdrop-blur-md lg:hidden">
          <div className="container flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Mulai dari</p>
              <p className="text-base font-black text-blue-600 tabular-nums">
                {event.priceFrom === 0 ? 'Gratis' : formatIDR(event.priceFrom)}
              </p>
            </div>
            <Link
              to={`/checkout/${event.slug}`}
              className="flex h-11 flex-1 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-md active:scale-95"
            >
              Beli Tiket
            </Link>
          </div>
        </div>
      ) : null}
    </main>
  );
}
