import { NavLink } from 'react-router-dom';
import { Settings, Ticket, User } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { RouteContent } from '@/components/common/route-content';

const tabs = [
  { to: '/account', label: 'Ringkasan', icon: User, end: true },
  { to: '/account/orders', label: 'Tiket & pesanan', icon: Ticket, end: false },
  { to: '/account/profile', label: 'Pengaturan profil', icon: Settings, end: false },
];
export function AccountLayout() {
  const { user } = useAuth();
  return (
    <main className="bg-slate-50/60">
      <div className="container max-w-6xl py-8 sm:py-10">
        <header className="account-welcome">
          <div>
            <p className="text-xs font-medium text-blue-700">Akun Gofest</p>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
              Halo, {user?.name ?? 'teman Gofest'}!
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Tiket, pesanan, dan cerita berikutnya. Semuanya di sini.
            </p>
          </div>
          <span className="hidden size-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 sm:flex">
            <Ticket className="size-8" aria-hidden />
          </span>
        </header>
        <nav
          className="mt-7 flex gap-5 overflow-x-auto border-b border-slate-200"
          aria-label="Navigasi akun"
        >
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-1 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-blue-700',
                )
              }
            >
              <tab.icon className="size-4" aria-hidden />
              {tab.label}
            </NavLink>
          ))}
        </nav>
        <div className="py-7">
          <RouteContent />
        </div>
      </div>
    </main>
  );
}
