import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowUpRight, QrCode } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import type { Order } from '@/lib/models';
import { useDocumentTitle } from '@/lib/hooks';
import { useLanguage } from '@/lib/language';
import { formatDateTime, formatIDR } from '@/lib/format';
import { ErrorState, LoadingState } from '@/components/common/states';
import { OrderStatusBadge, TicketStatusBadge } from '@/components/common/status-badge';
import { AccountEventMeta, AccountHeading, PaymentBadge } from './account-components';

export function AccountOrderDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  useDocumentTitle(t('Detail Pesanan', 'Order Details'));
  const query = useQuery({
    queryKey: ['customer', user?.id, 'order', id],
    enabled: Boolean(id && user),
    queryFn: ({ signal }) =>
      api<{ order: Order }>(`/account/orders/${encodeURIComponent(id!)}`, { signal }),
  });
  if (query.isPending) return <LoadingState rows={4} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const { order } = query.data;
  return (
    <>
      <Link className="account-text-link mb-4" to="/account/orders">
        <ArrowLeft size={16} aria-hidden />
        {t('Riwayat pesanan', 'Order history')}
      </Link>
      <AccountHeading
        title={t('Detail Pesanan', 'Order Details')}
        description={`${order.orderCode} · ${formatDateTime(order.createdAt)}`}
      />
      <div className="account-detail-grid">
        <div className="account-detail-stack">
          <section className="account-panel">
            <h2>{order.event.title}</h2>
            <AccountEventMeta event={order.event} />
            <Link to={`/events/${order.event.slug}`} className="account-text-link mt-2">
              {t('Informasi event', 'Event information')}
              <ArrowUpRight size={16} aria-hidden />
            </Link>
            <dl className="account-definition sm:grid-cols-2">
              <div>
                <dt>{t('Status pesanan', 'Order status')}</dt>
                <dd>
                  <OrderStatusBadge status={order.status} />
                </dd>
              </div>
              <div>
                <dt>{t('Status pembayaran', 'Payment status')}</dt>
                <dd>
                  <PaymentBadge status={order.payment?.status} />
                </dd>
              </div>
              <div>
                <dt>{t('Metode pembayaran', 'Payment method')}</dt>
                <dd>
                  {order.payment?.method ??
                    (order.payment?.provider === 'mock'
                      ? t('Pembayaran simulasi', 'Simulated payment')
                      : (order.payment?.provider ?? t('Belum dipilih', 'Not selected')))}
                </dd>
              </div>
              <div>
                <dt>{t('Waktu pembayaran', 'Paid at')}</dt>
                <dd>
                  {order.payment?.paidAt
                    ? formatDateTime(order.payment.paidAt)
                    : t('Belum dibayar', 'Not paid yet')}
                </dd>
              </div>
            </dl>
            {order.status === 'PENDING_PAYMENT' ? (
              <Link
                className="account-primary mt-6"
                to={`/order/${encodeURIComponent(order.orderCode)}`}
              >
                {t('Lanjutkan pembayaran', 'Continue payment')}
                <ArrowUpRight size={16} aria-hidden />
              </Link>
            ) : null}
          </section>
          <section className="account-panel">
            <h2>{t('Rincian tiket', 'Ticket breakdown')}</h2>
            <ul className="account-item-list">
              {order.items.map((item) => (
                <li key={item.id}>
                  <div>
                    {item.ticketNameSnapshot ?? item.ticketTypeName}
                    <span className="mt-1 block">
                      {item.quantity} × {formatIDR(item.unitPrice)}
                    </span>
                  </div>
                  <strong className="font-medium">{formatIDR(item.lineTotal)}</strong>
                </li>
              ))}
            </ul>
          </section>
          <section className="account-panel">
            <h2>{t('Tiket digital', 'Digital tickets')}</h2>
            {order.tickets.length ? (
              <ul className="mt-4 divide-y divide-slate-100">
                {order.tickets.map((ticket) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                    key={ticket.id}
                  >
                    <div>
                      <p className="text-sm font-medium">{ticket.holderName}</p>
                      <p className="mt-1 break-all font-mono text-xs text-slate-600">
                        {ticket.ticketCode}
                      </p>
                      <div className="mt-2">
                        <TicketStatusBadge status={ticket.status} />
                      </div>
                    </div>
                    <Link
                      to={`/account/tickets/${encodeURIComponent(ticket.ticketCode)}`}
                      className="account-text-link"
                    >
                      <QrCode size={16} aria-hidden />
                      {t('Buka tiket', 'Open ticket')}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="account-panel-description mt-4">
                {t(
                  'Tiket diterbitkan setelah pembayaran dikonfirmasi. Jika sudah lunas, muat ulang untuk memeriksa penerbitan tiket.',
                  'Tickets are issued after payment confirmation. If already paid, refresh to check ticket issuance.',
                )}
              </p>
            )}
          </section>
        </div>
        <aside
          className="account-detail-stack"
          aria-label={t('Ringkasan pesanan', 'Order summary')}
        >
          <section className="account-panel">
            <h2>{t('Ringkasan pembayaran', 'Payment summary')}</h2>
            <dl className="account-breakdown">
              <div>
                <dt>Subtotal</dt>
                <dd>{formatIDR(order.subtotal)}</dd>
              </div>
              {order.discount > 0 ? (
                <div>
                  <dt>{t('Diskon', 'Discount')}</dt>
                  <dd>−{formatIDR(order.discount)}</dd>
                </div>
              ) : null}
              <div>
                <dt>{t('Biaya layanan', 'Service fee')}</dt>
                <dd>{formatIDR(order.platformFee)}</dd>
              </div>
              <div className="account-breakdown-total">
                <dt>Total</dt>
                <dd>{formatIDR(order.total)}</dd>
              </div>
            </dl>
          </section>
          <section className="account-panel">
            <h2>{t('Data pemesan', 'Buyer information')}</h2>
            <dl className="account-definition">
              <div>
                <dt>{t('Nama', 'Name')}</dt>
                <dd>{order.buyerName}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{order.buyerEmail}</dd>
              </div>
              {order.buyerPhone ? (
                <div>
                  <dt>WhatsApp</dt>
                  <dd>{order.buyerPhone}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        </aside>
      </div>
    </>
  );
}
