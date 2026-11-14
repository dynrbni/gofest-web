import { LogOut, Menu, Ticket, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, ScrollRestoration, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

export interface WorkspaceNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export function WorkspaceLayout({
  workspace,
  title,
  nav,
  children,
}: {
  workspace: string;
  title: string;
  nav: WorkspaceNavItem[];
  children?: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [navigate]);

  const sidebar = (
    <nav className="flex flex-col gap-1" aria-label={`Navigasi ${workspace}`}>
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all',
              isActive
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            )
          }
        >
          <item.icon className="h-4 w-4 shrink-0" aria-hidden />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50/60">
      <ScrollRestoration />
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 lg:hidden"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-label={open ? 'Tutup navigasi' : 'Buka navigasi'}
            >
              {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Ticket className="h-4 w-4" />
              </div>
              <span className="text-xl font-black tracking-tight text-slate-900">GOFEST</span>
            </Link>
            <span className="hidden rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 sm:inline">
              {workspace}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/"
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Lihat Publik
            </Link>
            <span className="hidden max-w-[180px] truncate text-xs text-slate-500 sm:inline">
              {user?.email}
            </span>
            <button
              type="button"
              onClick={() => {
                void logout().then(() => navigate('/'));
              }}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-rose-600 hover:bg-rose-50"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Keluar
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-6 lg:block min-h-[calc(100vh-4rem)]">
          <p className="px-3 pb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
          {sidebar}
        </aside>

        {open ? (
          <div className="fixed inset-x-0 top-16 z-20 border-b border-slate-200 bg-white p-4 shadow-xl lg:hidden">
            <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
            {sidebar}
          </div>
        ) : null}

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}
