import { ArrowLeft, Check, Minus, Plus, Ticket } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ErrorState, Field, InlineError, LoadingState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, fieldErrors, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateLong, formatIDR, formatTime } from '@/lib/format';
import { useDebouncedValue, useDocumentTitle } from '@/lib/hooks';
import type { Order } from '@/lib/models';
import { usePublicEvent } from '@/lib/queries';

interface QuoteResult {
  subtotal: number;
  discount: number;
  platformFee: number;
  total: number;
  currency: string;
  couponCode: string | null;
  reservationMinutes: number;
  expiresAt: string;
  lines: Array<{
    ticketTypeId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}

export function CheckoutPage() {
  const { eventSlug } = useParams();
  const [searchParams] = useSearchParams();
  const preferredTicketId = searchParams.get('ticket');
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
    const first = onSale.find((ticket) => ticket.id === preferredTicketId) ?? onSale[0];
    if (first) {
      setQuantities({ [first.id]: first.minPerOrder });
    }
    setInitialized(true);
  }, [event, initialized, preferredTicketId]);

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
    setQuantities((current) => ({
      ...current,
      [id]: bounded < min && bounded !== 0 ? min : bounded,
    }));
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email.trim()))
      next.buyerEmail = 'Format email tidak valid';
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
        <Link
          to="/events"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
        >
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
    <main className="container max-w-6xl py-8 sm:py-10">
      <Link
        to={`/events/${event.slug}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Kembali ke detail acara
      </Link>

      <ol
        className="mt-6 flex flex-wrap items-center gap-3 border-b border-slate-200 pb-5 sm:gap-7"
        aria-label="Tahapan pembelian"
      >
        <li className="checkout-step">
          <span>
            <Check className="size-4" aria-hidden />
          </span>
          Pilih acara
        </li>
        <li className="checkout-step checkout-step-active" aria-current="step">
          <span>2</span>Tiket & data pembeli
        </li>
        <li className="checkout-step">
          <span>3</span>Pembayaran
        </li>
        <li className="checkout-step">
          <span>
            <Ticket className="size-4" aria-hidden />
          </span>
          E-tiket
        </li>
      </ol>
      <div className="mt-6 border-b border-slate-200 pb-5">
        <p className="text-xs font-medium text-blue-700">Selesaikan pesananmu</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {event.title}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {formatDateLong(event.startsAt, event.timezone)} ·{' '}
          {formatTime(event.startsAt, event.timezone)} ·{' '}
          {event.type === 'ONLINE'
            ? 'Online'
            : `${event.venueName ?? 'Venue'}${event.city ? `, ${event.city}` : ''}`}
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-12"
        noValidate
      >
        <div className="space-y-8">
          {event.isDemo ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
              Ini acara demo. Pembayaran berupa simulasi dan tidak memerlukan transfer uang.
            </p>
          ) : null}
          <section
            aria-labelledby="tickets-heading"
            className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs"
          >
            <div className="flex items-end justify-between gap-3 border-b border-slate-100 pb-3">
              <h2 id="tickets-heading" className="text-base font-semibold text-slate-900">
                1. Pilih Jumlah Tiket
              </h2>
              <p className="text-xs text-slate-400">Maksimal 10 tiket per pesanan</p>
            </div>
            {errors.items ? (
              <p className="mt-2 text-xs font-medium text-rose-600">{errors.items}</p>
            ) : null}
            <div className="mt-2 divide-y divide-slate-100">
              {sellable.length === 0 ? (
                <p className="py-5 text-sm text-slate-500">
                  Tidak ada tiket yang sedang dijual untuk acara ini. Kembali ke halaman acara untuk
                  melihat status penjualan.
                </p>
              ) : (
                sellable.map((ticket) => {
                  const quantity = quantities[ticket.id] ?? 0;
                  const max = Math.min(ticket.maxPerOrder, ticket.available ?? 0);
                  return (
                    <div key={ticket.id} className="py-4 first:pt-2 last:pb-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">{ticket.name}</p>
                          {ticket.description ? (
                            <p className="mt-0.5 max-w-md text-xs leading-relaxed text-slate-500">
                              {ticket.description}
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs text-slate-400">
                            {ticket.available ?? 0} tersisa · min. {ticket.minPerOrder}, maks.{' '}
                            {ticket.maxPerOrder} per order
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-semibold text-slate-900 tabular-nums">
                            {ticket.price === 0 ? 'Gratis' : formatIDR(ticket.price)}
                          </p>
                          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50">
                            <button
                              type="button"
                              onClick={() =>
                                setQuantity(ticket.id, quantity - 1, max, ticket.minPerOrder)
                              }
                              disabled={quantity <= 0}
                              className="flex h-9 w-9 items-center justify-center text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-30 rounded-l-xl"
                              aria-label={`Kurangi tiket ${ticket.name}`}
                            >
                              <Minus className="h-4 w-4" aria-hidden />
                            </button>
                            <span
                              className="w-8 text-center text-sm font-medium text-slate-900 tabular-nums"
                              aria-live="polite"
                            >
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setQuantity(ticket.id, quantity + 1, max, ticket.minPerOrder)
                              }
                              disabled={quantity >= max}
                              className="flex h-9 w-9 items-center justify-center text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-30 rounded-r-xl"
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

          <section
            aria-labelledby="buyer-heading"
            className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs"
          >
            <h2
              id="buyer-heading"
              className="border-b border-slate-100 pb-3 text-base font-semibold text-slate-900"
            >
              2. Data Informasi Pembeli
            </h2>
            <p className="mt-2 text-xs text-slate-500">
              Tiket dan konfirmasi pesanan dikirim ke email ini. Nama pada tiket mengikuti data
              pembeli.
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
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
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
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
                />
              </Field>
              <Field
                label="Nomor WhatsApp / HP"
                htmlFor="checkout-phone"
                hint="Opsional. Nomor yang dapat dihubungi terkait pesanan."
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
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
                />
              </Field>
            </div>
            {!user ? (
              <p className="mt-4 text-xs text-slate-500">
                Kamu memesan sebagai tamu.{' '}
                <Link to="/login" className="font-medium text-blue-600 underline underline-offset-4">
                  Masuk ke akun
                </Link>{' '}
                untuk menyimpan tiket langsung di akunmu.
              </p>
            ) : null}
          </section>

          <section
            aria-labelledby="coupon-heading"
            className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs"
          >
            <h2
              id="coupon-heading"
              className="border-b border-slate-100 pb-3 text-base font-semibold text-slate-900"
            >
              3. Kode Promo & Voucher Diskon
            </h2>
            <div className="mt-4 flex max-w-md gap-2">
              <label htmlFor="checkout-coupon" className="sr-only">
                Kode promo
              </label>
              <Input
                id="checkout-coupon"
                value={couponInput}
                onChange={(changeEvent) => setCouponInput(changeEvent.target.value.toUpperCase())}
                placeholder="Contoh: GOFEST10"
                className="h-11 rounded-xl border-slate-200 bg-slate-50 uppercase focus:bg-white"
              />
              <Button
                type="button"
                variant="outline"
                onClick={applyCoupon}
                className="h-11 rounded-xl border-slate-200 font-medium text-slate-700 hover:bg-slate-100"
              >
                Terapkan
              </Button>
              {couponCode ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetCoupon}
                  className="h-11 rounded-xl text-rose-600 hover:bg-rose-50 font-medium"
                >
                  Hapus
                </Button>
              ) : null}
            </div>
            {quoteError ? (
              <p className="mt-2 max-w-md text-xs font-medium text-rose-600" role="alert">
                {quoteError instanceof ApiError
                  ? quoteError.message
                  : 'Kode promo tidak valid atau kuota habis.'}
              </p>
            ) : couponCode && quote?.couponCode ? (
              <p className="mt-2 text-xs font-medium text-emerald-600">
                ✓ Kode promo {quote.couponCode} berhasil diterapkan!
              </p>
            ) : null}
          </section>

          <section
            aria-labelledby="terms-heading"
            className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs"
          >
            <h2 id="terms-heading" className="sr-only">
              Persetujuan
            </h2>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(changeEvent) => setAccepted(changeEvent.target.checked)}
                className="mt-1 h-4 w-4 rounded accent-blue-600"
              />
              <span>
                Saya telah membaca dan menyetujui{' '}
                <Link to="/terms" className="font-medium text-blue-600 underline underline-offset-4">
                  Syarat & Ketentuan Layanan
                </Link>
                . Tiket berlaku sah sesuai aturan organizer.
              </span>
            </label>
            {errors.terms ? (
              <p className="mt-2 text-xs font-medium text-rose-600">{errors.terms}</p>
            ) : null}
          </section>
        </div>

        <aside className="lg:sticky lg:top-36 lg:h-fit">
          <div className="booking-panel">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-semibold text-slate-900">Ringkasan Pembayaran</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Cek tiket dan total sebelum melanjutkan.
              </p>
            </div>
            <div className="space-y-3 pt-4 text-sm">
              {selectedItems.length === 0 ? (
                <p className="text-xs text-slate-400">Belum ada tiket dipilih.</p>
              ) : (
                selectedItems.map((item) => {
                  const ticket = ticketTypes.find((entry) => entry.id === item.ticketTypeId);
                  if (!ticket) return null;
                  return (
                    <div
                      key={item.ticketTypeId}
                      className="flex justify-between gap-3 text-xs text-slate-700"
                    >
                      <span>
                        {ticket.name} × {item.quantity}
                      </span>
                      <span className="font-medium tabular-nums">
                        {formatIDR(ticket.price * item.quantity)}
                      </span>
                    </div>
                  );
                })
              )}
              <div className="my-2 border-t border-dashed border-slate-200" />
              <div className="flex justify-between gap-3 text-xs text-slate-600">
                <span>Subtotal</span>
                <span className="font-medium tabular-nums">
                  {formatIDR(quote?.subtotal ?? localSubtotal)}
                </span>
              </div>
              <div className="flex justify-between gap-3 text-xs text-emerald-600">
                <span>Potongan Promo</span>
                <span className="font-medium tabular-nums">
                  {quote?.discount ? `− ${formatIDR(quote.discount)}` : formatIDR(0)}
                </span>
              </div>
              <div className="flex justify-between gap-3 text-xs text-slate-600">
                <span>Biaya Layanan Platform</span>
                <span className="font-medium tabular-nums">
                  {quoteLoading ? 'Menghitung...' : quote ? formatIDR(quote.platformFee) : '—'}
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between border-t border-slate-200 pt-3">
                <span className="font-medium text-slate-900">Total Pembayaran</span>
                <span className="text-xl font-semibold text-blue-600 tabular-nums">
                  {quote ? formatIDR(quote.total) : formatIDR(localSubtotal)}
                </span>
              </div>
              {quote ? (
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Kuota tiket dikunci aman selama {quote.reservationMinutes} menit.
                </p>
              ) : quoteLoading ? (
                <p className="text-[11px] text-slate-400">Memeriksa kupon & kalkulasi biaya...</p>
              ) : null}
              {error ? <InlineError error={error} /> : null}
              <Button
                type="submit"
                disabled={submitting || totalQuantity === 0 || sellable.length === 0}
                className="mt-4 h-12 w-full rounded-xl bg-blue-600 text-sm font-medium text-white shadow-md transition-all hover:bg-blue-700 active:scale-95"
              >
                {submitting ? 'Memproses Pesanan...' : 'Lanjut ke Pembayaran'}
              </Button>
            </div>
          </div>
        </aside>
      </form>
    </main>
  );
}
