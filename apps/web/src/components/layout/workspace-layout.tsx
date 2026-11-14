import { LogOut, Menu, X } from 'lucide-react';
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
    <nav className="flex flex-col gap-0.5" aria-label={`Navigasi ${workspace}`}>
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-semibold transition-colors',
              isActive
                ? 'bg-ink text-paper'
                : 'text-ink/75 hover:bg-warm-muted hover:text-ink',
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
    <div className="min-h-screen bg-paper">
      <ScrollRestoration />
      <header className="sticky top-0 z-30 border-b border-warm-border bg-paper/95 backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between gap-3 px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-warm-border lg:hidden"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-label={open ? 'Tutup navigasi' : 'Buka navigasi'}
            >
              {open ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
            </button>
            <Link to="/" className="font-display text-xl leading-none tracking-tightest">
              Gofest
            </Link>
            <span className="hidden text-xs font-semibold uppercase tracking-[0.12em] text-olive sm:inline">
              {workspace}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="rounded-md px-2 py-1.5 text-xs font-semibold hover:bg-warm-muted">
              Lihat situs
            </Link>
            <span className="hidden max-w-[180px] truncate text-xs text-muted-foreground sm:inline">
              {user?.email}
            </span>
            <button
              type="button"
              onClick={() => {
                void logout().then(() => navigate('/'));
              }}
              className="flex h-8 items-center gap-1.5 rounded-md border border-warm-border px-2 text-xs font-semibold hover:bg-warm-muted"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Keluar
            </button>
          </div>
        </div>
      </header>
      <div className="flex">
        <aside className="hidden w-60 shrink-0 border-r border-warm-border px-3 py-5 lg:block">
          <p className="px-3 pb-2 text-xs font-bold uppercase tracking-[0.12em]">{title}</p>
          {sidebar}
        </aside>
        {open ? (
          <div className="fixed inset-x-0 top-14 z-20 border-b border-warm-border bg-paper p-3 shadow-lg lg:hidden">
            <p className="px-3 pb-2 text-xs font-bold uppercase tracking-[0.12em]">{title}</p>
            {sidebar}
          </div>
        ) : null}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}