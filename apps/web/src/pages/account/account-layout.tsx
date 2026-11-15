import { NavLink } from 'react-router-dom';
import { ReceiptText, Ticket, User } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { RouteContent } from '@/components/common/route-content';
import { useLanguage } from '@/lib/language';

export function AccountLayout() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const tabs = [
    { to: '/account/profile', label: t('Profil Saya', 'My Profile'), icon: User },
    { to: '/account/orders', label: t('Transaksi Saya', 'My Transactions'), icon: ReceiptText },
    { to: '/account/tickets', label: t('Tiket Saya', 'My Tickets'), icon: Ticket },
  ];
  return (
    <main className="bg-slate-50/60">
      <div className="container max-w-6xl py-8 sm:py-10">
        <header className="account-welcome">
          <div>
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
