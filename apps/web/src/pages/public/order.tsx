import { ArrowLeft, CheckCircle2, Clock, Copy, CreditCard, RefreshCw } from 'lucide-react';
import { lazy, Suspense, useCallback, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PurchaseSteps } from '@/components/layout/checkout-layout';
import { OrderStatusBadge, TicketStatusBadge } from '@/components/common/status-badge';
import { ErrorState, PageLoading } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, errorMessage } from '@/lib/api';
import { ApiError } from '@/lib/api';
import { formatDateTime, formatIDR } from '@/lib/format';
import { useCountdown, useDocumentTitle } from '@/lib/hooks';
import type { Order } from '@/lib/models';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const XenditCheckout = lazy(() =>
  import('./xendit-checkout').then((module) => ({ default: module.XenditCheckout })),
);

type OrderStatus = {
  order: Order;
  paymentProvider?: string;
  serverTime: string;
};

function Countdown({ target }: { target: string }) {
  const remaining = useCountdown(target);
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return (
    <span className="font-medium tabular-nums" aria-live="polite">
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
}

export function OrderPage() {
  const { orderCode } = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const initialToken =
    searchParams.get('token') ?? sessionStorage.getItem(`gofest-order-token:${orderCode}`);
  const [token, setToken] = useState(initialToken ?? '');
  const [tokenInput, setTokenInput] = useState('');
  const [paymentStarted, setPaymentStarted] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);
  const [busy, setBusy] = useState<'payment' | 'mock' | null>(null);
  useDocumentTitle(orderCode ? `Pesanan ${orderCode}` : 'Detail pesanan');

  const orderQuery = useQuery({
    queryKey: ['order-status', orderCode, token],
    queryFn: () =>
      api<OrderStatus>(`/orders/${encodeURIComponent(orderCode!)}/status`, {
        orderToken: token || undefined,
      }),
    enabled: Boolean(orderCode),
    refetchInterval: (query) => {
      const status = query.state.data?.order.status;
      return status === 'PENDING_PAYMENT' ? 15000 : false;
    },
    retry: false,
  });

  const order = orderQuery.data?.order;
  const usesXendit = (orderQuery.data?.paymentProvider ?? order?.payment?.provider) === 'xendit';
  const accessDenied = orderQuery.error instanceof ApiError && orderQuery.error.status === 401;

  const refreshPayment = useCallback(
    async (sync = true) => {
      if (sync && orderCode) {
        setCheckingStatus(true);
        setActionError(null);
        try {
          const result = await api<{ order: Order }>(
            `/orders/${encodeURIComponent(orderCode)}/payment/sync`,
            {
              method: 'POST',
              orderToken: token || undefined,
            },
          );
          queryClient.setQueryData<OrderStatus>(
            ['order-status', orderCode, token],
            (current) =>
              current && { ...current, order: result.order, serverTime: new Date().toISOString() },
          );
        } catch (error) {
          setActionError(error);
        } finally {
          setCheckingStatus(false);
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['order-status', orderCode] });
    },
    [orderCode, queryClient, token],
  );

  async function createPayment() {
    if (!order) return;
    setActionError(null);
    setBusy('payment');
    try {
      const result = await api<{ alreadyPaid: boolean }>(
        `/orders/${encodeURIComponent(order.orderCode)}/payment`,
        { method: 'POST', orderToken: token || undefined },
      );
      if (result.alreadyPaid) toast.success('Pembayaran sudah tercatat');
      await refreshPayment(false);
    } catch (error) {
      setActionError(error);
    } finally {
      setBusy(null);
    }
  }

  async function mockPay() {
    if (!order) return;
    setActionError(null);
    setBusy('mock');
    try {
      await api(`/orders/${encodeURIComponent(order.orderCode)}/mock-pay`, {
        method: 'POST',
        orderToken: token || undefined,
      });
      toast.success('Pembayaran mock berhasil. Tiket diterbitkan.');
      await queryClient.invalidateQueries({ queryKey: ['order-status', orderCode] });
    } catch (error) {
      setActionError(error);
    } finally {
      setBusy(null);
    }
  }

  if (orderQuery.isLoading) {
    return <PageLoading label="Memuat pesanan" />;
  }

  if (accessDenied) {
    return (
      <main className="container max-w-lg py-14">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-olive">Akses pesanan</p>
        <h1 className="mt-2 font-display text-4xl tracking-tightest">
          Tautan ini butuh token akses.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Detail pesanan memuat data pribadi, jadi kode pesanan saja tidak cukup. Buka tautan
          lengkap dari email konfirmasi, atau tempel token akses yang kamu terima saat checkout.
        </p>
        <form
          className="mt-6 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            const value = tokenInput.trim();
            if (!value) return;
            setToken(value);
            sessionStorage.setItem(`gofest-order-token:${orderCode}`, value);
          }}
        >
          <label htmlFor="order-token" className="block text-sm font-medium">
            Token akses
          </label>
          <Input
            id="order-token"
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            placeholder="Tempel token dari tautan pesanan"
            className="h-11 border-ink/25 bg-card"
          />
          <Button type="submit" className="h-10 bg-ink px-4 text-paper">
            Buka pesanan
          </Button>
        </form>
        <Link
          to="/login"
          className="mt-6 inline-block text-sm font-medium underline underline-offset-4"
        >
          Masuk dengan akun pembeli
        </Link>
      </main>
    );
  }

  if (orderQuery.isError || !order) {
    return (
      <main className="container max-w-3xl py-14">
        <Link
          to="/events"
          className="inline-flex items-center gap-2 text-sm font-medium text-olive"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke jelajah acara
        </Link>
        <ErrorState
          className="mt-6"
          error={orderQuery.error}
          onRetry={() => void orderQuery.refetch()}
          title="Pesanan tidak dapat dibuka"
        />
      </main>
    );
  }

  const ticketTokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
  const paid = ['PAID', 'PARTIALLY_REFUNDED', 'REFUND_PENDING'].includes(order.status);

  return (
    <>
      <PurchaseSteps
        active={
          (order.payment && order.payment.provider !== 'xendit') ||
          paid ||
          (usesXendit && paymentStarted)
            ? 4
            : 3
        }
      />
      <main className="container max-w-5xl py-8 sm:py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to={`/events/${order.event.slug}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Halaman acara
          </Link>
          <button
            type="button"
            onClick={() => void refreshPayment(order.payment?.provider === 'xendit')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-600"
            disabled={checkingStatus || orderQuery.isFetching}
          >
            <RefreshCw
              className={cn(
                'h-3.5 w-3.5',
                (checkingStatus || orderQuery.isFetching) && 'animate-spin',
              )}
              aria-hidden
            />
            {checkingStatus || orderQuery.isFetching ? 'Memeriksa...' : 'Cek status terbaru'}
          </button>
        </div>

        <header className="mt-5 border-b border-slate-200 pb-5">
          <p className="text-xs font-medium uppercase tracking-wider text-blue-600">
            Pesanan Tiket
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              {order.orderCode}
            </h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Dibuat {formatDateTime(order.createdAt)} · {order.event.title}
          </p>
        </header>

        {order.status === 'PENDING_PAYMENT' ? (
          <section
            className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-md sm:p-6"
            aria-labelledby="payment-heading"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-coral-600">
                  <Clock className="h-4 w-4" aria-hidden />
                  Selesaikan Pembayaran Sebelum Waktu Habis
                </div>
                <h2 id="payment-heading" className="mt-1 text-2xl font-semibold text-slate-900">
                  Sisa Waktu: <Countdown target={order.expiresAt} />
                </h2>
                <p className="mt-1 max-w-prose text-xs text-slate-500">
                  Tiket direservasi khusus untukmu sampai batas waktu di atas.
                </p>
              </div>
              <p className="text-3xl font-semibold text-blue-600 tabular-nums">
                {formatIDR(order.total)}
              </p>
            </div>

            {usesXendit ? (
              <Suspense
                fallback={
                  <p className="mt-5 text-sm text-slate-600" role="status">
                    Memuat metode pembayaran…
                  </p>
                }
              >
                <XenditCheckout
                  key={order.orderCode}
                  orderCode={order.orderCode}
                  orderToken={token || undefined}
                  onStatusChange={refreshPayment}
                  onPaymentStarted={setPaymentStarted}
                />
              </Suspense>
            ) : (
              <div className="mt-6 flex flex-wrap gap-3">
                <Button type="button" onClick={() => void createPayment()} disabled={busy !== null}>
                  <CreditCard className="h-4 w-4" aria-hidden />
                  {busy === 'payment'
                    ? 'Menyiapkan…'
                    : order.payment
                      ? 'Buka pembayaran'
                      : 'Lanjut ke Pembayaran'}
                </Button>
                {order.payment?.provider === 'mock' ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void mockPay()}
                    disabled={busy !== null}
                  >
                    {busy === 'mock' ? 'Memproses…' : 'Simulasikan Pembayaran Berhasil'}
                  </Button>
                ) : null}
              </div>
            )}
            {actionError ? (
              <p className="mt-3 text-sm font-medium text-rose-600" role="alert">
                {errorMessage(actionError)}
              </p>
            ) : null}
          </section>
        ) : null}

        {order.status === 'PAID' ? (
          <section
            className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950"
            aria-live="polite"
          >
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" aria-hidden />
            <div>
              <h2 className="text-xl font-semibold text-emerald-900">
                Pembayaran Berhasil & Terkonfirmasi!
              </h2>
              <p className="mt-1 text-sm text-emerald-800">
                Tiket resmi sudah diterbitkan. Kamu bisa langsung membuka dan mengunduh e-tiket di
                bawah ini untuk dibawa saat check-in di venue.
              </p>
            </div>
          </section>
        ) : null}

        {order.status === 'PAYMENT_REVIEW' ? (
          <section className="mt-6 border border-amber-700/30 bg-amber-50 p-5">
            <h2 className="text-lg font-semibold text-amber-900">Pembayaran sedang ditinjau</h2>
            <p className="mt-1 text-sm leading-relaxed text-amber-900/80">
              Pembayaran diterima setelah batas reservasi. Admin akan memeriksa ketersediaan kuota
              sebelum menerbitkan tiket atau memproses refund. Kamu tidak perlu membayar ulang.
            </p>
          </section>
        ) : null}

        {['EXPIRED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'REFUND_PENDING'].includes(
          order.status,
        ) ? (
          <section className="mt-6 border border-warm-border bg-warm-muted/60 p-5">
            <h2 className="text-lg font-semibold">
              {order.status === 'EXPIRED'
                ? 'Pesanan kedaluwarsa'
                : order.status === 'REFUND_PENDING'
                  ? 'Refund sedang diproses'
                  : order.status === 'REFUNDED' || order.status === 'PARTIALLY_REFUNDED'
                    ? 'Dana sudah dikembalikan'
                    : 'Pesanan dibatalkan'}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {order.status === 'EXPIRED'
                ? 'Batas waktu pembayaran sudah lewat. Kuota dilepas dan kamu perlu membuat pesanan baru bila tiket masih tersedia.'
                : order.status === 'REFUND_PENDING'
                  ? 'Tim operasi memproses refund sesuai kebijakan organizer dan metode pembayaran.'
                  : 'Tiket pada pesanan ini tidak berlaku lagi. Hubungi organizer bila kamu memerlukan penjelasan lebih lanjut.'}
            </p>
            <Link
              to={`/events/${order.event.slug}`}
              className="mt-4 inline-flex text-sm font-medium underline underline-offset-4"
            >
              Lihat halaman acara
            </Link>
          </section>
        ) : null}

        {paid && order.tickets.length > 0 ? (
          <section className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <h2 className="border-b border-slate-100 pb-3 text-base font-semibold text-slate-900">
              E-Tiket Resmi Kamu
            </h2>
            <div className="mt-2 divide-y divide-slate-100">
              {order.tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-2 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{ticket.holderName}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {ticket.ticketTypeName ?? 'Tiket'} ·{' '}
                      <span className="font-mono font-medium text-blue-600 tabular-nums">
                        {ticket.ticketCode}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <TicketStatusBadge status={ticket.status} />
                    <Link
                      to={`/ticket/${ticket.ticketCode}${ticketTokenQuery}`}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-medium text-white shadow-xs transition-colors hover:bg-blue-700"
                    >
                      Buka E-Tiket
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <h2 className="border-b border-slate-100 pb-3 text-base font-semibold text-slate-900">
              Rincian Tagihan
            </h2>
            <div className="mt-3 space-y-2 text-xs text-slate-700">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-4">
                  <span>
                    {item.ticketNameSnapshot ?? item.ticketTypeName} × {item.quantity}
                  </span>
                  <span className="font-medium tabular-nums">{formatIDR(item.lineTotal)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-dashed border-slate-200 pt-3 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-medium tabular-nums">{formatIDR(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Diskon</span>
                <span className="font-medium tabular-nums">
                  {order.discount ? `− ${formatIDR(order.discount)}` : formatIDR(0)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Biaya Layanan</span>
                <span className="font-medium tabular-nums">{formatIDR(order.platformFee)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-semibold text-slate-900">
                <span>Total Akhir</span>
                <span className="text-base text-blue-600 tabular-nums">
                  {formatIDR(order.total)}
                </span>
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs text-xs">
            <h2 className="border-b border-slate-100 pb-3 text-base font-semibold text-slate-900">
              Data Pemesan
            </h2>
            <dl className="mt-3 space-y-3">
              <div>
                <dt className="text-slate-400 font-medium">Nama Pembeli</dt>
                <dd className="font-medium text-slate-900">{order.buyerName}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-medium">Email Konfirmasi</dt>
                <dd className="break-all font-medium text-slate-800">{order.buyerEmail}</dd>
              </div>
              {order.buyerPhone ? (
                <div>
                  <dt className="text-slate-400 font-medium">Nomor WhatsApp</dt>
                  <dd className="font-medium text-slate-800">{order.buyerPhone}</dd>
                </div>
              ) : null}
            </dl>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  toast.success('Tautan pesanan disalin');
                } catch {
                  toast.error('Tautan tidak dapat disalin');
                }
              }}
              className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
              Salin Tautan Akses Pesanan
            </button>
          </aside>
        </section>
      </main>
    </>
  );
}
