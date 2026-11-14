import { Link } from 'react-router-dom';
import { Plus, Ticket, DollarSign, Calendar, Users, ArrowRight } from 'lucide-react';
import { useOrganizerDashboard } from '@/lib/queries';
import { useDocumentTitle } from '@/lib/hooks';
import { formatDateTime, formatIDR } from '@/lib/format';
import { OrderStatusBadge } from '@/components/common/status-badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states';
import { Button } from '@/components/ui/button';

export function OrganizerDashboardPage() {
  useDocumentTitle('Dashboard Organizer');
  const dashboardQuery = useOrganizerDashboard();
  const data = dashboardQuery.data;

  if (dashboardQuery.isLoading) {
    return <LoadingState rows={4} label="Memuat ringkasan organizer" />;
  }

  if (dashboardQuery.isError || !data) {
    return (
      <ErrorState
        error={dashboardQuery.error ?? new Error('Gagal memuat data')}
        onRetry={() => void dashboardQuery.refetch()}
      />
    );
  }

  const { summary, recentOrders } = data;
  const attendanceRate =
    summary.quotaTotal > 0
      ? (summary.ticketsCheckedIn / Math.max(1, summary.ticketsSold)) * 100
      : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-warm-border pb-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-olive">Workspace</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tightest sm:text-4xl">
            Ringkasan Penjualan & Acara
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Data aktual dari seluruh transaksi dan kehadiran acara organisasimu
          </p>
        </div>

        <Link
          to="/organizer/events/new"
          className="inline-flex items-center gap-2 rounded-md bg-brick px-4 py-2 text-sm font-semibold text-paper shadow-sm transition-colors hover:bg-brick/90"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Buat Acara Baru
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-warm-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-olive">Gross Sales</span>
            <DollarSign className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
          <p className="mt-3 text-2xl font-bold tabular-nums text-ink">
            {formatIDR(summary.grossRevenue ?? 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Total omset tiket terkonfirmasi</p>
        </div>

        <div className="rounded-md border border-warm-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-olive">Tiket Terjual</span>
            <Ticket className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
          <p className="mt-3 text-2xl font-bold tabular-nums text-ink">
            {summary.ticketsSold ?? 0}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Tiket lunas diterbitkan</p>
        </div>

        <div className="rounded-md border border-warm-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-olive">Acara Terbit</span>
            <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
          <p className="mt-3 text-2xl font-bold tabular-nums text-ink">
            {summary.publishedEvents ?? 0}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Dari total {summary.totalEvents ?? 0} acara dibuat</p>
        </div>

        <div className="rounded-md border border-warm-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-olive">Kehadiran</span>
            <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
          <p className="mt-3 text-2xl font-bold tabular-nums text-ink">
            {summary.ticketsCheckedIn ?? 0}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              ({Math.round(attendanceRate)}%)
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Tiket telah dipindai di pintu</p>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold tracking-tight text-ink">Pesanan Terbaru</h2>
          <Link
            to="/organizer/events"
            className="text-xs font-semibold text-brick hover:underline hover:underline-offset-4"
          >
            Buka kelola acara
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <EmptyState
            title="Belum ada pesanan masuk"
            description="Acara yang kamu terbitkan belum memiliki transaksi. Buat acara baru atau bagikan link ke calon pembeli."
            action={
              <Link
                to="/organizer/events/new"
                className="inline-flex h-9 items-center justify-center rounded-md bg-brick px-4 text-xs font-semibold text-paper hover:bg-brick/90"
              >
                Buat Acara Baru
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-warm-border bg-card">
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
        )}
      </div>
    </div>
  );
}
