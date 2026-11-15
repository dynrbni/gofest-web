import { ArrowUpRight, LogOut, Menu, Ticket } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Logo } from '@/components/common/brand-logo';
import { RouteContent } from '@/components/common/route-content';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
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
  children?: ReactNode;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  const sidebar = (
    <nav className="flex flex-col gap-1.5" aria-label={`Navigasi ${workspace}`}>
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => setOpen(false)}
          className={({ isActive }) => cn('workspace-nav-item', isActive && 'workspace-nav-active')}
        >
          <item.icon className="size-[18px] shrink-0" aria-hidden />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
  return (
    <div className="workspace-shell min-h-screen bg-slate-50">
      <a href="#workspace-content" className="skip-link">
        Langsung ke konten
      </a>
      <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Buka navigasi workspace"
                className="flex size-11 items-center justify-center rounded-lg border border-slate-200 lg:hidden"
              >
                <Menu className="size-5" aria-hidden />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 overflow-y-auto">
              <Logo className="mb-6" />
              <SheetHeader>
                <SheetTitle>{title}</SheetTitle>
              </SheetHeader>
              <div className="mt-8">{sidebar}</div>
            </SheetContent>
          </Sheet>
          <Logo className="lg:hidden" />
          <span className="ml-3 hidden border-l border-slate-200 pl-5 text-sm font-medium text-slate-500 sm:inline lg:ml-0 lg:border-0 lg:pl-0">
            {workspace}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="hidden min-h-11 items-center gap-2 px-2 text-xs font-medium text-slate-600 hover:text-blue-700 sm:flex"
          >
            Lihat halaman publik
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => {
              void logout().then(() => navigate('/'));
            }}
            className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-700"
          >
            <LogOut className="size-4" aria-hidden />
            Keluar
          </button>
        </div>
      </header>
      <div className="flex">
        <aside className="sticky top-[76px] hidden h-[calc(100dvh-76px)] w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-7 lg:flex">
          <Logo className="mb-7 px-3" />
          <p className="mb-5 px-3 text-xs font-medium text-slate-500">{title}</p>
          {sidebar}
          <div className="mt-auto border-t border-slate-200 px-3 pt-5">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-medium text-blue-700">
                {user?.name.charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{user?.name}</p>
                <p className="mt-1 truncate text-[11px] text-slate-500">{user?.email}</p>
              </div>
            </div>
            <Link
              to="/account/orders"
              className="mt-4 flex min-h-10 items-center gap-2 text-xs font-medium text-blue-700"
            >
              <Ticket className="size-4" aria-hidden />
              Tiket & pesanan saya
            </Link>
          </div>
        </aside>
        <main
          id="workspace-content"
          tabIndex={-1}
          className="workspace-content min-w-0 flex-1 px-4 py-7 focus:outline-none sm:px-6 lg:px-9 lg:py-9"
        >
          <RouteContent>{children}</RouteContent>
        </main>
      </div>
    </div>
  );
}
