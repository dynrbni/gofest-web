import { ArrowLeft, Minus, Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ErrorState, Field, InlineError, LoadingState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, fieldErrors, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateLong, formatEventWhen, formatIDR, formatTime } from '@/lib/format';
import { useDebouncedValue, useDocumentTitle } from '@/lib/hooks';
import type { Order } from '@/lib/models';
import { usePublicEvent } from '@/lib/queries';
import { cn } from '@/lib/utils';

interface QuoteResult {
  subtotal: number;
  discount: number;
  platformFee: number;
  total: number;
  currency: string;
  couponCode: string | null;
  reservationMinutes: number;
  expiresAt: string;
  lines: Array<{ ticketTypeId: string; name: string; quantity: number; unitPrice: number; lineTotal: number }>;
}

export function CheckoutPage() {
  const { eventSlug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const eventQuery = usePublicEvent(eventSlug);
  const event = eventQuery.data?.event;
  useDocumentTitle(event ? `Checkout ${event.title}` : 'Checkout');

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [initialized, setInitialized] = useState(false);
  const [buyer, setBuyer] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
  });
  const [couponInput, setCouponInput] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKey = useRef(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const debouncedEmail = useDebouncedValue(buyer.email, 500);
  const debouncedCoupon = useDebouncedValue(couponCode, 400);

  const ticketTypes = event?.ticketTypes ?? [];
  const selectedItems = useMemo(
    () =>
      Object.entries(quantities)
        .filter(([, quantity]) => quantity > 0)
        .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity })),
    [quantities],
  );
  const totalQuantity = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const localSubtotal = selectedItems.reduce((sum, item) => {
    const ticket = ticketTypes.find((entry) => entry.id === item.ticketTypeId);
    return sum + (ticket?.price ?? 0) * item.quantity;
  }, 0);

  useEffect(() => {
    if (!event || initialized) return;
    const onSale = event.ticketTypes.filter((ticket) => ticket.isOnSale);
    const first = onSale[0];
    if (first) {
      setQuantities({ [first.id]: first.minPerOrder });
    }
    setInitialized(true);
  }, [event, initialized]);

  const quoteQueryKey = useMemo(
    () => ({
      eventId: event?.id ?? '',
      items: selectedItems,
      coupon: debouncedCoupon.trim().toUpperCase(),
      email: debouncedEmail,
    }),
    [event?.id, selectedItems, debouncedCoupon, debouncedEmail],
  );

  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quoteError, setQuoteError] = useState<unknown>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  useEffect(() => {
    if (!quoteQueryKey.eventId || quoteQueryKey.items.length === 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    api<QuoteResult>('/orders/quote', {
      method: 'POST',
      body: {
        eventId: quoteQueryKey.eventId,
        items: quoteQueryKey.items,
        couponCode: quoteQueryKey.coupon || undefined,
        buyerEmail: quoteQueryKey.email || undefined,
      },
    })
      .then((result) => {
        if (cancelled) return;
        setQuote(result);
        setQuoteError(null);
      })
      .catch((caught) => {
        if (cancelled) return;
        setQuote(null);
        setQuoteError(caught);
      })
      .finally(() => {
        if (!cancelled) setQuoteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [quoteQueryKey]);

  function setQuantity(id: string, value: number, max: number, min: number) {
    const bounded = Math.max(0, Math.min(max, value));
    setQuantities((current) => ({ ...current, [id]: bounded < min && bounded !== 0 ? min : bounded }));
  }

  function applyCoupon(event: FormEvent) {
    event.preventDefault();
    setCouponCode(couponInput.trim().toUpperCase());
  }

  function resetCoupon() {
    setCouponInput('');
    setCouponCode('');
    setQuoteError(null);
  }

  async function onSubmit(submitEvent: FormEvent) {
    submitEvent.preventDefault();
    if (!event) return;
    setError(null);
    const next: Record<string, string> = {};
    if (buyer.name.trim().length < 2) next.buyerName = 'Nama minimal 2 karakter';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email.trim())) next.buyerEmail = 'Format email tidak valid';
    if (
      buyer.phone.trim() &&
      !/^(\+62|62|0)8[1-9][0-9]{6,12}$/.test(buyer.phone.replace(/[\s-]/g, ''))
    ) {
      next.buyerPhone = 'Nomor WhatsApp tidak valid';
    }
    if (totalQuantity === 0) next.items = 'Pilih minimal satu tiket';
    if (!accepted) next.terms = 'Kamu perlu menyetujui syarat pembelian';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const result = await api<{
        order: Order;
        accessToken: string;
        reused: boolean;
        paymentRequired: boolean;
      }>('/orders', {
        method: 'POST',
        body: {
          eventId: event.id,
          buyerName: buyer.name.trim(),
          buyerEmail: buyer.email.trim(),
          buyerPhone: buyer.phone.trim() || undefined,
          couponCode: couponCode || undefined,
          items: selectedItems,
          acceptTerms: true,
          idempotencyKey: idempotencyKey.current,
        },
      });
      sessionStorage.setItem(`gofest-order-token:${result.order.orderCode}`, result.accessToken);
      toast.success(result.reused ? 'Pesanan sebelumnya dibuka kembali' : 'Pesanan dibuat');
      navigate(`/order/${result.order.orderCode}?token=${encodeURIComponent(result.accessToken)}`);
    } catch (caught) {
      setError(caught);
      setErrors(fieldErrors(caught));
      if (caught instanceof ApiError && caught.code === 'TICKET_SOLD_OUT') {
        void eventQuery.refetch();
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (eventQuery.isLoading) {
    return (
      <main className="container py-10">
        <LoadingState rows={4} label="Memuat checkout" />
      </main>
    );
  }

  if (eventQuery.isError || !event) {
    return (
      <main className="container max-w-3xl py-14">
        <Link to="/events" className="inline-flex items-center gap-2 text-sm font-semibold text-olive">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke acara
        </Link>
        <ErrorState
          className="mt-6"
          error={eventQuery.error}
          onRetry={() => void eventQuery.refetch()}
          title="Checkout tidak dapat dibuka"
        />
      </main>
    );
  }

  const sellable = ticketTypes.filter((ticket) => ticket.isOnSale);

  return (
    <main className="container py-8 sm:py-12">
      <Link
        to={`/events/${event.slug}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-olive hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Kembali ke detail acara
      </Link>

      <div className="mt-5 border-b border-ink pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-olive">Checkout</p>
        <h1 className="mt-1 font-display text-4xl leading-none tracking-tightest sm:text-5xl">
          {event.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {formatDateLong(event.startsAt, event.timezone)} · {formatTime(event.startsAt, event.timezone)} ·{' '}
          {event.type === 'ONLINE' ? 'Online' : `${event.venueName ?? 'Venue'}${event.city ? `, ${event.city}` : ''}`}
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px] lg:gap-14" noValidate>
        <div className="space-y-10">
          <section aria-labelledby="tickets-heading">
            <div className="flex items-end justify-between gap-3 border-b border-ink pb-2">
              <h2 id="tickets-heading" className="text-lg font-bold">
                1. Pilih tiket
              </h2>
              <p className="text-xs text-muted-foreground">Maksimal 10 tiket per order</p>
            </div>
            {errors.items ? <p className="mt-2 text-xs font-semibold text-brick">{errors.items}</p> : null}
            <div className="mt-1 divide-y divide-warm-border">
              {sellable.length === 0 ? (
                <p className="py-5 text-sm text-muted-foreground">
                  Tidak ada tiket yang sedang dijual untuk acara ini. Kembali ke halaman acara untuk
                  melihat status penjualan.
                </p>
              ) : (
                sellable.map((ticket) => {
                  const quantity = quantities[ticket.id] ?? 0;
                  const max = Math.min(ticket.maxPerOrder, ticket.available ?? 0);
                  return (
                    <div key={ticket.id} className="py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold">{ticket.name}</p>
                          {ticket.description ? (
                            <p className="mt-0.5 max-w-md text-xs leading-relaxed text-muted-foreground">
                              {ticket.description}
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {ticket.available ?? 0} tersisa · min. {ticket.minPerOrder}, maks. {ticket.maxPerOrder} per order
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-bold tabular-nums">
                            {ticket.price === 0 ? 'Gratis' : formatIDR(ticket.price)}
                          </p>
                          <div className="flex items-center rounded-md border border-ink/25">
                            <button
                              type="button"
                              onClick={() => setQuantity(ticket.id, quantity - 1, max, ticket.minPerOrder)}
                              disabled={quantity <= 0}
                              className="flex h-9 w-9 items-center justify-center disabled:opacity-40"
                              aria-label={`Kurangi tiket ${ticket.name}`}
                            >
                              <Minus className="h-4 w-4" aria-hidden />
                            </button>
                            <span className="w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQuantity(ticket.id, quantity + 1, max, ticket.minPerOrder)}
                              disabled={quantity >= max}
                              className="flex h-9 w-9 items-center justify-center disabled:opacity-40"
                              aria-label={`Tambah tiket ${ticket.name}`}
                            >
                              <Plus className="h-4 w-4" aria-hidden />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section aria-labelledby="buyer-heading">
            <h2 id="buyer-heading" className="border-b border-ink pb-2 text-lg font-bold">
              2. Data pembeli
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Tiket dan tautan pesanan dikirim ke email ini. Nama pada tiket mengikuti nama pembeli.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Nama lengkap" htmlFor="checkout-name" error={errors.buyerName} required>
                <Input
                  id="checkout-name"
                  autoComplete="name"
                  value={buyer.name}
                  onChange={(changeEvent) =>
                    setBuyer((current) => ({ ...current, name: changeEvent.target.value }))
                  }
                  className="h-11 border-ink/25 bg-card"
                />
              </Field>
              <Field label="Email" htmlFor="checkout-email" error={errors.buyerEmail} required>
                <Input
                  id="checkout-email"
                  type="email"
                  autoComplete="email"
                  value={buyer.email}
                  onChange={(changeEvent) =>
                    setBuyer((current) => ({ ...current, email: changeEvent.target.value }))
                  }
                  className="h-11 border-ink/25 bg-card"
                />
              </Field>
              <Field
                label="Nomor WhatsApp"
                htmlFor="checkout-phone"
                hint="Opsional. Membantu organizer menghubungi soal acara."
                error={errors.buyerPhone}
              >
                <Input
                  id="checkout-phone"
                  inputMode="tel"
                  autoComplete="tel"
                  value={buyer.phone}
                  onChange={(changeEvent) =>
                    setBuyer((current) => ({ ...current, phone: changeEvent.target.value }))
                  }
                  className="h-11 border-ink/25 bg-card"
                />
              </Field>
            </div>
            {!user ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Kamu checkout sebagai tamu. Simpan tautan pesanan yang muncul setelah ini untuk membuka
                tiket kembali.{' '}
                <Link to="/login" className="font-semibold underline underline-offset-4">
                  Masuk
                </Link>{' '}
                bila sudah punya akun.
              </p>
            ) : null}
          </section>

          <section aria-labelledby="coupon-heading">
            <h2 id="coupon-heading" className="border-b border-ink pb-2 text-lg font-bold">
              3. Kode promo
            </h2>
            <div className="mt-4 flex max-w-md gap-2">
              <label htmlFor="checkout-coupon" className="sr-only">
                Kode promo
              </label>
              <Input
                id="checkout-coupon"
                value={couponInput}
                onChange={(changeEvent) => setCouponInput(changeEvent.target.value.toUpperCase())}
                placeholder="Contoh: PRESALE10"
                className="h-10 border-ink/25 bg-card uppercase"
              />
              <Button type="button" variant="outline" onClick={applyCoupon} className="h-10 border-ink/25">
                Terapkan
              </Button>
              {couponCode ? (
                <Button type="button" variant="ghost" onClick={resetCoupon} className="h-10">
                  Hapus
                </Button>
              ) : null}
            </div>
            {quoteError ? (
              <p className="mt-2 max-w-md text-xs font-semibold text-brick" role="alert">
                {quoteError instanceof ApiError ? quoteError.message : 'Kode promo tidak dapat diperiksa.'}
              </p>
            ) : couponCode && quote?.couponCode ? (
              <p className="mt-2 text-xs font-semibold text-olive">
                Kode {quote.couponCode} diterapkan. Potongan tampil di ringkasan.
              </p>
            ) : null}
          </section>

          <section aria-labelledby="terms-heading">
            <h2 id="terms-heading" className="sr-only">
              Persetujuan
            </h2>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(changeEvent) => setAccepted(changeEvent.target.checked)}
                className="mt-1 h-4 w-4 accent-[#B8432C]"
              />
              <span>
                Saya sudah membaca detail acara dan menyetujui{' '}
                <Link to="/terms" className="font-semibold underline underline-offset-4">
                  syarat layanan
                </Link>
                . Saya memahami tiket hanya berlaku satu kali dan tidak dapat dipindahtangankan di luar
                ketentuan organizer.
              </span>
            </label>
            {errors.terms ? <p className="mt-1 text-xs font-semibold text-brick">{errors.terms}</p> : null}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="border border-ink/20 bg-card shadow-sm">
            <div className="border-b border-warm-border p-5">
              <h2 className="text-lg font-bold">Ringkasan biaya</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Dihitung dari data tiket di server. Tidak ada biaya tambahan setelah konfirmasi.
              </p>
            </div>
            <div className="space-y-2 p-5 text-sm">
              {selectedItems.length === 0 ? (
                <p className="text-muted-foreground">Belum ada tiket dipilih.</p>
              ) : (
                selectedItems.map((item) => {
                  const ticket = ticketTypes.find((entry) => entry.id === item.ticketTypeId);
                  if (!ticket) return null;
                  return (
                    <div key={item.ticketTypeId} className="flex justify-between gap-3">
                      <span>
                        {ticket.name} × {item.quantity}
                      </span>
                      <span className="tabular-nums">{formatIDR(ticket.price * item.quantity)}</span>
                    </div>
                  );
                })
              )}
              <div className="my-3 border-t border-dashed border-warm-border" />
              <div className="flex justify-between gap-3">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatIDR(quote?.subtotal ?? localSubtotal)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Diskon</span>
                <span className="tabular-nums text-olive">
                  {quote?.discount ? `− ${formatIDR(quote.discount)}` : formatIDR(0)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Biaya platform</span>
                <span className="tabular-nums">
                  {quoteLoading ? 'Menghitung...' : quote ? formatIDR(quote.platformFee) : '—'}
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between border-t border-ink pt-3">
                <span className="font-bold">Total</span>
                <span className="text-xl font-bold tabular-nums">
                  {quote ? formatIDR(quote.total) : formatIDR(localSubtotal)}
                </span>
              </div>
              {quote ? (
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Kuota dikunci selama {quote.reservationMinutes} menit setelah pesanan dibuat.
                </p>
              ) : quoteLoading ? (
                <p className="text-[11px] text-muted-foreground">Memeriksa kode promo dan biaya.</p>
              ) : null}
              {error ? <InlineError error={error} /> : null}
              <Button
                type="submit"
                disabled={submitting || totalQuantity === 0 || sellable.length === 0}
                className="mt-3 h-11 w-full bg-brick text-paper hover:bg-brick/90"
              >
                {submitting ? 'Membuat pesanan...' : 'Lanjut ke pembayaran'}
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                Dengan melanjutkan, tiket akan direservasi sementara. Pembayaran diverifikasi lewat
                webhook, bukan dari halaman sukses browser.
              </p>
            </div>
          </div>
          {event.salesEndAt ? (
            <p className={cn('mt-3 text-xs text-muted-foreground')}>
              Penjualan berakhir {formatEventWhen(event.salesEndAt, event.salesEndAt, event.timezone)}.
            </p>
          ) : null}
        </aside>
      </form>
    </main>
  );
}