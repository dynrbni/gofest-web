import { Link } from 'react-router-dom';
import { ArrowRight, Ticket, Calendar, ShieldCheck, Mail, Phone } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useAccountOrders } from '@/lib/queries';
import { useDocumentTitle } from '@/lib/hooks';
import { formatDateTime, formatIDR } from '@/lib/format';
import { OrderStatusBadge } from '@/components/common/status-badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states';

export function AccountOverviewPage() {
  useDocumentTitle('Ringkasan Akun');
  const { user } = useAuth();
  const ordersQuery = useAccountOrders(1, 3);
  const orders = ordersQuery.data?.data ?? [];

  return (
    <div className="space-y-10">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-md border border-warm-border bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-olive">Nama Lengkap</p>
          <p className="mt-2 text-base font-medium text-ink">{user?.name}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-olive" aria-hidden />
            Peran: {user?.roles?.join(', ') || 'Pembeli'}
          </p>
        </div>

        <div className="rounded-md border border-warm-border bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-olive">Email Terdaftar</p>
          <p className="mt-2 flex items-center gap-1.5 truncate text-base font-medium text-ink">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{user?.email}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Tautan tiket dikirim ke alamat ini</p>
        </div>

        <div className="rounded-md border border-warm-border bg-card p-5 sm:col-span-2 lg:col-span-1">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-olive">Nomor Kontak</p>
          <p className="mt-2 flex items-center gap-1.5 text-base font-medium text-ink">
            <Phone className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            {user?.phone ? user.phone : 'Belum diisi'}
          </p>
          <Link
            to="/account/profile"
            className="mt-1 inline-block text-xs font-medium text-brick underline underline-offset-4 hover:text-brick/90"
          >
            Perbarui di profil
          </Link>
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between border-b border-warm-border pb-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-ink">Pesanan Terbaru</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Tiga pesanan tiket terakhir di akunmu</p>
          </div>
          <Link
            to="/account/orders"
            className="inline-flex items-center gap-1 text-sm font-medium text-brick hover:underline hover:underline-offset-4"
          >
            Lihat semua pesanan
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <div className="mt-6">
          {ordersQuery.isLoading ? (
            <LoadingState rows={3} label="Memuat pesanan terbaru" />
          ) : ordersQuery.isError ? (
            <ErrorState error={ordersQuery.error} onRetry={() => void ordersQuery.refetch()} />
          ) : orders.length === 0 ? (
            <EmptyState
              title="Belum ada transaksi"
              description="Kamu belum memesan tiket acara apapun. Mulai jelajahi acara yang tersedia."
              action={
                <Link
                  to="/events"
                  className="inline-flex h-9 items-center justify-center rounded-md bg-brick px-4 text-xs font-medium text-paper hover:bg-brick/90"
                >
                  Jelajahi Acara
                </Link>
              }
            />
          ) : (
            <div className="divide-y divide-warm-border rounded-md border border-warm-border bg-card">
              {orders.map((order) => (
                <article
                  key={order.id}
                  className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-medium tracking-wide text-ink">
                        {order.orderCode}
                      </span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <h3 className="text-base font-semibold text-ink">
                      {order.event?.title ?? 'Acara Gofest'}
                    </h3>
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" aria-hidden />
                      Dipesan pada {formatDateTime(order.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center">
                    <p className="text-base font-medium tabular-nums text-ink">
                      {formatIDR(order.total)}
                    </p>
                    <Link
                      to={`/account/orders/${order.id}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-ink/20 bg-paper px-3 py-1.5 text-xs font-medium text-ink hover:bg-warm-muted"
                    >
                      <Ticket className="h-3.5 w-3.5" aria-hidden />
                      Rincian tiket
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
