import { usePeriod, useWorkspace } from '@/pages/workspace/workspace-hooks';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { api } from '@/lib/api';
import { formatIDR, formatDateTime } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { EmptyState } from '@/components/common/states';
import {
  DataTable,
  Metric,
  Panel,
  QueryState,
  Status,
  WorkspaceHeading,
} from './workspace-components';
import type { AnalyticsData } from './workspace-models';

const compact = (value: number) =>
  new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
export function WorkspaceDashboardPage() {
  const { apiBase, base } = useWorkspace();
  useDocumentTitle('Dashboard Marketplace');
  const period = usePeriod();
  const query = useQuery({
    queryKey: ['workspace-analytics', apiBase, period.query],
    queryFn: () => api<AnalyticsData>(`${apiBase}/analytics`, { query: period.query }),
    enabled: period.enabled,
  });
  const data = query.data;
  return (
    <div className="space-y-7">
      <WorkspaceHeading
        title="Dashboard Marketplace"
        description="Pantau penjualan tiket, pendapatan layanan, dan pekerjaan operasional GOFEST."
      />
      {period.controls}
      <QueryState query={query}>
        {data ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Gross Ticket Sales"
                value={formatIDR(data.financial.grossTicketSales)}
                hint="Nilai tiket setelah diskon, sebelum refund"
              />
              <Metric
                label="Service Fee Revenue"
                value={formatIDR(data.financial.serviceFeeRevenue)}
                hint="Pendapatan layanan GOFEST, sebelum refund fee"
              />
              <Metric
                label="Tiket terjual"
                value={data.summary.ticketsSold.toLocaleString('id-ID')}
                hint="Tiket diterbitkan pada periode terpilih"
              />
              <Metric label="Total transaksi" value={data.summary.totalTransactions} />
              <Metric label="Acara aktif" value={data.summary.activeEvents} />
              <Metric
                label="Pengguna terdaftar"
                value={data.summary.registeredUsers ?? 0}
                hint="Pendaftaran pada periode terpilih"
              />
              <Metric
                label="Menunggu review event"
                value={data.summary.pendingEventApprovals}
                hint="Antrean saat ini"
              />
              <Metric
                label="Permintaan payout"
                value={data.summary.pendingPayouts}
                hint="Menunggu tinjauan admin"
              />
            </div>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
              <Panel
                title="Revenue Analytics"
                description="Penjualan tiket dan fee ditampilkan terpisah. Tidak termasuk pengurangan refund."
              >
                {data.trend.length ? (
                  <>
                    <div
                      className="h-72 w-full"
                      role="img"
                      aria-label="Grafik penjualan tiket dan service fee per hari"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={data.trend}
                          margin={{ left: 4, right: 12, top: 12, bottom: 4 }}
                        >
                          <CartesianGrid stroke="#e2e8f0" vertical={false} />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(value: string) => value.slice(5)}
                            tick={{ fontSize: 11 }}
                            minTickGap={28}
                          />
                          <YAxis tickFormatter={compact} width={58} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(value) => formatIDR(Number(value ?? 0))} />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="ticketSales"
                            name="Penjualan tiket"
                            stroke="#0052CC"
                            fill="#eff6ff"
                            strokeWidth={2}
                            isAnimationActive={false}
                          />
                          <Area
                            type="monotone"
                            dataKey="serviceFees"
                            name="Service fee"
                            stroke="#0f766e"
                            fill="#ccfbf1"
                            fillOpacity={0.3}
                            strokeWidth={2}
                            isAnimationActive={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <details className="mt-3 text-xs text-slate-600">
                      <summary className="cursor-pointer py-2">Lihat angka harian</summary>
                      <DataTable
                        caption="Data analytics harian"
                        headers={[
                          'Tanggal',
                          'Penjualan tiket',
                          'Service fee',
                          'Tiket',
                          'Transaksi',
                        ]}
                      >
                        {data.trend.map((day) => (
                          <tr key={day.date}>
                            <td>{day.date}</td>
                            <td>{formatIDR(day.ticketSales)}</td>
                            <td>{formatIDR(day.serviceFees)}</td>
                            <td>{day.tickets}</td>
                            <td>{day.transactions}</td>
                          </tr>
                        ))}
                      </DataTable>
                    </details>
                  </>
                ) : (
                  <EmptyState
                    title="Belum ada penjualan"
                    description="Grafik akan terisi saat ada transaksi dalam periode ini."
                  />
                )}
              </Panel>
              <Panel title="Status transaksi" description="Distribusi order pada periode terpilih.">
                <ul className="space-y-4">
                  {data.paymentDistribution.map((item) => (
                    <li key={item.status}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <Status value={item.status} />
                        <span className="font-medium tabular-nums">{item.count}</span>
                      </div>
                      <meter
                        className="mt-2 h-2 w-full accent-blue-700"
                        min={0}
                        max={Math.max(data.summary.totalTransactions, 1)}
                        value={item.count}
                        aria-label={`Jumlah ${item.status}`}
                      />
                    </li>
                  ))}
                </ul>
                {!data.paymentDistribution.length ? (
                  <p className="text-sm text-slate-600">Belum ada transaksi.</p>
                ) : null}
              </Panel>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <Panel
                title="Penjualan tiket & tren transaksi"
                description="Jumlah tiket terjual dan order per hari."
              >
                {data.trend.length ? (
                  <div className="h-64" role="img" aria-label="Grafik jumlah tiket dan transaksi">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.trend}>
                        <CartesianGrid stroke="#e2e8f0" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value: string) => value.slice(5)}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={35} />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="tickets"
                          name="Tiket"
                          fill="#0052CC"
                          radius={[3, 3, 0, 0]}
                          isAnimationActive={false}
                        />
                        <Bar
                          dataKey="transactions"
                          name="Transaksi"
                          fill="#94a3b8"
                          radius={[3, 3, 0, 0]}
                          isAnimationActive={false}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">Belum ada transaksi pada periode ini.</p>
                )}
              </Panel>
              <Panel
                title="Performa event"
                description="Diurutkan berdasarkan nilai penjualan tiket."
              >
                <div className="space-y-4">
                  {data.eventPerformance.map((event) => (
                    <div key={event.id}>
                      <div className="flex justify-between gap-4 text-sm">
                        <Link
                          to={`${base}/event-reports/${event.id}`}
                          className="truncate font-medium text-blue-700 hover:underline"
                        >
                          {event.title}
                        </Link>
                        <span className="shrink-0 tabular-nums">{formatIDR(event.sales)}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">{event.tickets} tiket terjual</p>
                    </div>
                  ))}
                  {!data.eventPerformance.length ? (
                    <p className="text-sm text-slate-600">
                      Belum ada event terjual pada periode ini.
                    </p>
                  ) : null}
                </div>
              </Panel>
            </div>
            <Panel
              title="Transaksi terbaru"
              action={
                <Link to={`${base}/orders`} className="text-sm font-medium text-blue-700">
                  Semua pesanan
                </Link>
              }
            >
              <DataTable
                caption="Transaksi terbaru"
                headers={['Order', 'Pemesan', 'Event', 'Total pembayaran', 'Status']}
              >
                {data.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link
                        to={`${base}/orders?orderId=${order.id}`}
                        className="font-medium text-blue-700"
                      >
                        {order.orderCode}
                      </Link>
                    </td>
                    <td>{order.buyerName}</td>
                    <td className="max-w-64 truncate">{order.event.title}</td>
                    <td>{formatIDR(order.total)}</td>
                    <td>
                      <Status value={order.status} />
                    </td>
                  </tr>
                ))}
              </DataTable>
              {!data.recentOrders.length ? (
                <p className="mt-4 text-sm text-slate-600">Belum ada pesanan pada periode ini.</p>
              ) : null}
            </Panel>
            <Panel
              title="Event menunggu review"
              description="Antrean pengajuan yang belum ditinjau, diurutkan dari yang terlama."
            >
              <ul className="divide-y divide-slate-100">
                {data.pendingEventReviews.map((event) => (
                  <li key={event.id} className="flex flex-wrap justify-between gap-3 py-3 text-sm">
                    <div>
                      <Link to={`${base}/events/${event.id}`} className="font-medium text-blue-700">
                        {event.title}
                      </Link>
                      <p className="mt-1 text-xs text-slate-600">
                        {event.organizer.organizationName} · {formatDateTime(event.startsAt)}
                      </p>
                    </div>
                    <Status value={event.status} />
                  </li>
                ))}
              </ul>
              {!data.pendingEventReviews.length ? (
                <p className="text-sm text-slate-600">
                  Tidak ada pengajuan event yang menunggu review.
                </p>
              ) : null}
            </Panel>
            <div className="grid gap-5 lg:grid-cols-2">
              <Panel
                title="Pengajuan & review event"
                action={
                  <Link to={`${base}/events`} className="text-sm font-medium text-blue-700">
                    Kelola event
                  </Link>
                }
              >
                <ul className="divide-y divide-slate-100">
                  {data.recentEvents.map((event) => (
                    <li
                      key={event.id}
                      className="flex flex-wrap items-start justify-between gap-3 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          className="font-medium text-blue-700"
                          to={`${base}/events/${event.id}`}
                        >
                          {event.title}
                        </Link>
                        <p className="mt-1 text-xs text-slate-600">
                          {formatDateTime(event.startsAt)}
                        </p>
                        {event.reviewNote ? (
                          <p className="mt-2 text-xs text-slate-700">{event.reviewNote}</p>
                        ) : null}
                      </div>
                      <Status value={event.status} />
                    </li>
                  ))}
                </ul>
                {!data.recentEvents.length ? (
                  <p className="text-sm text-slate-600">Belum ada acara.</p>
                ) : null}
              </Panel>
              <Panel
                title="Permintaan payout tertunda"
                action={
                  <Link to={`${base}/payouts`} className="text-sm font-medium text-blue-700">
                    Lihat payout
                  </Link>
                }
              >
                <p className="mb-4 text-xs leading-5 text-slate-600">
                  Persetujuan internal menunggu integrasi provider. Belum ada transfer dana.
                </p>
                <ul className="divide-y divide-slate-100">
                  {data.pendingPayouts.map((payout) => (
                    <li key={payout.id} className="flex justify-between gap-3 py-3 text-sm">
                      <span>{payout.organizer.organizationName}</span>
                      <span className="font-medium tabular-nums">{formatIDR(payout.amount)}</span>
                    </li>
                  ))}
                </ul>
                {!data.pendingPayouts.length ? (
                  <p className="text-sm text-slate-600">Tidak ada permintaan yang menunggu.</p>
                ) : null}
              </Panel>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <Panel title="Permintaan refund terbaru">
                <ul className="space-y-3">
                  {data.recentRefunds.map((refund) => (
                    <li key={refund.id} className="flex flex-wrap justify-between gap-2 text-sm">
                      <span>
                        {refund.order.orderCode} · {formatIDR(refund.amount)}
                      </span>
                      <Status value={refund.status} />
                    </li>
                  ))}
                  {!data.recentRefunds.length ? (
                    <li className="text-sm text-slate-600">Belum ada permintaan refund.</li>
                  ) : null}
                </ul>
              </Panel>
              <Panel title="Aktivitas operasional admin">
                <ul className="space-y-4">
                  {data.recentActivities.map((activity) => (
                    <li key={activity.id} className="text-sm">
                      <p>{activity.action.replaceAll('_', ' ')}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {activity.actor?.name ?? 'Sistem'} · {formatDateTime(activity.createdAt)}
                      </p>
                    </li>
                  ))}
                  {!data.recentActivities.length ? (
                    <li className="text-sm text-slate-600">Belum ada aktivitas.</li>
                  ) : null}
                </ul>
              </Panel>
            </div>
          </>
        ) : null}
      </QueryState>
    </div>
  );
}
