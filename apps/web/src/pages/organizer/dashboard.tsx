import {
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  FileText,
  Plus,
  Ticket,
  Users,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { formatIDR, formatNumber } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { useOrganizerDashboard } from '@/lib/queries';
import { QueryState, WorkspaceHeading } from '@/pages/workspace/workspace-components';

export function OrganizerDashboardPage() {
  useDocumentTitle('Dashboard Creator');
  const query = useOrganizerDashboard();
  const summary = query.data?.summary;
  const cards = summary
    ? [
        {
          label: 'Event Aktif',
          value: formatNumber(summary.activeEvents),
          unit: 'event',
          icon: CalendarDays,
          color: 'bg-blue-50 text-blue-700',
          to: '/creator/events?active=true',
        },
        {
          label: 'Event Draft',
          value: formatNumber(summary.draftEvents),
          unit: 'event',
          icon: FileText,
          color: 'bg-slate-100 text-slate-700',
          to: '/creator/events?status=DRAFT',
        },
        {
          label: 'Total Transaksi',
          value: formatNumber(summary.totalOrders),
          icon: CreditCard,
          color: 'bg-violet-50 text-violet-700',
        },
        {
          label: 'Total Tiket Terjual',
          value: formatNumber(summary.ticketsSold),
          unit: 'tiket',
          icon: Ticket,
          color: 'bg-orange-50 text-orange-700',
        },
        {
          label: 'Total Penjualan',
          value: formatIDR(summary.grossRevenue),
          icon: Wallet,
          color: 'bg-emerald-50 text-emerald-700',
        },
        {
          label: 'Total Pengunjung',
          value: formatNumber(summary.ticketsCheckedIn),
          unit: 'orang',
          icon: Users,
          color: 'bg-teal-50 text-teal-700',
          hint: 'Sudah check-in',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <WorkspaceHeading
        title="Dashboard Creator"
        description="Ringkasan seluruh event Anda."
        action={
          <Button asChild>
            <Link to="/creator/events/new">
              <Plus className="mr-2 size-4" aria-hidden />
              Buat event
            </Link>
          </Button>
        }
      />
      <QueryState query={query}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map(({ label, value, unit, icon: Icon, color, to, hint }) => (
            <section
              key={label}
              className="min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:px-5"
            >
              <div className="flex min-h-11 items-center gap-2.5">
                <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${color}`}>
                  <Icon className="size-4" aria-hidden />
                </span>
                <h2 className="text-sm font-medium text-slate-700">{label}</h2>
                {to ? (
                  <Link
                    to={to}
                    aria-label={`Detail ${label}`}
                    className="ml-auto inline-flex min-h-11 shrink-0 items-center gap-1 rounded px-1 text-sm font-medium text-primary hover:underline"
                  >
                    Detail <ArrowUpRight className="size-3.5" aria-hidden />
                  </Link>
                ) : null}
              </div>
              <div className="mt-2 border-t border-slate-100 py-3">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="break-all text-3xl font-semibold tabular-nums tracking-tight text-slate-950">
                    {value}
                  </span>
                  {unit ? <span className="text-sm text-slate-600">{unit}</span> : null}
                </p>
                {hint ? <p className="mt-1 text-xs text-slate-600">{hint}</p> : null}
              </div>
            </section>
          ))}
        </div>
      </QueryState>
    </div>
  );
}
