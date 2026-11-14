import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, MapPin, Ticket, CreditCard, ExternalLink, QrCode } from 'lucide-react';
import { api } from '@/lib/api';
import type { Order } from '@/lib/models';
import { useDocumentTitle } from '@/lib/hooks';
import { formatDateTime, formatEventWhen, formatIDR } from '@/lib/format';
import { OrderStatusBadge, TicketStatusBadge } from '@/components/common/status-badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states';
import { Button } from '@/components/ui/button';

export function AccountOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  useDocumentTitle('Detail Pesanan');

  const orderQuery = useQuery({
    queryKey: ['account-order-detail', id],
    queryFn: () => api<{ order: Order }>(`/account/orders/${encodeURIComponent(id!)}`),
    enabled: Boolean(id),
  });

  const order = orderQuery.data?.order;

  if (orderQuery.isLoading) {
    return <LoadingState rows={4} label="Memuat detail pesanan" />;
  }

  if (orderQuery.isError || !order) {
    return (
      <ErrorState
        error={orderQuery.error ?? new Error('Pesanan tidak ditemukan')}
        onRetry={() => void orderQuery.refetch()}
      />
    );
  }

  const isPending = order.status === 'PENDING_PAYMENT';
  const isPaid = order.status === 'PAID';

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/account/orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Kembali ke daftar pesanan
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4 border-b border-warm-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-ink">Pesanan {order.orderCode}</h2>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Dibuat pada {formatDateTime(order.createdAt)}
            </p>
          </div>

          {isPending ? (
            <Link
              to={`/order/${order.orderCode}`}
              className="inline-flex items-center gap-2 rounded-md bg-brick px-4 py-2 text-sm font-semibold text-paper hover:bg-brick/90"
            >
              <CreditCard className="h-4 w-4" aria-hidden />
              Selesaikan Pembayaran
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Event information */}
          {order.event ? (
            <div className="rounded-md border border-warm-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-olive">Acara</p>
              <h3 className="mt-1 text-lg font-bold text-ink">
                <Link to={`/events/${order.event.slug}`} className="hover:underline hover:underline-offset-4">
                  {order.event.title}
                </Link>
              </h3>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-ink/70" aria-hidden />
                  <span>{formatEventWhen(order.event.startsAt, order.event.endsAt, order.event.timezone)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-ink/70" aria-hidden />
                  <span>{order.event.city ? `${order.event.venueName ?? ''}, ${order.event.city}` : 'Acara Online'}</span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Tickets issued */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-ink">
              Tiket Digital ({order.tickets?.length ?? 0})
            </h3>

            {order.tickets && order.tickets.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {order.tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="relative flex flex-col justify-between rounded-md border border-warm-border bg-card p-4 transition-shadow hover:shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-ink">{ticket.ticketCode}</span>
                        <TicketStatusBadge status={ticket.status} />
                      </div>
                      <p className="mt-2 text-sm font-semibold text-ink">{ticket.holderName}</p>
                      <p className="text-xs text-muted-foreground">{ticket.holderEmail}</p>
                    </div>

                    <div className="mt-4 border-t border-dashed border-warm-border pt-3">
                      <Link
                        to={`/ticket/${ticket.ticketCode}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-brick underline underline-offset-4 hover:text-brick/90"
                      >
                        <QrCode className="h-3.5 w-3.5" aria-hidden />
                        Buka Tiket & QR Code
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-warm-border bg-warm-muted/30 p-6 text-center text-xs text-muted-foreground">
                {isPaid
                  ? 'Tiket sedang diproses.'
                  : 'Tiket digital akan diterbitkan otomatis setelah pembayaran pesanan dikonfirmasi lunas.'}
              </div>
            )}
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="rounded-md border border-warm-border bg-card p-5">
          <h3 className="text-sm font-bold text-ink">Ringkasan Pembayaran</h3>

          <div className="mt-4 space-y-2.5 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal Tiket</span>
              <span className="font-medium tabular-nums text-ink">{formatIDR(order.subtotal)}</span>
            </div>

            {order.discount > 0 ? (
              <div className="flex justify-between text-olive">
                <span>Diskon Kupon</span>
                <span className="font-medium tabular-nums">-{formatIDR(order.discount)}</span>
              </div>
            ) : null}

            {order.platformFee > 0 ? (
              <div className="flex justify-between text-muted-foreground">
                <span>Biaya Platform</span>
                <span className="font-medium tabular-nums text-ink">{formatIDR(order.platformFee)}</span>
              </div>
            ) : null}

            <div className="border-t border-warm-border pt-3">
              <div className="flex justify-between text-sm font-bold text-ink">
                <span>Total</span>
                <span className="tabular-nums">{formatIDR(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-warm-border pt-4 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-ink">Data Pembeli:</p>
            <p>{order.buyerName}</p>
            <p>{order.buyerEmail}</p>
            {order.buyerPhone ? <p>{order.buyerPhone}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
