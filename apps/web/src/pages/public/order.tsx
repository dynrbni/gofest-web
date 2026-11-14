import { ArrowLeft, CheckCircle2, Clock, Copy, CreditCard, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { OrderStatusBadge, TicketStatusBadge } from '@/components/common/status-badge';
import { ErrorState, LoadingState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, errorMessage } from '@/lib/api';
import { ApiError } from '@/lib/api';
import { formatDateTime, formatIDR } from '@/lib/format';
import { useCountdown, useDocumentTitle } from '@/lib/hooks';
import type { Order } from '@/lib/models';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';

function Countdown({ target }: { target: string }) {
  const remaining = useCountdown(target);
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return (
    <span className="font-bold tabular-nums" aria-live="polite">
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
}

export function OrderPage() {
  const { orderCode } = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const initialToken = searchParams.get('token') ?? sessionStorage.getItem(`gofest-order-token:${orderCode}`);
  const [token, setToken] = useState(initialToken ?? '');
  const [tokenInput, setTokenInput] = useState('');
  const [actionError, setActionError] = useState<unknown>(null);
  const [busy, setBusy] = useState<'payment' | 'mock' | null>(null);
  useDocumentTitle(orderCode ? `Pesanan ${orderCode}` : 'Detail pesanan');

  const orderQuery = useQuery({
    queryKey: ['order-status', orderCode, token],
    queryFn: () =>
      api<{ order: Order; serverTime: string }>(
        `/orders/${encodeURIComponent(orderCode!)}/status`,
        { orderToken: token || undefined },
      ),
    enabled: Boolean(orderCode),
    refetchInterval: (query) => {
      const status = query.state.data?.order.status;
      return status === 'PENDING_PAYMENT' ? 15000 : false;
    },
    retry: false,
  });

  const order = orderQuery.data?.order;
  const accessDenied = orderQuery.error instanceof ApiError && orderQuery.error.status === 401;

  async function createPayment() {
    if (!order) return;
    setActionError(null);
    setBusy('payment');
    try {
      const result = await api<{
        alreadyPaid: boolean;
        payment: { providerReference: string } | null;
        redirectUrl: string | null;
      }>(`/orders/${encodeURIComponent(order.orderCode)}/payment`, {
        method: 'POST',
        orderToken: token || undefined,
      });
      if (result.alreadyPaid) {
        toast.success('Pembayaran sudah tercatat');
        await queryClient.invalidateQueries({ queryKey: ['order-status', orderCode] });
      } else {
        toast.success('Instruksi pembayaran disiapkan');
        await queryClient.invalidateQueries({ queryKey: ['order-status', orderCode] });
        if (result.redirectUrl && !result.redirectUrl.includes('mock=1')) {
          window.location.href = result.redirectUrl;
        }
      }
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
    return (
      <main className="container max-w-4xl py-10">
        <LoadingState rows={4} label="Memuat pesanan" />
      </main>
    );
  }

  if (accessDenied) {
    return (
      <main className="container max-w-lg py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-olive">Akses pesanan</p>
        <h1 className="mt-2 font-display text-4xl tracking-tightest">Tautan ini butuh token akses.</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Detail pesanan memuat data pribadi, jadi kode pesanan saja tidak cukup. Buka tautan lengkap dari
          email konfirmasi, atau tempel token akses yang kamu terima saat checkout.
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
          <label htmlFor="order-token" className="block text-sm font-semibold">
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
        <Link to="/login" className="mt-6 inline-block text-sm font-semibold underline underline-offset-4">
          Masuk dengan akun pembeli
        </Link>
      </main>
    );
  }

  if (orderQuery.isError || !order) {
    return (
      <main className="container max-w-3xl py-14">
        <Link to="/events" className="inline-flex items-center gap-2 text-sm font-semibold text-olive">
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
    <main className="container max-w-5xl py-8 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to={`/events/${order.event.slug}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-olive hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Halaman acara
        </Link>
        <button
          type="button"
          onClick={() => void orderQuery.refetch()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-olive hover:text-ink"
          disabled={orderQuery.isFetching}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', orderQuery.isFetching && 'animate-spin')} aria-hidden />
          {orderQuery.isFetching ? 'Memeriksa...' : 'Cek status terbaru'}
        </button>
      </div>

      <header className="mt-5 border-b border-ink pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-olive">Pesanan</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-4xl leading-none tracking-tightest sm:text-5xl">
            {order.orderCode}
          </h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Dibuat {formatDateTime(order.createdAt)} · {order.event.title}
        </p>
      </header>

      {order.status === 'PENDING_PAYMENT' ? (
        <section className="mt-6 border border-ink/20 bg-card p-5 sm:p-6" aria-labelledby="payment-heading">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-brick">
                <Clock className="h-4 w-4" aria-hidden />
                Selesaikan pembayaran
              </div>
              <h2 id="payment-heading" className="mt-1 text-xl font-bold">
                Sisa waktu <Countdown target={order.expiresAt} />
              </h2>
              <p className="mt-1 max-w-prose text-sm text-muted-foreground">
                Kuota tiket direservasi sampai batas waktu ini. Setelah lewat, order kedaluwarsa dan kuota
                dilepas otomatis.
              </p>
            </div>
            <p className="text-2xl font-bold tabular-nums">{formatIDR(order.total)}</p>
          </div>

          {order.payment ? (
            <dl className="mt-5 grid gap-2 border-t border-warm-border pt-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Referensi pembayaran</dt>
                <dd className="font-semibold tabular-nums">{order.payment.providerReference}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Metode</dt>
                <dd className="font-semibold">{order.payment.method ?? order.payment.provider}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 border-l-2 border-warm-border pl-3 text-sm text-muted-foreground">
              Instruksi pembayaran belum dibuat. Klik tombol di bawah untuk membuat sesi pembayaran.
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => void createPayment()}
              disabled={busy !== null}
              className="h-10 bg-brick text-paper hover:bg-brick/90"
            >
              <CreditCard className="h-4 w-4" aria-hidden />
              {busy === 'payment' ? 'Menyiapkan...' : order.payment ? 'Buat ulang instruksi' : 'Buat instruksi pembayaran'}
            </Button>
            {order.payment?.provider === 'mock' ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => void mockPay()}
                disabled={busy !== null}
                className="h-10 border-ink/30 bg-transparent"
              >
                {busy === 'mock' ? 'Memproses...' : 'Simulasikan pembayaran berhasil'}
              </Button>
            ) : null}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Tombol simulasi hanya tersedia pada lingkungan pengembangan dengan payment provider mock.
            Status lunas tetap ditentukan oleh webhook pembayaran di server.
          </p>
          {actionError ? (
            <p className="mt-3 text-sm font-semibold text-brick" role="alert">
              {errorMessage(actionError)}
            </p>
          ) : null}
        </section>
      ) : null}

      {order.status === 'PAID' ? (
        <section className="mt-6 flex items-start gap-3 border border-olive/30 bg-olive/5 p-5" aria-live="polite">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-olive" aria-hidden />
          <div>
            <h2 className="text-lg font-bold text-olive">Pembayaran terkonfirmasi</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tiket sudah diterbitkan. Buka tiket satu per satu di bawah, atau cek email konfirmasi untuk
              tautan yang sama.
            </p>
          </div>
        </section>
      ) : null}

      {order.status === 'PAYMENT_REVIEW' ? (
        <section className="mt-6 border border-amber-700/30 bg-amber-50 p-5">
          <h2 className="text-lg font-bold text-amber-900">Pembayaran sedang ditinjau</h2>
          <p className="mt-1 text-sm leading-relaxed text-amber-900/80">
            Pembayaran diterima setelah batas reservasi. Admin akan memeriksa ketersediaan kuota sebelum
            menerbitkan tiket atau memproses refund. Kamu tidak perlu membayar ulang.
          </p>
        </section>
      ) : null}

      {['EXPIRED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'REFUND_PENDING'].includes(order.status) ? (
        <section className="mt-6 border border-warm-border bg-warm-muted/60 p-5">
          <h2 className="text-lg font-bold">
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
            className="mt-4 inline-flex text-sm font-semibold underline underline-offset-4"
          >
            Lihat halaman acara
          </Link>
        </section>
      ) : null}

      {paid && order.tickets.length > 0 ? (
        <section className="mt-8">
          <h2 className="border-b border-ink pb-2 text-lg font-bold">Tiket kamu</h2>
          <div className="mt-2 divide-y divide-warm-border">
            {order.tickets.map((ticket) => (
              <div key={ticket.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="text-sm font-bold">{ticket.holderName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {ticket.ticketTypeName ?? 'Tiket'} · <span className="tabular-nums">{ticket.ticketCode}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <TicketStatusBadge status={ticket.status} />
                  <Link
                    to={`/ticket/${ticket.ticketCode}${ticketTokenQuery}`}
                    className="rounded-md bg-ink px-3 py-1.5 text-xs font-semibold text-paper"
                  >
                    Buka tiket
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="border-b border-ink pb-2 text-lg font-bold">Rincian pesanan</h2>
          <div className="mt-3 space-y-2 text-sm">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-4">
                <span>
                  {item.ticketNameSnapshot ?? item.ticketTypeName} × {item.quantity}
                </span>
                <span className="tabular-nums">{formatIDR(item.lineTotal)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2 border-t border-dashed border-warm-border pt-3 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatIDR(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Diskon</span>
              <span className="tabular-nums text-olive">
                {order.discount ? `− ${formatIDR(order.discount)}` : formatIDR(0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Biaya platform</span>
              <span className="tabular-nums">{formatIDR(order.platformFee)}</span>
            </div>
            <div className="flex justify-between border-t border-ink pt-2 font-bold">
              <span>Total</span>
              <span className="tabular-nums">{formatIDR(order.total)}</span>
            </div>
          </div>
        </div>

        <aside className="text-sm">
          <h2 className="border-b border-ink pb-2 text-lg font-bold">Pembeli</h2>
          <dl className="mt-3 space-y-2">
            <div>
              <dt className="text-xs text-muted-foreground">Nama</dt>
              <dd className="font-semibold">{order.buyerName}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="break-all">{order.buyerEmail}</dd>
            </div>
            {order.buyerPhone ? (
              <div>
                <dt className="text-xs text-muted-foreground">WhatsApp</dt>
                <dd>{order.buyerPhone}</dd>
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
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-olive underline underline-offset-4"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden />
            Salin tautan pesanan
          </button>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Tautan memuat token akses. Jangan bagikan ke orang yang tidak berkepentingan.
          </p>
        </aside>
      </section>
    </main>
  );
}