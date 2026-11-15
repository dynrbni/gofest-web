import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { api, apiPage, errorMessage } from '@/lib/api';
import { formatDateTime, formatIDR } from '@/lib/format';
import { useDebouncedValue, useDocumentTitle } from '@/lib/hooks';
import type { AdminOrder } from '@/lib/models';
import { pageMeta } from '@/lib/queries';
import { OrderStatusBadge } from '@/components/common/status-badge';
import { Pagination } from '@/components/common/pagination';
import { EmptyState, ErrorState, Field, LoadingState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export function AdminOrdersPage() {
  useDocumentTitle('Transaksi Platform · Super Admin');
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const initialQ = searchParams.get('q') ?? '';
  const [search, setSearch] = useState(initialQ);
  const debouncedSearch = useDebouncedValue(search, 400);

  // Payment review resolve modal
  const [resolveModal, setResolveModal] = useState<{
    order: AdminOrder;
    action: 'APPROVE_ISSUE_TICKETS' | 'REJECT_REFUND';
  } | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const ordersQuery = useQuery({
    queryKey: ['admin-orders', page, debouncedSearch],
    queryFn: () =>
      apiPage<AdminOrder>('/admin/orders', {
        query: { page, limit: 10, q: debouncedSearch.trim() || undefined },
      }),
  });

  const orders = ordersQuery.data?.data ?? [];
  const meta = pageMeta(ordersQuery.data?.meta);

  function setPage(newPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(newPage));
    setSearchParams(next);
  }

  async function handleResolvePayment() {
    if (!resolveModal) return;
    const { order, action } = resolveModal;

    setSubmitting(true);
    try {
      await api(`/admin/orders/${order.id}/payment-review/resolve`, {
        method: 'POST',
        body: {
          decision: action,
          note: note.trim() || undefined,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      toast.success('Keputusan review pembayaran berhasil disimpan');
      setResolveModal(null);
      setNote('');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-warm-border pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tightest">Transaksi & Pesanan</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Audit status transaksi, pembayaran provider, dan rekonsiliasi pembayaran terlambat
          </p>
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
            placeholder="Cari kode order, pembeli, email..."
            className="h-9 w-full rounded-md border border-ink/20 bg-card pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ink"
          />
        </div>
      </div>

      {ordersQuery.isLoading ? (
        <LoadingState rows={4} label="Memuat transaksi" />
      ) : ordersQuery.isError ? (
        <ErrorState error={ordersQuery.error} onRetry={() => void ordersQuery.refetch()} />
      ) : orders.length === 0 ? (
        <EmptyState
          title="Tidak ada transaksi ditemukan"
          description={
            debouncedSearch
              ? 'Tidak ada transaksi yang cocok dengan kata kunci pencarian.'
              : 'Belum ada transaksi di platform.'
          }
        />
      ) : (
        <div className="space-y-4">
          <div
            tabIndex={0}
            role="region"
            aria-label="Daftar transaksi"
            className="overflow-x-auto rounded-md border border-warm-border bg-card"
          >
            <table className="w-full text-left text-xs">
              <thead className="border-b border-warm-border bg-warm-muted/40 font-semibold text-ink">
                <tr>
                  <th className="px-4 py-3">Kode Order</th>
                  <th className="px-4 py-3">Acara</th>
                  <th className="px-4 py-3">Pembeli</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Waktu Dibuat</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-border text-ink">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-warm-muted/20">
                    <td className="px-4 py-3 font-mono font-bold text-ink">{order.orderCode}</td>
                    <td className="px-4 py-3 font-medium">{order.event?.title ?? '-'}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{order.buyerName}</p>
                      <p className="text-[11px] text-muted-foreground">{order.buyerEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">
                      {formatIDR(order.total)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {order.status === 'PAYMENT_REVIEW' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setResolveModal({
                                order,
                                action: 'APPROVE_ISSUE_TICKETS',
                              });
                              setNote('');
                            }}
                            className="rounded bg-olive px-2 py-1 text-[11px] font-semibold text-paper hover:bg-olive/90"
                          >
                            Terbitkan Tiket
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setResolveModal({
                                order,
                                action: 'REJECT_REFUND',
                              });
                              setNote('');
                            }}
                            className="rounded border border-brick px-2 py-1 text-[11px] font-semibold text-brick hover:bg-brick/10"
                          >
                            Tolak & Refund
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination meta={meta} onPageChange={setPage} />
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={Boolean(resolveModal)} onOpenChange={(open) => !open && setResolveModal(null)}>
        <DialogContent className="max-w-md bg-paper border-warm-border">
          <DialogHeader>
            <DialogTitle>
              {resolveModal?.action === 'APPROVE_ISSUE_TICKETS'
                ? 'Terbitkan Tiket (Approve)'
                : 'Tolak & Kembalikan Dana (Refund)'}
            </DialogTitle>
            <DialogDescription>
              Order: <strong>{resolveModal?.order.orderCode}</strong> · Total:{' '}
              {formatIDR(resolveModal?.order.total ?? 0)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <Field
              label="Catatan Rekonsiliasi"
              htmlFor="resolveNote"
              hint="Dicatat dalam audit trail"
            >
              <Input
                id="resolveNote"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Contoh: Bukti mutasi provider telah diverifikasi"
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setResolveModal(null)}>
                Batal
              </Button>
              <Button type="button" onClick={handleResolvePayment} disabled={submitting}>
                {submitting ? 'Menyimpan...' : 'Konfirmasi Keputusan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
