import {
  ArrowUpRight,
  Bell,
  ChevronRight,
  ChevronDown,
  LogOut,
  Menu,
  PanelLeftClose,
  Search,
} from 'lucide-react';
import { useState, useEffect, type ReactNode, type FormEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Logo } from '@/components/common/brand-logo';
import { UserAvatar } from '@/components/common/user-avatar';
import { RouteContent } from '@/components/common/route-content';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  notificationCategoryForMenu,
  useWorkspaceNotifications,
} from '@/lib/workspace-notifications';

export interface WorkspaceNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  group?: string;
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
  const [collapsed, setCollapsed] = useState(false);
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const creator =
    location.pathname.startsWith('/creator') || location.pathname.startsWith('/organizer');
  const logoVariant = creator ? 'creator' : 'admin';
  const base = creator ? '/creator' : '/admin';
  const notifications = useWorkspaceNotifications(base);

  const currentCategory =
    notificationCategoryForMenu(location.pathname + location.search) ??
    notificationCategoryForMenu(location.pathname);

  useEffect(() => {
    if (
      currentCategory &&
      notifications.data?.unreadByCategory &&
      (notifications.data.unreadByCategory[currentCategory] ?? 0) > 0
    ) {
      void api(`${base}/notifications/read-category`, {
        method: 'POST',
        body: { category: currentCategory },
      })
        .then(() => notifications.refetch())
        .catch(() => {});
    }
  }, [currentCategory, notifications.data?.unreadByCategory, base, notifications]);

  const current =
    nav.find((item) => item.to === location.pathname + location.search) ??
    nav
      .filter((item) => !item.to.includes('?') && location.pathname.startsWith(item.to))
      .sort((a, b) => b.to.length - a.to.length)[0];
  const groups = [...new Set(nav.map((item) => item.group ?? 'Workspace'))];
  function navigation(compact: boolean) {
    return (
      <nav className="space-y-5" aria-label={`Navigasi ${workspace}`}>
        {groups.map((group) => (
          <div key={group}>
            {!compact ? (
              <button
                type="button"
                className="mb-2 flex min-h-8 w-full items-center justify-between rounded px-3 text-left text-[11px] font-medium text-slate-500 whitespace-nowrap overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                aria-expanded={!closedGroups[group]}
                onClick={() =>
                  setClosedGroups((previous) => ({ ...previous, [group]: !previous[group] }))
                }
              >
                <span className="truncate whitespace-nowrap">{group}</span>
                {closedGroups[group] ? (
                  <ChevronRight className="size-3 shrink-0 ml-1" aria-hidden />
                ) : (
                  <ChevronDown className="size-3 shrink-0 ml-1" aria-hidden />
                )}
              </button>
            ) : null}
            <div className="space-y-1" hidden={!compact && closedGroups[group]}>
              {nav
                .filter((item) => (item.group ?? 'Workspace') === group)
                .map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setOpen(false)}
                    title={compact ? item.label : undefined}
                    className={({ isActive }) => {
                      const exactQuery = nav.some(
                        (entry) =>
                          entry.to.includes('?') &&
                          entry.to === location.pathname + location.search,
                      );
                      const queryMatch = item.to.includes('?')
                        ? item.to === location.pathname + location.search
                        : !exactQuery;
                      return cn(
                        'relative flex min-h-10 items-center gap-3 rounded-lg text-[13px] font-medium transition-all duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600',
                        !compact && 'px-3 py-2 hover:translate-x-1.5',
                        isActive && queryMatch
                          ? 'bg-blue-50 text-blue-800'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
                        compact && 'justify-center p-2 w-11 h-10 mx-auto',
                      );
                    }}
                  >
                    <item.icon className="size-[18px] shrink-0" aria-hidden />
                    <span
                      className={cn(
                        'whitespace-nowrap overflow-hidden transition-all duration-200',
                        compact ? 'sr-only w-0 opacity-0' : 'min-w-0 flex-1 truncate opacity-100',
                      )}
                    >
                      {item.label}
                    </span>
                    <UnreadBadge
                      count={
                        notifications.data?.unreadByCategory[
                          notificationCategoryForMenu(item.to) ?? ''
                        ] ?? 0
                      }
                      compact={compact}
                    />
                  </NavLink>
                ))}
            </div>
          </div>
        ))}
      </nav>
    );
  }
  function submitSearch(event: FormEvent) {
    event.preventDefault();
    navigate(`${base}/orders?q=${encodeURIComponent(search.trim())}`);
  }
  return (
    <div className="workspace-shell min-h-screen bg-slate-50">
      <a href="#workspace-content" className="skip-link">
        Langsung ke konten
      </a>
      <div className="flex min-h-screen">
        <aside
          className={cn(
            'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-slate-200 bg-white lg:flex transition-[width] duration-300 ease-in-out overflow-hidden',
            collapsed ? 'w-[88px]' : 'w-[260px]',
          )}
        >
          <div
            className={cn(
              'flex h-20 shrink-0 items-center transition-all duration-300',
              collapsed ? 'justify-center px-0' : 'justify-between px-4 gap-2',
            )}
          >
            {!collapsed ? (
              <>
                <Logo variant={logoVariant} className="max-w-[170px] truncate" />
                <button
                  type="button"
                  className="account-sidebar-toggle inline-flex size-11 shrink-0 items-center justify-center rounded-[9px] border border-slate-200 bg-white text-slate-600 shadow-xs hover:bg-slate-100 hover:text-slate-900 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                  aria-label="Ciutkan sidebar"
                  aria-expanded={true}
                  onClick={() => setCollapsed(true)}
                  title="Ciutkan sidebar"
                >
                  <PanelLeftClose className="size-5" aria-hidden />
                </button>
              </>
            ) : (
              <button
                type="button"
                className="group flex size-12 items-center justify-center rounded-xl hover:bg-slate-100 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                aria-label="Buka navigasi sidebar"
                aria-expanded={false}
                onClick={() => setCollapsed(false)}
                title="Klik untuk membuka sidebar"
              >
                <img
                  src="/assets/gofest-icon-192.png"
                  alt="Gofest"
                  className="size-9 object-contain transition-transform group-hover:scale-105"
                  width={36}
                  height={36}
                />
              </button>
            )}
          </div>
          <div
            data-workspace-sidebar-scroll
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-5"
          >
            {navigation(collapsed)}
          </div>
          <div className="shrink-0 border-t border-slate-200 p-3.5 transition-all duration-300">
            <Link
              to={`${base}/account/profile`}
              className={cn(
                'flex min-h-11 items-center gap-3 text-sm rounded-lg hover:bg-slate-50 transition-all duration-150',
                !collapsed && 'hover:translate-x-1',
                collapsed ? 'justify-center px-0' : 'px-2',
              )}
              title={user?.email}
            >
              <UserAvatar
                name={user?.name ?? ''}
                avatarKey={user?.avatarKey}
                className="size-8 shrink-0"
              />
              {!collapsed ? (
                <div className="min-w-0 overflow-hidden">
                  <p className="truncate font-medium text-slate-900 whitespace-nowrap">
                    {user?.name}
                  </p>
                  <p className="truncate text-xs text-slate-600 whitespace-nowrap">{workspace}</p>
                </div>
              ) : (
                <span className="sr-only">Profil akun</span>
              )}
            </Link>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex min-h-[76px] flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <button
                    aria-label="Buka navigasi workspace"
                    className="flex size-11 items-center justify-center rounded-lg border border-slate-200 lg:hidden"
                  >
                    <Menu className="size-5" aria-hidden />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[min(85vw,300px)] overflow-y-auto">
                  <Logo variant={logoVariant} className="mb-5" />
                  <SheetHeader>
                    <SheetTitle>{title}</SheetTitle>
                    <SheetDescription className="sr-only">
                      Navigasi halaman {workspace}
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6">{navigation(false)}</div>
                </SheetContent>
              </Sheet>
              <Logo variant={logoVariant} className="lg:hidden" />
              <div className="hidden min-w-0 sm:block">
                <p className="text-xs text-slate-500">{workspace}</p>
                <p className="mt-1 truncate text-sm font-medium text-slate-900">
                  {current?.label ?? title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                to={`${base}/account/profile`}
                aria-label="Profil akun"
                className="flex size-11 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <UserAvatar
                  name={user?.name ?? ''}
                  avatarKey={user?.avatarKey}
                  className="size-8"
                />
              </Link>
              {!creator ? (
                <form onSubmit={submitSearch} className="relative hidden xl:block">
                  <label htmlFor="workspace-search" className="sr-only">
                    Cari order ID
                  </label>
                  <Search className="absolute left-3 top-3 size-4 text-slate-400" aria-hidden />
                  <input
                    id="workspace-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-10 w-52 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm"
                    placeholder="Cari order ID…"
                  />
                  <button type="submit" className="sr-only">
                    Cari transaksi
                  </button>
                </form>
              ) : null}
              <Link
                to={`${base}/notifications`}
                className="relative flex size-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50"
                aria-label={`Notifikasi${notifications.data?.unread ? `, ${notifications.data.unread} belum dibaca` : ''}`}
              >
                <Bell className="size-5" aria-hidden />
                {notifications.data?.unread ? (
                  <UnreadBadge count={notifications.data.unread} compact />
                ) : null}
              </Link>
              <Link
                to="/"
                className="hidden min-h-11 items-center gap-1 text-xs font-medium text-slate-600 sm:flex"
              >
                Marketplace
                <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
              <button
                type="button"
                onClick={() => {
                  void logout().then(() => navigate('/login'));
                }}
                className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <LogOut className="size-4" aria-hidden />
                <span className="hidden sm:inline">Keluar</span>
                <span className="sr-only sm:hidden">Keluar</span>
              </button>
            </div>
          </header>
          <main
            id="workspace-content"
            tabIndex={-1}
            className="workspace-content mx-auto min-w-0 max-w-[1680px] px-4 py-7 focus:outline-none sm:px-6 lg:px-8 lg:py-8"
          >
            <RouteContent>{children}</RouteContent>
          </main>
        </div>
      </div>
    </div>
  );
}

function UnreadBadge({ count, compact = false }: { count: number; compact?: boolean }) {
  if (count === 0) return null;
  return (
    <span
      className={cn(
        'flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-700 px-1 text-[10px] font-semibold tabular-nums text-white',
        compact && 'absolute right-0 top-0',
      )}
      aria-label={`${count} notifikasi belum dibaca`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
