import { Link } from 'react-router-dom';
import { DollarSign, Calendar, Users, Building2, AlertCircle } from 'lucide-react';
import { useAdminDashboard } from '@/lib/queries';
import { useDocumentTitle } from '@/lib/hooks';
import { formatDateTime, formatIDR } from '@/lib/format';
import { OrderStatusBadge } from '@/components/common/status-badge';
import { ErrorState, LoadingState } from '@/components/common/states';

export function AdminOverviewPage() {
  useDocumentTitle('Platform Overview · Super Admin');
  const dashboardQuery = useAdminDashboard();
  const data = dashboardQuery.data;

  if (dashboardQuery.isLoading) {
    return <LoadingState rows={4} label="Memuat ringkasan admin" />;
  }

  if (dashboardQuery.isError || !data) {
    return (
      <ErrorState
        error={dashboardQuery.error ?? new Error('Gagal memuat ringkasan')}
        onRetry={() => void dashboardQuery.refetch()}
      />
    );
  }

  const { orders, users, organizers, events, recentOrders, reviewOrders } = data;

  return (
    <div className="space-y-8">
      <div className="border-b border-warm-border pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-olive">Super Admin</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tightest sm:text-4xl">
          Operasional Platform Gofest
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Ringkasan aktivitas transaksi, moderasi event, dan pengguna di seluruh platform
        </p>
      </div>

      {/* Moderation Alerts Banner */}
      {organizers.pending > 0 || events.pendingReview > 0 || reviewOrders.length > 0 ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 space-y-2">
          <p className="font-bold flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-amber-700" aria-hidden />
            Perlu Tindakan Moderasi:
          </p>
          <div className="flex flex-wrap gap-4 pt-1">
            {organizers.pending > 0 ? (
              <Link to="/admin/organizers" className="underline font-semibold hover:text-amber-950">
                {organizers.pending} pengajuan organizer menunggu persetujuan
              </Link>
            ) : null}
            {events.pendingReview > 0 ? (
              <Link to="/admin/events" className="underline font-semibold hover:text-amber-950">
                {events.pendingReview} acara menunggu moderasi publikasi
              </Link>
            ) : null}
            {reviewOrders.length > 0 ? (
              <Link to="/admin/orders" className="underline font-semibold hover:text-amber-950">
                {reviewOrders.length} transaksi pembayaran dalam review
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-warm-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-olive">
              Gross Revenue
            </span>
            <DollarSign className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
          <p className="mt-3 text-2xl font-bold tabular-nums text-ink">
            {formatIDR(orders.grossRevenue ?? 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Dari {orders.paid ?? 0} order terbayar lunas
          </p>
        </div>

        <div className="rounded-md border border-warm-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-olive">
              Acara Terbit
            </span>
            <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
          <p className="mt-3 text-2xl font-bold tabular-nums text-ink">{events.published ?? 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Total {events.total ?? 0} acara di sistem
          </p>
        </div>

        <div className="rounded-md border border-warm-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-olive">
              Organizer Aktif
            </span>
            <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
          <p className="mt-3 text-2xl font-bold tabular-nums text-ink">{organizers.active ?? 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Total {organizers.total ?? 0} terdaftar
          </p>
        </div>

        <div className="rounded-md border border-warm-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-olive">
              Pengguna Terdaftar
            </span>
            <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
          <p className="mt-3 text-2xl font-bold tabular-nums text-ink">{users.total ?? 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {users.active ?? 0} aktif · {users.suspended ?? 0} disuspend
          </p>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold tracking-tight text-ink">Transaksi Terbaru Platform</h2>
          <Link
            to="/admin/orders"
            className="text-xs font-semibold text-brick hover:underline hover:underline-offset-4"
          >
            Lihat semua transaksi
          </Link>
        </div>

        <div
          tabIndex={0}
          role="region"
          aria-label="Transaksi terbaru"
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
                <th className="px-4 py-3">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border text-ink">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-warm-muted/20">
                  <td className="px-4 py-3 font-mono font-bold">{order.orderCode}</td>
                  <td className="px-4 py-3 font-medium">{order.event?.title ?? '-'}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{order.buyerName}</p>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
