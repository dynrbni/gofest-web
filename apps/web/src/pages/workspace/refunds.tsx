import { useWorkspace } from '@/pages/workspace/workspace-hooks';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, apiPage, errorMessage } from '@/lib/api';
import { formatIDR, formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, InlineError } from '@/components/common/states';
import { Pagination } from '@/components/common/pagination';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { WorkspaceHeading, DataTable, QueryState, Status } from './workspace-components';
import type { RefundRecord, WorkspaceOrder } from './workspace-models';

export function RefundsPage() {
  const { creator, apiBase } = useWorkspace();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [create, setCreate] = useState(false);
  const [orderId, setOrder] = useState('');
  const [ticketAmount, setTicket] = useState('');
  const [feeAmount, setFee] = useState('');
  const [reason, setReason] = useState('');
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [review, setReview] = useState<{
    refund: RefundRecord;
    status: 'APPROVED' | 'REJECTED';
  } | null>(null);
  const [note, setNote] = useState('');
  const query = useQuery({
    queryKey: ['refunds', apiBase, page, status, search],
    queryFn: () =>
      apiPage<RefundRecord>(`${apiBase}/refunds`, { query: { page, status, q: search } }),
  });
  const orders = useQuery({
    queryKey: ['refundable-orders'],
    queryFn: () =>
      apiPage<WorkspaceOrder>('/admin/orders', { query: { status: 'PAID', limit: 100 } }),
    enabled: create && !creator,
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['refunds'] });
    void client.invalidateQueries({ queryKey: ['finance'] });
    void client.invalidateQueries({ queryKey: ['workspace-analytics'] });
    void client.invalidateQueries({ queryKey: ['event-reports'] });
  };
  const save = useMutation({
    mutationFn: () =>
      api('/admin/refunds', {
        method: 'POST',
        body: {
          orderId,
          ticketAmount: Number(ticketAmount),
          feeAmount: Number(feeAmount),
          reason,
          idempotencyKey: key,
        },
      }),
    onSuccess: () => {
      refresh();
      setCreate(false);
      setKey(crypto.randomUUID());
      toast.success('Permintaan refund dicatat');
    },
  });
  const decision = useMutation({
    mutationFn: () =>
      api(`/admin/refunds/${review!.refund.id}/review`, {
        method: 'PATCH',
        body: { status: review!.status, note },
      }),
    onSuccess: () => {
      refresh();
      setReview(null);
      toast.success('Review refund tersimpan');
    },
  });
  const simulate = useMutation({
    mutationFn: (id: string) => api(`/admin/refunds/${id}/simulate`, { method: 'POST' }),
    onSuccess: () => {
      refresh();
      toast.success('Simulasi refund dicatat; tidak ada transfer eksternal');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  return (
    <div className="space-y-6">
      <WorkspaceHeading
        title="Refund Management"
        description="Persetujuan mereservasi dana. Simulasi development memperbarui ledger tanpa mengirim uang kepada customer."
        action={
          !creator ? (
            <Button
              onClick={() => {
                setCreate(true);
                save.reset();
                setOrder('');
                setTicket('');
                setFee('');
                setReason('');
                setKey(crypto.randomUUID());
              }}
            >
              Buat permintaan refund
            </Button>
          ) : undefined
        }
      />
      <div className="flex flex-wrap gap-4">
        <Field label="Cari order / alasan" htmlFor="refund-search">
          <Input
            id="refund-search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </Field>
        <Field label="Status" htmlFor="refund-status">
          <select
            id="refund-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="h-11 rounded-lg border border-slate-300 bg-white px-3"
          >
            <option value="">Semua status</option>
            {['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </Field>
      </div>
      <QueryState query={query} empty={query.data?.data.length === 0}>
        <DataTable
          caption="Permintaan refund"
          headers={[
            'Order',
            'Customer',
            'Nominal',
            'Alokasi',
            'Alasan',
            'Status',
            'Tanggal',
            'Aksi',
          ]}
        >
          {query.data?.data.map((refund) => (
            <tr key={refund.id}>
              <td>{refund.order.orderCode}</td>
              <td>{refund.order.buyerName}</td>
              <td>{formatIDR(refund.amount)}</td>
              <td className="text-xs">
                Tiket {formatIDR(refund.ticketAmount)}
                <br />
                Fee {formatIDR(refund.feeAmount)}
              </td>
              <td className="max-w-60 whitespace-normal text-xs">
                {refund.reason}
                {refund.note ? <p className="mt-1 text-slate-600">Review: {refund.note}</p> : null}
              </td>
              <td>
                <Status value={refund.status} />
                <span className="mt-1 block text-[11px] text-slate-600">{refund.provider}</span>
              </td>
              <td>{formatDateTime(refund.createdAt)}</td>
              <td>
                {!creator && refund.status === 'PENDING' ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setReview({ refund, status: 'APPROVED' });
                        setNote('');
                        decision.reset();
                      }}
                    >
                      Setujui
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setReview({ refund, status: 'REJECTED' });
                        setNote('');
                        decision.reset();
                      }}
                    >
                      Tolak
                    </Button>
                  </div>
                ) : !creator && refund.status === 'APPROVED' && import.meta.env.DEV ? (
                  <ConfirmDialog
                    title="Catat simulasi refund?"
                    description="Saldo reservasi akan dikurangi dan refund dicatat pada ledger. Ini simulasi development; tidak ada uang yang dikirim."
                    confirmLabel="Catat simulasi"
                    trigger={
                      <Button size="sm" variant="outline" disabled={simulate.isPending}>
                        Simulasikan refund
                      </Button>
                    }
                    onConfirm={() => simulate.mutate(refund.id)}
                  />
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </DataTable>
        <Pagination meta={query.data?.meta} onPageChange={setPage} />
      </QueryState>
      <Dialog open={create} onOpenChange={setCreate}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Permintaan refund</DialogTitle>
            <DialogDescription>
              Tentukan alokasi tiket dan fee yang akan dikembalikan.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            <Field label="Order terbayar" htmlFor="refund-order" required>
              <select
                id="refund-order"
                required
                value={orderId}
                onChange={(event) => {
                  setOrder(event.target.value);
                  const order = orders.data?.data.find((order) => order.id === event.target.value);
                  setTicket(String((order?.subtotal ?? 0) - (order?.discount ?? 0)));
                  setFee(String(order?.platformFee ?? 0));
                }}
                className="h-11 w-full rounded-lg border border-slate-300 px-3"
              >
                <option value="">Pilih order</option>
                {orders.data?.data.map((order) => (
                  <option value={order.id} key={order.id}>
                    {order.orderCode} · {order.buyerName}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Refund harga tiket (Rp)" htmlFor="refund-ticket" required>
                <Input
                  id="refund-ticket"
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={ticketAmount}
                  onChange={(event) => setTicket(event.target.value)}
                />
              </Field>
              <Field label="Refund service fee (Rp)" htmlFor="refund-fee" required>
                <Input
                  id="refund-fee"
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={feeAmount}
                  onChange={(event) => setFee(event.target.value)}
                />
              </Field>
            </div>
            <Field label="Alasan refund" htmlFor="refund-reason" required>
              <Textarea
                id="refund-reason"
                required
                minLength={10}
                maxLength={1000}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </Field>
            <InlineError error={save.error ?? orders.error} />
            <Button type="submit" disabled={save.isPending}>
              Simpan permintaan
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(review)}
        onOpenChange={(open) => {
          if (!open) setReview(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {review?.status === 'APPROVED' ? 'Setujui refund' : 'Tolak refund'}
            </DialogTitle>
            <DialogDescription>
              Persetujuan mereservasi dana organizer. Belum ada pengembalian uang.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              decision.mutate();
            }}
          >
            <Field label="Catatan review" htmlFor="refund-note" required>
              <Textarea
                id="refund-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                minLength={5}
                maxLength={1000}
                required
              />
            </Field>
            <InlineError error={decision.error} />
            <Button type="submit" disabled={decision.isPending}>
              Simpan keputusan
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
