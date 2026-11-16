import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import {
  accountHistoryQuerySchema,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUSES,
} from '@gofest/shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states';
import { formatDateTime, formatIDR } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { useLanguage } from '@/lib/language';
import { pageMeta } from '@/lib/queries';
import { AccountHeading, AccountPagination, PaymentBadge } from './account-components';
import { AccountFilters } from './account-filters';
import { useAccountHistory } from './account-data';

export function AccountOrdersPage() {
  const { t } = useLanguage();
  useDocumentTitle(t('Riwayat Pesanan', 'Order History'));
  const [params, setParams] = useSearchParams();
  const parsed = accountHistoryQuerySchema.safeParse({ ...Object.fromEntries(params), limit: 10 });
  const filters = parsed.success ? parsed.data : accountHistoryQuerySchema.parse({ limit: 10 });
  const query = useAccountHistory(filters);
  const paymentLabels = {
    PENDING: t('Menunggu', 'Pending'),
    PAID: t('Lunas', 'Paid'),
    FAILED: t('Gagal', 'Failed'),
    EXPIRED: t('Kedaluwarsa', 'Expired'),
    REFUND_PENDING: t('Proses refund', 'Refund pending'),
    REFUNDED: t('Dikembalikan', 'Refunded'),
    UNKNOWN: t('Belum diketahui', 'Unknown'),
  };
  return (
    <section aria-busy={query.isFetching}>
      <AccountHeading
        title={t('Riwayat Pesanan', 'Order History')}
        description={t(
          'Pantau pembayaran dan lihat rincian setiap pesananmu.',
          'Track payments and review the details of your orders.',
        )}
      />
      <AccountFilters searchLabel={t('Kode pesanan atau nama event', 'Order code or event name')}>
        <label>
          {t('Status pesanan', 'Order status')}
          <select name="status" defaultValue={params.get('status') ?? ''}>
            <option value="">{t('Semua pesanan', 'All orders')}</option>
            {ORDER_STATUSES.map((status) => (
              <option value={status} key={status}>
                {ORDER_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('Status pembayaran', 'Payment status')}
          <select name="paymentStatus" defaultValue={params.get('paymentStatus') ?? ''}>
            <option value="">{t('Semua pembayaran', 'All payments')}</option>
            {PAYMENT_STATUSES.map((status) => (
              <option value={status} key={status}>
                {paymentLabels[status]}
              </option>
            ))}
          </select>
        </label>
      </AccountFilters>
      {!parsed.success ? (
        <p className="account-notice mb-5" role="alert">
          {t(
            'Filter pada tautan tidak valid. Terapkan ulang filter.',
            'Invalid filters in this link. Apply your filters again.',
          )}
        </p>
      ) : null}
      {query.isPending ? (
        <LoadingState rows={4} label={t('Memuat pesanan', 'Loading orders')} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.data.length === 0 ? (
        <EmptyState
          className="account-empty"
          title={t('Tidak ada pesanan ditemukan', 'No orders found')}
          description={t(
            'Belum ada pesanan atau tidak ada yang sesuai dengan filter. Pembelian sebagai tamu tetap dapat dibuka melalui tautan pesanan dari email.',
            'No orders yet, or none match your filters. Guest purchases remain accessible through the order link from your email.',
          )}
          action={
            <Link className="account-primary" to="/events">
              {t('Jelajahi event', 'Explore events')}
            </Link>
          }
        />
      ) : (
        <>
          <div className="account-order-list">
            {query.data.data.map((order) => (
              <article className="account-order-row" key={order.id}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      className="font-mono text-xs text-[#0052CC]"
                      to={`/account/orders/${order.id}`}
                    >
                      {order.orderCode}
                    </Link>
                    <PaymentBadge status={order.payment?.status} />
                  </div>
                  <h2>
                    <Link to={`/account/orders/${order.id}`}>{order.event.title}</Link>
                  </h2>
                  <p>
                    {formatDateTime(order.createdAt)} ·{' '}
                    {order.items.reduce((count, item) => count + item.quantity, 0)}{' '}
                    {t('tiket', 'tickets')}
                  </p>
                  <p className="mt-1">
                    {t('Metode', 'Method')}:{' '}
                    {order.payment?.method ??
                      (order.payment?.provider === 'mock'
                        ? t('Pembayaran simulasi', 'Simulated payment')
                        : (order.payment?.provider ?? t('Belum dipilih', 'Not selected')))}
                  </p>
                </div>
                <div className="account-order-total">
                  <strong>{formatIDR(order.total)}</strong>
                  <Link className="account-text-link sm:mt-2" to={`/account/orders/${order.id}`}>
                    {t('Detail pesanan', 'Order details')}
                    <ArrowRight size={16} aria-hidden />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <AccountPagination
            meta={pageMeta(query.data.meta)}
            onPageChange={(page) => {
              const next = new URLSearchParams(params);
              next.set('page', String(page));
              setParams(next);
            }}
          />
        </>
      )}
    </section>
  );
}
