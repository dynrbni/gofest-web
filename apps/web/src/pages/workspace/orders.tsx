import { useWorkspace } from '@/pages/workspace/workspace-hooks';
import { useState } from 'react';
import { useSearchParams, useLocation, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '@gofest/shared';
import { toast } from 'sonner';
import { api, apiPage } from '@/lib/api';
import { formatIDR, formatDateTime } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Field, InlineError } from '@/components/common/states';
import { Pagination } from '@/components/common/pagination';
import { DataTable, Panel, QueryState, Status, WorkspaceHeading } from './workspace-components';
import type { WorkspaceOrder } from './workspace-models';

interface OrderDetail extends WorkspaceOrder {
  items: {
    id: string;
    ticketNameSnapshot: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  payments: {
    id: string;
    provider: string;
    method: string | null;
    status: string;
    amount: number;
    createdAt: string;
  }[];
  history?: { id: string; action: string; createdAt: string }[];
}
export function WorkspaceOrdersPage() {
  const { creator, apiBase } = useWorkspace();
  const { id: eventId } = useParams<{ id: string }>();
  const payments = useLocation().pathname.endsWith('/payments');
  const [params, setParams] = useSearchParams();
  const client = useQueryClient();
  const selected = params.get('orderId');
  const [reviewAction, setReview] = useState('ISSUE_TICKETS');
  const [note, setNote] = useState('');
  const page = Math.max(1, Number(params.get('page') ?? 1));
  const filters = Object.fromEntries(
    ['q', 'status', 'eventId', 'organizerId', 'paymentStatus'].map((field) => [
      field,
      params.get(field) ?? '',
    ]),
  );
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  function filter(field: string, value: string) {
    const next = new URLSearchParams(params);
    next.delete('page');
    if (value) next.set(field, value);
    else next.delete(field);
    setParams(next, { replace: true });
  }
  function selectOrder(orderId?: string) {
    const next = new URLSearchParams(params);
    if (orderId) next.set('orderId', orderId);
    else next.delete('orderId');
    setParams(next, { replace: true });
  }
  const query = useQuery({
    queryKey: ['workspace-orders', apiBase, eventId, filters, page, from, to],
    queryFn: () =>
      apiPage<WorkspaceOrder>(`${apiBase}/orders`, {
        query: {
          ...filters,
          eventId: eventId ?? filters.eventId,
          page,
          from: from ? new Date(`${from}T00:00:00+07:00`).toISOString() : undefined,
          to: to ? new Date(`${to}T23:59:59.999+07:00`).toISOString() : undefined,
        },
      }),
  });
  const events = useQuery({
    queryKey: ['workspace-event-options', apiBase],
    queryFn: () =>
      apiPage<{ id: string; title: string }>(`${apiBase}/events`, { query: { limit: 100 } }),
    enabled: !eventId,
  });
  const organizers = useQuery({
    queryKey: ['workspace-organizer-options'],
    queryFn: () =>
      apiPage<{ id: string; organizationName: string }>('/admin/organizers', {
        query: { limit: 100 },
      }),
    enabled: !creator,
  });
  const detail = useQuery({
    queryKey: ['workspace-order', apiBase, eventId, selected],
    queryFn: () =>
      api<{ order: OrderDetail }>(`${apiBase}/orders/${selected}`, { query: { eventId } }),
    enabled: Boolean(selected),
  });
  const resolve = useMutation({
    mutationFn: () =>
      api(`${apiBase}/orders/${selected}/payment-review/resolve`, {
        method: 'POST',
        body: { action: reviewAction, note },
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['workspace-order'] });
      void client.invalidateQueries({ queryKey: ['workspace-orders'] });
      void client.invalidateQueries({ queryKey: ['workspace-analytics'] });
      toast.success('Review pembayaran disimpan');
    },
  });
  const order = detail.data?.order;
  return (
    <div className="space-y-6">
      {eventId ? (
        <h2 className="text-xl font-semibold text-ink">Pesanan</h2>
      ) : (
        <WorkspaceHeading
          title={payments ? 'Pembayaran' : 'Semua pesanan'}
          description="Telusuri pesanan, rincian pembayaran, dan riwayat status di marketplace."
        />
      )}
      <Panel title="Filter transaksi">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Cari order ID / customer" htmlFor="order-search">
            <Input
              id="order-search"
              value={filters.q}
              onChange={(event) => filter('q', event.target.value)}
            />
          </Field>
          <Field label="Status order" htmlFor="order-status">
            <select
              id="order-status"
              value={filters.status}
              onChange={(event) => filter('status', event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">Semua status</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </Field>
          {!eventId && (
            <Field label="Event" htmlFor="order-event">
              <select
                id="order-event"
                value={filters.eventId}
                onChange={(event) => filter('eventId', event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">Semua event</option>
                {events.data?.data.map((event) => (
                  <option value={event.id} key={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {!creator ? (
            <Field label="Organizer" htmlFor="order-organizer">
              <select
                id="order-organizer"
                value={filters.organizerId}
                onChange={(event) => filter('organizerId', event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">Semua organizer</option>
                {organizers.data?.data.map((organizer) => (
                  <option value={organizer.id} key={organizer.id}>
                    {organizer.organizationName}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <Field label="Status pembayaran" htmlFor="payment-status">
            <select
              id="payment-status"
              value={filters.paymentStatus}
              onChange={(event) => filter('paymentStatus', event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">Semua pembayaran</option>
              {PAYMENT_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dari tanggal" htmlFor="orders-from">
              <Input
                type="date"
                id="orders-from"
                value={from}
                onChange={(event) => filter('from', event.target.value)}
              />
            </Field>
            <Field label="Sampai tanggal" htmlFor="orders-to">
              <Input
                type="date"
                id="orders-to"
                min={from}
                value={to}
                onChange={(event) => filter('to', event.target.value)}
              />
            </Field>
          </div>
        </div>
      </Panel>
      <QueryState query={query} empty={query.data?.data.length === 0}>
        <DataTable
          caption="Daftar pesanan"
          headers={[
            'Order ID',
            'Customer',
            'Event',
            'Harga tiket',
            'Service fee',
            'Total pembayaran',
            'Status',
            'Tanggal',
            'Aksi',
          ]}
        >
          {query.data?.data.map((order) => (
            <tr key={order.id}>
              <td className="font-medium">{order.orderCode}</td>
              <td>
                {order.buyerName}
                <span className="block text-xs text-slate-600">{order.buyerEmail}</span>
              </td>
              <td className="max-w-60 truncate">{order.event.title}</td>
              <td>{formatIDR((order.subtotal ?? 0) - (order.discount ?? 0))}</td>
              <td>{formatIDR(order.platformFee ?? 0)}</td>
              <td>{formatIDR(order.total)}</td>
              <td>
                <Status value={order.status} />
              </td>
              <td>{formatDateTime(order.createdAt)}</td>
              <td>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    selectOrder(order.id);
                    resolve.reset();
                  }}
                >
                  Detail
                </Button>
              </td>
            </tr>
          ))}
        </DataTable>
        <Pagination
          meta={query.data?.meta}
          onPageChange={(page) => {
            const next = new URLSearchParams(params);
            next.set('page', String(page));
            setParams(next);
          }}
        />
      </QueryState>
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) selectOrder();
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail transaksi</DialogTitle>
            <DialogDescription>
              Snapshot harga saat checkout, pembayaran, dan aktivitas order.
            </DialogDescription>
          </DialogHeader>
          <QueryState query={detail}>
            {order ? (
              <div className="space-y-5">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-medium">{order.orderCode}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {order.buyerName} · {order.buyerEmail}
                    </p>
                  </div>
                  <Status value={order.status} />
                </div>
                <p className="text-sm">{order.event.title}</p>
                <DataTable
                  caption="Rincian tiket pesanan"
                  headers={['Tiket', 'Jumlah', 'Harga satuan', 'Subtotal']}
                >
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.ticketNameSnapshot}</td>
                      <td>{item.quantity}</td>
                      <td>{formatIDR(item.unitPrice)}</td>
                      <td>{formatIDR(item.lineTotal)}</td>
                    </tr>
                  ))}
                </DataTable>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <dt>Diskon</dt>
                  <dd className="text-right">{formatIDR(order.discount ?? 0)}</dd>
                  <dt>Service fee</dt>
                  <dd className="text-right">{formatIDR(order.platformFee ?? 0)}</dd>
                  <dt className="font-medium">Total pembayaran</dt>
                  <dd className="text-right font-medium">{formatIDR(order.total)}</dd>
                </dl>
                <h3 className="text-sm font-semibold">Pembayaran</h3>
                {order.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <span>
                      {payment.provider} · {payment.method ?? 'Metode belum tersedia'} ·{' '}
                      {formatIDR(payment.amount)}
                    </span>
                    <Status value={payment.status} />
                  </div>
                ))}
                {!order.payments.length ? (
                  <p className="text-sm text-slate-600">Belum ada pembayaran.</p>
                ) : null}
                <h3 className="text-sm font-semibold">Riwayat status</h3>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li>{formatDateTime(order.createdAt)} · Order dibuat</li>
                  {order.history?.map((entry) => (
                    <li key={entry.id}>
                      {formatDateTime(entry.createdAt)} · {entry.action.replaceAll('_', ' ')}
                    </li>
                  ))}
                </ul>
                {!creator && order.status === 'PAYMENT_REVIEW' ? (
                  <form
                    className="space-y-3 border-t pt-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      resolve.mutate();
                    }}
                  >
                    <Field label="Keputusan review" htmlFor="review-action">
                      <select
                        id="review-action"
                        value={reviewAction}
                        onChange={(event) => setReview(event.target.value)}
                        className="h-11 w-full rounded-lg border border-slate-300 px-3"
                      >
                        <option value="ISSUE_TICKETS">Terbitkan tiket</option>
                        <option value="REFUND">Tandai untuk refund</option>
                      </select>
                    </Field>
                    <Field label="Catatan review" htmlFor="review-note" required>
                      <Textarea
                        id="review-note"
                        value={note}
                        required
                        minLength={10}
                        maxLength={1000}
                        onChange={(event) => setNote(event.target.value)}
                      />
                    </Field>
                    <InlineError error={resolve.error} />
                    <Button type="submit" disabled={resolve.isPending}>
                      Simpan keputusan
                    </Button>
                  </form>
                ) : null}
              </div>
            ) : null}
          </QueryState>
        </DialogContent>
      </Dialog>
    </div>
  );
}
