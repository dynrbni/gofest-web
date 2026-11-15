import { ArrowLeft, ArrowRight, Minus, Plus, Ticket } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EventPoster } from '@/components/common/event-presentation';
import { PurchaseSteps } from '@/components/layout/checkout-layout';
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
  const [step, setStep] = useState<1 | 2>(1);
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
    const onSale = event.ticketTypes.filter(
      (ticket) => ticket.isOnSale && (ticket.available ?? 0) >= ticket.minPerOrder,
    );
    const first = onSale.find((ticket) => ticket.id === preferredTicketId);
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
      setQuoteLoading(false);
      return;
    }
    let cancelled = false;
    setQuote(null);
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
    setQuote(null);
    setQuantities((current) => ({
      ...current,
      [id]: bounded < min && bounded !== 0 ? (value < (quantities[id] ?? 0) ? 0 : min) : bounded,
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
    if (
      !event ||
      step !== 2 ||
      !quote ||
      quoteLoading ||
      debouncedEmail !== buyer.email ||
      debouncedCoupon !== couponCode
    )
      return;
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

  const canPurchase = event.status !== 'CANCELLED' && new Date(event.endsAt).getTime() > Date.now();
  const sellable = ticketTypes.filter(
    (ticket) => ticket.isOnSale && (ticket.available ?? 0) >= ticket.minPerOrder && canPurchase,
  );
  const priceFrom = sellable.length
    ? Math.min(...sellable.map((ticket) => ticket.price))
    : event.priceFrom;
  const quoteReady =
    Boolean(quote) &&
    !quoteLoading &&
    !quoteError &&
    totalQuantity > 0 &&
    canPurchase &&
    debouncedEmail === buyer.email &&
    debouncedCoupon === couponCode;
  function changeStep(next: 1 | 2) {
    setStep(next);
    setErrors({});
    requestAnimationFrame(() => {
      document.getElementById('checkout-heading')?.focus();
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
  }

  return (
    <>
      <PurchaseSteps active={step} />
      <main className="container py-7 sm:py-10">
        {step === 1 ? (
          <Link to={`/events/${event.slug}`} className="text-link text-sm">
            <ArrowLeft className="size-4" aria-hidden />
            Detail acara
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => changeStep(1)}
            className="text-link min-h-11 text-sm"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Ubah pilihan tiket
          </button>
        )}
        <h1
          id="checkout-heading"
          tabIndex={-1}
          className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          {step === 1 ? 'Pilih kategori tiket' : 'Detail pesanan'}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {event.title} · {formatDateLong(event.startsAt, event.timezone)} ·{' '}
          {formatTime(event.startsAt, event.timezone)}
        </p>
        <form
          onSubmit={onSubmit}
          className="mt-7 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(300px,32%)] lg:gap-8"
          noValidate
        >
          <div className="min-w-0 space-y-6">
            {step === 1 ? (
              <>
                <EventPoster
                  title={event.title}
                  coverKey={event.coverKey}
                  category={event.category.name}
                  startsAt={event.startsAt}
                  city={event.city}
                  timezone={event.timezone}
                  className="rounded-2xl"
                  imageClassName="object-contain"
                  sizes="(min-width: 1024px) 800px, 95vw"
                />
                <section aria-labelledby="tickets-heading">
                  <h2
                    id="tickets-heading"
                    className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                  >
                    <Ticket className="size-4" aria-hidden />
                    Kategori Tiket
                  </h2>
                  <div className="space-y-4">
                    {ticketTypes.length === 0 ? (
                      <p className="rounded-xl bg-blue-50 p-5 text-sm text-slate-600">
                        Kategori tiket belum tersedia.
                      </p>
                    ) : (
                      ticketTypes.map((ticket) => {
                        const quantity = quantities[ticket.id] ?? 0;
                        const max = Math.min(ticket.maxPerOrder, ticket.available ?? 0);
                        const available = sellable.some((entry) => entry.id === ticket.id);
                        return (
                          <section
                            key={ticket.id}
                            className="checkout-ticket"
                            aria-label={ticket.name}
                          >
                            <p className="mb-3 text-xs font-medium text-blue-800">
                              {available
                                ? 'Sedang dijual'
                                : !canPurchase
                                  ? 'Penjualan ditutup'
                                  : (ticket.available ?? 0) < ticket.minPerOrder
                                    ? 'Tiket habis'
                                    : 'Tidak sedang dijual'}
                            </p>
                            <div className="checkout-ticket-body">
                              <h3 className="font-medium">{ticket.name}</h3>
                              {ticket.description ? (
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                  {ticket.description}
                                </p>
                              ) : null}
                              <p className="mt-3 text-xs leading-5 text-slate-500">
                                Min. {ticket.minPerOrder}, maks. {ticket.maxPerOrder} per pesanan
                                {available ? ` · Tersedia ${ticket.available} tiket` : ''}
                              </p>
                              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-dashed border-slate-200 pt-4">
                                <p className="text-lg font-semibold tabular-nums">
                                  {ticket.price === 0 ? 'Gratis' : formatIDR(ticket.price)}
                                </p>
                                {quantity > 0 && available ? (
                                  <div className="flex items-center rounded-xl border border-slate-200">
                                    <button
                                      type="button"
                                      className="flex size-11 items-center justify-center rounded-l-xl text-blue-700 hover:bg-blue-50"
                                      onClick={() =>
                                        setQuantity(
                                          ticket.id,
                                          quantity - 1,
                                          max,
                                          ticket.minPerOrder,
                                        )
                                      }
                                      aria-label={`Kurangi tiket ${ticket.name}`}
                                    >
                                      <Minus className="size-4" aria-hidden />
                                    </button>
                                    <output
                                      className="w-8 text-center text-sm font-medium tabular-nums"
                                      aria-label={`Jumlah tiket ${ticket.name}`}
                                      aria-live="polite"
                                    >
                                      {quantity}
                                    </output>
                                    <button
                                      type="button"
                                      className="flex size-11 items-center justify-center rounded-r-xl text-blue-700 hover:bg-blue-50 disabled:text-slate-400"
                                      disabled={quantity >= max}
                                      onClick={() =>
                                        setQuantity(
                                          ticket.id,
                                          quantity + 1,
                                          max,
                                          ticket.minPerOrder,
                                        )
                                      }
                                      aria-label={`Tambah tiket ${ticket.name}`}
                                    >
                                      <Plus className="size-4" aria-hidden />
                                    </button>
                                  </div>
                                ) : (
                                  <Button
                                    type="button"
                                    disabled={!available}
                                    onClick={() =>
                                      setQuantity(
                                        ticket.id,
                                        ticket.minPerOrder,
                                        max,
                                        ticket.minPerOrder,
                                      )
                                    }
                                    aria-label={`Pilih tiket ${ticket.name}`}
                                    className="min-w-24 rounded-xl"
                                  >
                                    {available ? 'Pilih' : 'Tidak tersedia'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </section>
                        );
                      })
                    )}
                  </div>
                </section>
              </>
            ) : (
              <>
                <section
                  aria-labelledby="buyer-heading"
                  className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
                >
                  <h2
                    id="buyer-heading"
                    className="border-b border-slate-100 pb-3 text-base font-semibold text-slate-900"
                  >
                    Data pemesan
                  </h2>
                  <p className="mt-2 text-xs text-slate-500">
                    Tiket dan konfirmasi pesanan dikirim ke email ini. Nama pada tiket mengikuti
                    data pembeli.
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Nama lengkap"
                      htmlFor="checkout-name"
                      error={errors.buyerName}
                      required
                    >
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
                    <Field
                      label="Email"
                      htmlFor="checkout-email"
                      error={errors.buyerEmail}
                      required
                    >
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
                      <Link
                        to={`/login?next=${encodeURIComponent(`/checkout/${event.slug}`)}`}
                        className="font-medium text-blue-600 underline underline-offset-4"
                      >
                        Masuk ke akun
                      </Link>{' '}
                      untuk menyimpan tiket langsung di akunmu.
                    </p>
                  ) : null}
                </section>

                <section
                  aria-labelledby="coupon-heading"
                  className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
                >
                  <h2
                    id="coupon-heading"
                    className="border-b border-slate-100 pb-3 text-base font-semibold text-slate-900"
                  >
                    Kode promo
                  </h2>
                  <div className="mt-4 flex max-w-md flex-wrap gap-2">
                    <label htmlFor="checkout-coupon" className="sr-only">
                      Kode promo
                    </label>
                    <Input
                      id="checkout-coupon"
                      value={couponInput}
                      onChange={(changeEvent) =>
                        setCouponInput(changeEvent.target.value.toUpperCase())
                      }
                      placeholder="Contoh: GOFEST10"
                      className="h-11 min-w-0 flex-1 basis-36 rounded-xl border-slate-200 bg-slate-50 uppercase focus:bg-white"
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
                  className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
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
                      <Link
                        to="/terms"
                        className="font-medium text-blue-600 underline underline-offset-4"
                      >
                        Syarat & Ketentuan Layanan
                      </Link>
                      . Tiket berlaku sah sesuai aturan organizer.
                    </span>
                  </label>
                  {errors.terms ? (
                    <p className="mt-2 text-xs font-medium text-rose-600">{errors.terms}</p>
                  ) : null}
                </section>
              </>
            )}
          </div>
          <aside
            className="min-w-0 rounded-2xl bg-blue-50 p-4 lg:sticky lg:top-6 sm:p-5"
            aria-labelledby="checkout-summary-heading"
          >
            <div className="rounded-xl bg-white p-4 sm:p-5">
              <h2 id="checkout-summary-heading" className="text-lg font-semibold">
                Ringkasan pesanan
              </h2>
              <div className="space-y-3 pt-4 text-sm">
                {totalQuantity === 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-slate-600">Harga mulai dari</p>
                    <p className="text-xl font-semibold tabular-nums">
                      {priceFrom === 0
                        ? 'Gratis'
                        : priceFrom !== null
                          ? formatIDR(priceFrom)
                          : 'Belum tersedia'}
                    </p>
                  </div>
                ) : (
                  <>
                    {selectedItems.map((item) => {
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
                    })}
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
                        {quoteLoading
                          ? 'Menghitung...'
                          : quote
                            ? formatIDR(quote.platformFee)
                            : '—'}
                      </span>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between border-t border-slate-200 pt-3">
                      <span className="font-medium text-slate-900">Total Pembayaran</span>
                      <span className="text-xl font-semibold text-blue-600 tabular-nums">
                        {quote ? formatIDR(quote.total) : formatIDR(localSubtotal)}
                      </span>
                    </div>
                    {quote ? (
                      <p className="text-[11px] leading-relaxed text-slate-500">
                        Setelah pesanan dibuat, tiket direservasi selama {quote.reservationMinutes}{' '}
                        menit.
                      </p>
                    ) : quoteLoading ? (
                      <p className="text-[11px] text-slate-500">
                        Memeriksa kupon & kalkulasi biaya...
                      </p>
                    ) : null}
                  </>
                )}

                {quoteError ? <InlineError error={quoteError} /> : null}
                {error ? <InlineError error={error} /> : null}
                {step === 1 ? (
                  <Button
                    type="button"
                    onClick={(clickEvent) => {
                      clickEvent.preventDefault();
                      changeStep(2);
                    }}
                    disabled={!quoteReady}
                    className="mt-3 min-h-12 w-full rounded-xl"
                  >
                    Lanjutkan
                    <ArrowRight className="size-4" aria-hidden />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={submitting || !quoteReady}
                    className="mt-3 min-h-12 w-full rounded-xl"
                  >
                    {submitting ? 'Memproses pesanan...' : 'Lanjut ke Pembayaran'}
                    <ArrowRight className="size-4" aria-hidden />
                  </Button>
                )}
                {totalQuantity === 0 ? (
                  <p className="text-xs leading-5 text-slate-500">
                    {sellable.length
                      ? 'Pilih kategori dan jumlah tiket untuk melanjutkan.'
                      : 'Tidak ada tiket yang dapat dipesan saat ini.'}
                  </p>
                ) : null}
              </div>
            </div>
            {event.isDemo ? (
              <p className="mt-4 text-xs leading-5 text-blue-900">
                Acara demo. Pembayaran berupa simulasi, tanpa transfer uang.
              </p>
            ) : null}
          </aside>
        </form>
      </main>
    </>
  );
}
