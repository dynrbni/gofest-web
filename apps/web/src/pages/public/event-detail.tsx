import { ArrowLeft, CalendarDays, Globe2, MapPin, Share2, Ticket } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EventPoster } from '@/components/common/event-presentation';
import { ErrorState, LoadingState } from '@/components/common/states';
import { useDocumentTitle } from '@/lib/hooks';
import { formatDateLong, formatEventWhen, formatIDR, formatTime } from '@/lib/format';
import { usePublicEvent } from '@/lib/queries';
import { toast } from 'sonner';

export function EventDetailPage() {
  const { slug } = useParams();
  const eventQuery = usePublicEvent(slug);
  const event = eventQuery.data?.event;
  useDocumentTitle(event?.title ?? 'Detail acara');

  if (eventQuery.isLoading) {
    return (
      <main className="container py-10">
        <LoadingState rows={4} label="Memuat detail acara" />
      </main>
    );
  }

  if (eventQuery.isError || !event) {
    return (
      <main className="container max-w-3xl py-14">
        <Link to="/events" className="inline-flex items-center gap-2 text-sm font-semibold text-olive">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke jelajah acara
        </Link>
        <ErrorState
          className="mt-6"
          error={eventQuery.error}
          onRetry={() => void eventQuery.refetch()}
          title="Acara tidak dapat dibuka"
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
      toast.success('Tautan acara disalin');
    } catch {
      toast.error('Tautan tidak dapat disalin otomatis. Salin dari address bar.');
    }
  }

  return (
    <main className="pb-24 lg:pb-0">
      <div className="border-b border-warm-border">
        <div className="container py-5">
          <Link
            to="/events"
            className="inline-flex items-center gap-2 text-sm font-semibold text-olive hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Semua acara
          </Link>
        </div>
      </div>

      <div className="container grid gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14 lg:py-12">
        <article>
          <div className="grid gap-6 sm:grid-cols-[minmax(0,280px)_1fr] sm:gap-8">
            <EventPoster
              title={event.title}
              coverKey={event.coverKey}
              category={event.category.name}
              startsAt={event.startsAt}
              city={event.city}
              timezone={event.timezone}
              className="rounded-sm"
              sizes="(min-width: 640px) 280px, 90vw"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-olive">
                {event.category.name} · {event.type === 'ONLINE' ? 'Online' : 'Offline'}
              </p>
              <h1 className="mt-2 font-display text-4xl leading-[0.98] tracking-tightest sm:text-5xl">
                {event.title}
              </h1>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">{event.summary}</p>

              {cancelled ? (
                <div className="mt-5 border-l-4 border-brick bg-brick/5 px-4 py-3" role="status">
                  <p className="text-sm font-bold text-brick">Acara ini dibatalkan organizer.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pembelian tiket sudah ditutup. Bila kamu memiliki tiket, buka halaman pesanan untuk
                    melihat status penanganannya.
                  </p>
                </div>
              ) : null}

              <dl className="mt-5 space-y-3 border-t border-warm-border pt-4 text-sm">
                <div className="flex gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-olive" aria-hidden />
                  <div>
                    <dt className="sr-only">Waktu</dt>
                    <dd>{formatEventWhen(event.startsAt, event.endsAt, event.timezone)}</dd>
                    <dd className="text-xs text-muted-foreground">Zona waktu {event.timezone}</dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  {event.type === 'ONLINE' ? (
                    <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-olive" aria-hidden />
                  ) : (
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-olive" aria-hidden />
                  )}
                  <div>
                    <dt className="sr-only">Lokasi</dt>
                    <dd>
                      {event.type === 'ONLINE'
                        ? 'Acara online'
                        : `${event.venueName ?? 'Venue'} · ${event.city ?? ''}`}
                    </dd>
                    <dd className="text-xs text-muted-foreground">
                      {event.type === 'ONLINE'
                        ? 'Tautan akses dikirim setelah pembayaran dikonfirmasi.'
                        : (event.address ?? 'Alamat lengkap tersedia di tiket.')}
                    </dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-olive" aria-hidden />
                  <div>
                    <dt className="sr-only">Organizer</dt>
                    <dd>
                      <Link
                        to={`/organizers/${event.organizer.slug}`}
                        className="font-semibold underline decoration-warm-border underline-offset-4 hover:decoration-vermilion"
                      >
                        {event.organizer.organizationName}
                      </Link>
                    </dd>
                    <dd className="text-xs text-muted-foreground">Penyelenggara acara</dd>
                  </div>
                </div>
              </dl>

              <button
                type="button"
                onClick={() => void share()}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-olive hover:text-ink"
              >
                <Share2 className="h-4 w-4" aria-hidden />
                Salin tautan acara
              </button>
            </div>
          </div>

          <div className="mt-10 max-w-3xl">
            <h2 className="border-b border-ink pb-2 text-lg font-bold">Tentang acara</h2>
            <div className="mt-4 space-y-4 whitespace-pre-line text-[15px] leading-[1.75] text-ink/90">
              {event.description}
            </div>

            {event.rules ? (
              <section className="mt-8">
                <h2 className="border-b border-ink pb-2 text-lg font-bold">Aturan pembelian dan kehadiran</h2>
                <div className="mt-4 whitespace-pre-line text-[15px] leading-[1.75] text-ink/90">
                  {event.rules}
                </div>
              </section>
            ) : null}

            {event.refundPolicy ? (
              <section className="mt-8">
                <h2 className="border-b border-ink pb-2 text-lg font-bold">Kebijakan refund</h2>
                <div className="mt-4 whitespace-pre-line text-[15px] leading-[1.75] text-ink/90">
                  {event.refundPolicy}
                </div>
              </section>
            ) : (
              <p className="mt-8 border-l-2 border-warm-border pl-4 text-sm text-muted-foreground">
                Organizer belum menuliskan kebijakan refund untuk acara ini. Hubungi organizer sebelum
                membeli bila kebijakan refund penting untukmu.
              </p>
            )}
          </div>
        </article>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="border border-ink/20 bg-card shadow-sm">
            <div className="border-b border-warm-border p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-olive">Tiket</p>
              <p className="mt-1 text-lg font-bold">
                {event.priceFrom === 0
                  ? 'Gratis'
                  : event.priceFrom !== null
                    ? `Mulai ${formatIDR(event.priceFrom)}`
                    : 'Harga belum tersedia'}
              </p>
              {event.salesEndAt ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Penjualan berakhir {formatDateLong(event.salesEndAt, event.timezone)},{' '}
                  {formatTime(event.salesEndAt, event.timezone)}
                </p>
              ) : null}
            </div>

            <div className="divide-y divide-warm-border">
              {ticketTypes.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">
                  Organizer belum menambahkan tipe tiket. Halaman ini akan diperbarui saat tiket
                  tersedia.
                </p>
              ) : (
                ticketTypes.map((ticket) => (
                  <div key={ticket.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold">{ticket.name}</p>
                        {ticket.description ? (
                          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                            {ticket.description}
                          </p>
                        ) : null}
                      </div>
                      <p className="shrink-0 text-sm font-bold tabular-nums">
                        {ticket.price === 0 ? 'Gratis' : formatIDR(ticket.price)}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="tabular-nums">
                        {(ticket.available ?? 0) > 0 ? `${ticket.available} tersisa` : 'Habis'}
                      </span>
                      <span aria-hidden>·</span>
                      <span>Maks. {ticket.maxPerOrder} per order</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-warm-border p-5">
              {cancelled ? (
                <p className="text-sm font-semibold text-brick">Penjualan ditutup karena acara dibatalkan.</p>
              ) : soldOut ? (
                <div>
                  <p className="text-sm font-bold">Tiket habis</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Semua tipe tiket sudah mencapai kuota. Hubungi organizer bila kamu ingin masuk daftar
                    tunggu di luar platform.
                  </p>
                </div>
              ) : onSale.length === 0 ? (
                <div>
                  <p className="text-sm font-bold">Penjualan belum dibuka</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Tiket ada, tetapi periode penjualannya belum dimulai atau sudah berakhir.
                  </p>
                </div>
              ) : (
                <Link
                  to={`/checkout/${event.slug}`}
                  className="flex h-11 w-full items-center justify-center rounded-md bg-brick text-sm font-semibold text-paper transition-colors hover:bg-brick/90"
                >
                  Pilih tiket
                </Link>
              )}
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                Harga dan biaya dihitung ulang di server saat checkout.
              </p>
            </div>
          </div>
          {event.isDemo ? (
            <p className="mt-3 border border-warm-border bg-warm-muted px-3 py-2 text-[11px] text-muted-foreground">
              Acara demo untuk pengembangan. Data dan tiket tidak mewakili penjualan nyata.
            </p>
          ) : null}
        </aside>
      </div>

      {!cancelled && !soldOut && onSale.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink/15 bg-paper/95 p-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Mulai</p>
              <p className="text-sm font-bold tabular-nums">
                {event.priceFrom === 0 ? 'Gratis' : formatIDR(event.priceFrom)}
              </p>
            </div>
            <Link
              to={`/checkout/${event.slug}`}
              className="flex h-11 flex-1 items-center justify-center rounded-md bg-brick text-sm font-semibold text-paper"
            >
              Pilih tiket
            </Link>
          </div>
        </div>
      ) : null}
    </main>
  );
}