import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Calendar, Ticket, ArrowRight } from 'lucide-react';
import type { OrderStatus } from '@gofest/shared';
import { useAccountOrders, pageMeta } from '@/lib/queries';
import { useDocumentTitle, useDebouncedValue } from '@/lib/hooks';
import { formatDateTime, formatIDR } from '@/lib/format';
import { OrderStatusBadge } from '@/components/common/status-badge';
import { Pagination } from '@/components/common/pagination';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states';
import { cn } from '@/lib/utils';

const statusTabs: Array<{ label: string; value: OrderStatus | 'ALL' }> = [
  { label: 'Semua', value: 'ALL' },
  { label: 'Menunggu Pembayaran', value: 'PENDING_PAYMENT' },
  { label: 'Lunas / Berhasil', value: 'PAID' },
  { label: 'Kedaluwarsa / Batal', value: 'EXPIRED' },
];

export function AccountOrdersPage() {
  useDocumentTitle('Pesanan Saya');
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const currentStatus = (searchParams.get('status') as OrderStatus) || undefined;
  const initialQ = searchParams.get('q') ?? '';

  const [search, setSearch] = useState(initialQ);
  const debouncedSearch = useDebouncedValue(search, 400);

  const ordersQuery = useAccountOrders(
    page,
    10,
    currentStatus,
    debouncedSearch.trim() || undefined,
  );

  const orders = ordersQuery.data?.data ?? [];
  const meta = pageMeta(ordersQuery.data?.meta);

  function setPage(newPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(newPage));
    setSearchParams(next);
  }

  function setStatus(status: OrderStatus | 'ALL') {
    const next = new URLSearchParams(searchParams);
    next.delete('page');
    if (status === 'ALL') {
      next.delete('status');
    } else {
      next.set('status', status);
    }
    setSearchParams(next);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink">Riwayat Pesanan</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Daftar lengkap pesanan tiket yang terhubung dengan akunmu
          </p>
        </div>

        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              const next = new URLSearchParams(searchParams);
              next.delete('page');
              if (e.target.value.trim()) {
                next.set('q', e.target.value.trim());
              } else {
                next.delete('q');
              }
              setSearchParams(next);
            }}
            placeholder="Cari kode order atau nama acara..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none placeholder:text-slate-400 focus:border-blue-600 focus:bg-white"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3">
        {statusTabs.map((tab) => {
          const isActive = tab.value === 'ALL' ? !currentStatus : currentStatus === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatus(tab.value)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-medium transition-all',
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {ordersQuery.isLoading ? (
        <LoadingState rows={4} label="Memuat riwayat pesanan" />
      ) : ordersQuery.isError ? (
        <ErrorState error={ordersQuery.error} onRetry={() => void ordersQuery.refetch()} />
      ) : orders.length === 0 ? (
        <EmptyState
          title="Tidak ada pesanan ditemukan"
          description={
            debouncedSearch || currentStatus
              ? 'Tidak ada pesanan yang sesuai dengan filter pencarian.'
              : 'Kamu belum memesan tiket apapun.'
          }
          action={
            <Link
              to={debouncedSearch || currentStatus ? '/account/orders' : '/events'}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-5 text-xs font-medium text-white shadow-xs hover:bg-blue-700"
            >
              {debouncedSearch || currentStatus ? 'Reset filter' : 'Jelajahi Acara'}
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            {orders.map((order) => (
              <article
                key={order.id}
                className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-medium text-blue-600">
                      {order.orderCode}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {order.event?.title ?? 'Acara Gofest'}
                  </h3>
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="h-3.5 w-3.5" aria-hidden />
                    {formatDateTime(order.createdAt)}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center">
                  <p className="text-base font-semibold tabular-nums text-slate-900">
                    {formatIDR(order.total)}
                  </p>
                  <Link
                    to={`/account/orders/${order.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Ticket className="h-3.5 w-3.5" aria-hidden />
                    Detail pesanan
                    <ArrowRight className="h-3 w-3" aria-hidden />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <Pagination meta={meta} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
