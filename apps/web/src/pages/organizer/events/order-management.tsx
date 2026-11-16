import { useWorkspace } from '@/pages/workspace/workspace-hooks';

import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, Search } from 'lucide-react';
import { apiPage } from '@/lib/api';
import { formatDateTime, formatIDR } from '@/lib/format';
import { useDebouncedValue } from '@/lib/hooks';
import type { EventOrderRow } from '@/lib/queries';
import { pageMeta } from '@/lib/queries';
import { OrderStatusBadge } from '@/components/common/status-badge';
import { Pagination } from '@/components/common/pagination';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states';
import { Button } from '@/components/ui/button';

export function EventOrderManagementPage() {
  const { apiBase } = useWorkspace();
  const { id: eventId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const initialQ = searchParams.get('q') ?? '';

  const [search, setSearch] = useState(initialQ);
  const debouncedSearch = useDebouncedValue(search, 400);

  const ordersQuery = useQuery({
    queryKey: ['organizer-event-orders', eventId, page, debouncedSearch],
    queryFn: () =>
      apiPage<EventOrderRow>(`${apiBase}/events/${eventId}/orders`, {
        query: { page, limit: 10, q: debouncedSearch.trim() || undefined },
      }),
    enabled: Boolean(eventId),
  });

  const orders = ordersQuery.data?.data ?? [];
  const meta = pageMeta(ordersQuery.data?.meta);

  function setPage(newPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(newPage));
    setSearchParams(next);
  }

  function handleExportCsv() {
    window.open(`/api/v1${apiBase}/events/${eventId}/attendees/export`, '_blank');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink">Pesanan & Peserta</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Daftar transaksi pembelian tiket dan nama pemegang tiket untuk acara ini
          </p>
        </div>

        <Button
          onClick={handleExportCsv}
          variant="outline"
          className="inline-flex items-center gap-2"
        >
          <Download className="h-4 w-4" aria-hidden />
          Ekspor CSV Peserta
        </Button>
      </div>

      <div className="relative w-full max-w-xs">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            const next = new URLSearchParams(searchParams);
            next.delete('page');
            if (e.target.value.trim()) next.set('q', e.target.value.trim());
            else next.delete('q');
            setSearchParams(next);
          }}
          placeholder="Cari kode order, pembeli, atau email..."
          className="h-9 w-full rounded-md border border-ink/20 bg-card pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ink"
        />
      </div>

      {ordersQuery.isLoading ? (
        <LoadingState rows={4} label="Memuat pesanan acara" />
      ) : ordersQuery.isError ? (
        <ErrorState error={ordersQuery.error} onRetry={() => void ordersQuery.refetch()} />
      ) : orders.length === 0 ? (
        <EmptyState
          title="Belum ada transaksi pesanan"
          description={
            debouncedSearch
              ? 'Tidak ada pesanan yang sesuai dengan kata kunci pencarian.'
              : 'Acara ini belum memiliki pesanan tiket dari pembeli.'
          }
        />
      ) : (
        <div className="space-y-4">
          <div
            tabIndex={0}
            role="region"
            aria-label="Pesanan dan peserta"
            className="overflow-x-auto rounded-md border border-warm-border bg-card"
          >
            <table className="w-full text-left text-xs">
              <thead className="border-b border-warm-border bg-warm-muted/40 font-medium text-ink">
                <tr>
                  <th className="px-4 py-3">Kode Order</th>
                  <th className="px-4 py-3">Pembeli</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Tiket Diterbitkan</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Waktu Pemesanan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-border text-ink">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-warm-muted/20">
                    <td className="px-4 py-3 font-mono font-medium text-ink">{order.orderCode}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{order.buyerName}</p>
                      <p className="text-[11px] text-muted-foreground">{order.buyerEmail}</p>
                      {order.buyerPhone ? (
                        <p className="text-[11px] text-muted-foreground">{order.buyerPhone}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3">
                      {order.tickets && order.tickets.length > 0 ? (
                        <div className="space-y-1">
                          {order.tickets.map((t) => (
                            <div
                              key={t.id}
                              className="flex items-center gap-1.5 font-mono text-[11px]"
                            >
                              <span className="font-medium">{t.ticketCode}</span>
                              <span className="text-muted-foreground">({t.holderName})</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Belum diterbitkan</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {formatIDR(order.total)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination meta={meta} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
