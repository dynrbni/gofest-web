import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { User, Ticket, Settings } from 'lucide-react';

const accountTabs = [
  { to: '/account', label: 'Ringkasan', icon: User, end: true },
  { to: '/account/orders', label: 'Pesanan saya', icon: Ticket, end: false },
  { to: '/account/profile', label: 'Profil & Akun', icon: Settings, end: false },
];

export function AccountLayout() {
  const { user } = useAuth();

  return (
    <main className="container max-w-5xl py-8 sm:py-12">
      <div className="border-b border-warm-border pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-olive">Akun pembeli</p>
        <h1 className="mt-2 font-display text-4xl leading-tight tracking-tightest sm:text-5xl">
          Halo, {user?.name ?? 'Pengguna'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>

        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Navigasi akun">
          {accountTabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-ink text-paper'
                    : 'bg-warm-muted/60 text-ink/80 hover:bg-warm-muted hover:text-ink',
                )
              }
            >
              <tab.icon className="h-4 w-4" aria-hidden />
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="py-8">
        <Outlet />
      </div>
    </main>
  );
}
