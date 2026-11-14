import { Menu, Search, Ticket, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const publicLinks = [
  { to: '/events', label: 'Jelajah acara' },
  { to: '/events?price=free', label: 'Acara gratis' },
];

function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('inline-flex items-baseline gap-1.5', className)} aria-label="Gofest, ke beranda">
      <span className="font-display text-2xl leading-none tracking-tightest">Gofest</span>
      <span className="mb-0.5 h-1.5 w-1.5 rounded-full bg-vermilion" aria-hidden />
    </Link>
  );
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function workspaceLink(roles: string[]) {
  if (roles.includes('ADMIN')) return { to: '/admin', label: 'Panel admin' };
  if (roles.includes('ORGANIZER')) return { to: '/organizer', label: 'Workspace organizer' };
  if (roles.includes('STAFF')) return { to: '/staff/events', label: 'Scanner check-in' };
  return { to: '/organizer/apply', label: 'Jadi organizer' };
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const workspace = user ? workspaceLink(user.roles) : null;

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          to="/login"
          className="rounded-md px-3 py-2 text-sm font-semibold hover:bg-warm-muted"
        >
          Masuk
        </Link>
        <Link
          to="/register"
          className="hidden rounded-md bg-ink px-3 py-2 text-sm font-semibold text-paper hover:bg-ink/90 sm:inline-flex"
        >
          Daftar
        </Link>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/20 bg-warm-muted text-xs font-bold"
          aria-label={`Menu akun ${user.name}`}
        >
          {initials(user.name)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 border-warm-border bg-paper">
        <DropdownMenuLabel>
          <span className="block text-sm font-bold">{user.name}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/account')}>Akun saya</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/account/orders')}>Pesanan saya</DropdownMenuItem>
        {workspace ? (
          <DropdownMenuItem onSelect={() => navigate(workspace.to)}>{workspace.label}</DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void logout().then(() => navigate('/'));
          }}
        >
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileMenu() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="public-mobile-menu"
        className="flex h-9 w-9 items-center justify-center rounded-md border border-warm-border"
      >
        {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        <span className="sr-only">{open ? 'Tutup menu' : 'Buka menu'}</span>
      </button>
      {open ? (
        <div
          id="public-mobile-menu"
          className="absolute inset-x-0 top-full z-40 border-b border-warm-border bg-paper px-4 pb-5 pt-2 shadow-lg"
        >
          <nav className="flex flex-col" aria-label="Navigasi utama">
            {publicLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className="border-b border-warm-border py-3 text-base font-semibold"
              >
                {link.label}
              </NavLink>
            ))}
            <Link to="/account/orders" className="border-b border-warm-border py-3 text-base font-semibold">
              Pesanan saya
            </Link>
            <Link
              to="/organizer/apply"
              className="border-b border-warm-border py-3 text-base font-semibold"
            >
              Jadi organizer
            </Link>
            <Link to="/login" className="py-3 text-base font-semibold text-brick">
              Masuk atau daftar
            </Link>
          </nav>
        </div>
      ) : null}
    </div>
  );
}

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollRestoration />
      <header className="relative z-30 border-b border-warm-border bg-paper/95 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-7">
            <Logo />
            <nav className="hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
              {publicLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-md px-3 py-2 text-sm font-semibold transition-colors hover:bg-warm-muted',
                      isActive && link.to === '/events' ? 'bg-warm-muted' : '',
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              <Link
                to="/events"
                className="rounded-md px-3 py-2 text-sm font-semibold transition-colors hover:bg-warm-muted"
              >
                <Search className="mr-1 inline h-4 w-4" aria-hidden />
                Cari
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/account/orders"
              className="hidden items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold hover:bg-warm-muted lg:flex"
            >
              <Ticket className="h-4 w-4" aria-hidden />
              Tiket saya
            </Link>
            <UserMenu />
            <MobileMenu />
          </div>
        </div>
      </header>
      <div className="flex-1">
        <Outlet />
      </div>
      <footer className="mt-16 border-t border-warm-border bg-warm-muted/60">
        <div className="container grid gap-8 py-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Platform tiket acara untuk penonton dan organizer di Indonesia. Data acara di sini berasal
              dari organizer yang terdaftar.
            </p>
          </div>
          <nav aria-label="Navigasi footer" className="text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-olive">Jelajahi</p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link to="/events" className="hover:underline">
                  Semua acara
                </Link>
              </li>
              <li>
                <Link to="/events?availability=available" className="hover:underline">
                  Tiket tersedia
                </Link>
              </li>
              <li>
                <Link to="/organizer/apply" className="hover:underline">
                  Menjadi organizer
                </Link>
              </li>
            </ul>
          </nav>
          <nav aria-label="Informasi" className="text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-olive">Informasi</p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link to="/terms" className="hover:underline">
                  Syarat layanan
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:underline">
                  Kebijakan privasi
                </Link>
              </li>
              <li>
                <a href="/api/docs" className="hover:underline" target="_blank" rel="noreferrer">
                  Dokumentasi API
                </a>
              </li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-warm-border">
          <div className="container flex flex-wrap items-center justify-between gap-2 py-4 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} Gofest. Semua acara milik organizer masing-masing.</p>
            <p>Harga dalam Rupiah. Zona waktu mengikuti acara.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function AccountLayout() {
  const tabs = [
    { to: '/account', label: 'Ringkasan', end: true },
    { to: '/account/orders', label: 'Pesanan' },
    { to: '/account/profile', label: 'Profil' },
  ];
  return (
    <div className="container py-8 sm:py-12">
      <div className="border-b border-warm-border pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-olive">Akun</p>
        <h1 className="mt-1 font-display text-4xl tracking-tightest">Ruang pembeli</h1>
      </div>
      <nav className="mt-4 flex gap-1 overflow-x-auto border-b border-warm-border" aria-label="Menu akun">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                '-mb-px border-b-2 px-3 py-2 text-sm font-semibold',
                isActive ? 'border-vermilion text-ink' : 'border-transparent text-muted-foreground hover:text-ink',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <div className="py-6">
        <Outlet />
      </div>
    </div>
  );
}