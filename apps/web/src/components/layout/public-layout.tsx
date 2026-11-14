import {
  ChevronDown,
  Compass,
  CreditCard,
  Menu,
  PlusCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  User,
  X,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
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

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('group inline-flex items-center gap-2.5', className)} aria-label="Gofest, ke beranda">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs transition-transform duration-200 group-hover:scale-105">
        <Ticket className="h-5 w-5" />
      </div>
      <div className="flex items-baseline">
        <span className="text-2xl font-extrabold tracking-tight text-slate-900">GOFEST</span>
        <span className="ml-1 h-2 w-2 rounded-full bg-coral-500" aria-hidden />
      </div>
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
  if (roles.includes('ADMIN')) return { to: '/admin', label: 'Admin Workspace' };
  if (roles.includes('ORGANIZER')) return { to: '/organizer', label: 'Organizer Portal' };
  if (roles.includes('STAFF')) return { to: '/staff/events', label: 'Scanner Check-in' };
  return { to: '/organizer/apply', label: 'Mulai Jadi Organizer' };
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const workspace = user ? workspaceLink(user.roles) : null;

  if (!user) {
    return (
      <div className="flex items-center gap-2.5">
        <Link
          to="/login"
          className="rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          Masuk
        </Link>
        <Link
          to="/register"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-xs transition-all hover:bg-blue-700 hover:shadow-md"
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
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 pr-3 text-xs font-semibold text-slate-800 shadow-xs transition-colors hover:border-blue-300 hover:bg-slate-50"
          aria-label={`Menu akun ${user.name}`}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
            {initials(user.name)}
          </span>
          <span className="hidden max-w-[100px] truncate sm:inline-block font-medium">{user.name}</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 rounded-xl border-slate-200 bg-white p-1.5 shadow-lg">
        <DropdownMenuLabel className="p-2">
          <span className="block text-sm font-bold text-slate-900">{user.name}</span>
          <span className="block truncate text-xs font-normal text-slate-500">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-100" />
        <DropdownMenuItem
          onSelect={() => navigate('/account')}
          className="cursor-pointer rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900"
        >
          <User className="mr-2 h-4 w-4 text-slate-400" />
          Akun Saya
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => navigate('/account/orders')}
          className="cursor-pointer rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900"
        >
          <Ticket className="mr-2 h-4 w-4 text-slate-400" />
          Pesanan & Tiket Saya
        </DropdownMenuItem>
        {workspace ? (
          <DropdownMenuItem
            onSelect={() => navigate(workspace.to)}
            className="cursor-pointer rounded-lg px-2.5 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
          >
            <Sparkles className="mr-2 h-4 w-4 text-blue-600" />
            {workspace.label}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator className="bg-slate-100" />
        <DropdownMenuItem
          onSelect={() => {
            void logout().then(() => navigate('/'));
          }}
          className="cursor-pointer rounded-lg px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
        >
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SearchBar() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const clean = query.trim();
    navigate(clean ? `/events?q=${encodeURIComponent(clean)}` : '/events');
  }

  return (
    <form onSubmit={onSubmit} className="relative hidden w-full max-w-xs md:block lg:max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cari konser, festival, atraksi..."
        className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-9 pr-4 text-xs font-medium text-slate-800 placeholder:text-slate-400 transition-colors focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
    </form>
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
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      >
        {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        <span className="sr-only">{open ? 'Tutup menu' : 'Buka menu'}</span>
      </button>

      {open ? (
        <div
          id="public-mobile-menu"
          className="absolute inset-x-0 top-full z-40 border-b border-slate-200 bg-white px-5 pb-6 pt-3 shadow-xl animate-in slide-in-from-top-2"
        >
          <div className="mb-4">
            <Link
              to="/events"
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-500"
            >
              <Search className="h-4 w-4 text-slate-400" />
              <span>Cari event, artis, atau kota...</span>
            </Link>
          </div>

          <nav className="flex flex-col space-y-1" aria-label="Navigasi mobile">
            <Link
              to="/events"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              <Compass className="h-4 w-4 text-blue-600" />
              Jelajah Semua Event
            </Link>
            <Link
              to="/events?price=free"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              <Ticket className="h-4 w-4 text-emerald-600" />
              Event Gratis
            </Link>
            <Link
              to="/account/orders"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              <Ticket className="h-4 w-4 text-blue-600" />
              Tiket & Pesanan Saya
            </Link>
            <Link
              to="/organizer/apply"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50"
            >
              <PlusCircle className="h-4 w-4 text-blue-600" />
              Mulai Jadi Organizer
            </Link>
          </nav>
        </div>
      ) : null}
    </div>
  );
}

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50/50">
      <ScrollRestoration />

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6 lg:gap-8">
            <Logo />
            <SearchBar />
          </div>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigasi utama">
            <NavLink
              to="/events"
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
                )
              }
            >
              Jelajah Event
            </NavLink>
            <NavLink
              to="/events?price=free"
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
                )
              }
            >
              Acara Gratis
            </NavLink>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              to="/organizer/apply"
              className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 sm:inline-flex"
            >
              <PlusCircle className="h-3.5 w-3.5 text-blue-600" />
              Buat Event
            </Link>
            <Link
              to="/account/orders"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 xl:inline-flex"
            >
              <Ticket className="h-3.5 w-3.5 text-slate-500" />
              Tiket Saya
            </Link>
            <UserMenu />
            <MobileMenu />
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <div className="flex-1">
        <Outlet />
      </div>

      {/* Commercial Indonesian Ticketing Footer (Loket / Artatix style) */}
      <footer className="mt-20 border-t border-slate-200 bg-white">
        <div className="container py-12 lg:py-16">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            {/* Column 1: Brand Info */}
            <div className="lg:col-span-2">
              <Logo />
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-500">
                Platform ticketing event modern untuk penonton dan kreator acara di seluruh Indonesia.
                Beli tiket konser musik, festival, atraksi, dan seminar dengan mudah, cepat, dan aman.
              </p>
              <div className="mt-6 flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1 font-semibold text-emerald-600">
                  <ShieldCheck className="h-4 w-4" /> 100% Tiket Resmi
                </span>
                <span>·</span>
                <span className="flex items-center gap-1 font-semibold text-blue-600">
                  <CreditCard className="h-4 w-4" /> Pembayaran Aman
                </span>
              </div>
            </div>

            {/* Column 2: Kategori Populer */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-900">Kategori Event</p>
              <ul className="mt-3.5 space-y-2.5 text-sm text-slate-600">
                <li>
                  <Link to="/events?category=musik" className="hover:text-blue-600">
                    Konser Musik
                  </Link>
                </li>
                <li>
                  <Link to="/events?category=festival" className="hover:text-blue-600">
                    Festival Budaya
                  </Link>
                </li>
                <li>
                  <Link to="/events?category=pameran" className="hover:text-blue-600">
                    Pameran & Seni
                  </Link>
                </li>
                <li>
                  <Link to="/events?category=olahraga" className="hover:text-blue-600">
                    Olahraga & Lari
                  </Link>
                </li>
                <li>
                  <Link to="/events?category=workshop" className="hover:text-blue-600">
                    Workshop & Edukasi
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Kota Pilihan */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-900">Kota Pilihan</p>
              <ul className="mt-3.5 space-y-2.5 text-sm text-slate-600">
                <li>
                  <Link to="/events?city=Jakarta" className="hover:text-blue-600">
                    Event Jakarta
                  </Link>
                </li>
                <li>
                  <Link to="/events?city=Bandung" className="hover:text-blue-600">
                    Event Bandung
                  </Link>
                </li>
                <li>
                  <Link to="/events?city=Surabaya" className="hover:text-blue-600">
                    Event Surabaya
                  </Link>
                </li>
                <li>
                  <Link to="/events?city=Bali" className="hover:text-blue-600">
                    Event Bali
                  </Link>
                </li>
                <li>
                  <Link to="/events?city=Yogyakarta" className="hover:text-blue-600">
                    Event Yogyakarta
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Bantuan & Organizer */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-900">Layanan & Organizer</p>
              <ul className="mt-3.5 space-y-2.5 text-sm text-slate-600">
                <li>
                  <Link to="/organizer/apply" className="font-semibold text-blue-600 hover:underline">
                    Buat Event Sendiri
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-blue-600">
                    Syarat & Ketentuan
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-blue-600">
                    Kebijakan Privasi
                  </Link>
                </li>
                <li>
                  <a href="/api/docs" target="_blank" rel="noreferrer" className="hover:text-blue-600">
                    Dokumentasi API
                  </a>
                </li>
                <li>
                  <Link to="/account/orders" className="hover:text-blue-600">
                    Cek Status Pesanan
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Payment Channels Section */}
          <div className="mt-12 border-t border-slate-100 pt-8">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Metode Pembayaran Terverifikasi
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 shadow-2xs">BCA</span>
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 shadow-2xs">Mandiri</span>
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 shadow-2xs">BNI</span>
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 shadow-2xs">BRI</span>
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 shadow-2xs">Permata</span>
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 shadow-2xs">QRIS</span>
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 shadow-2xs">GoPay</span>
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 shadow-2xs">OVO</span>
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 shadow-2xs">ShopeePay</span>
            </div>
          </div>

          {/* Copyright Bar */}
          <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-6 sm:flex-row text-xs text-slate-500">
            <p>© {new Date().getFullYear()} GOFEST Indonesia. Seluruh hak cipta dilindungi.</p>
            <p>Harga sudah termasuk pajak yang berlaku. Tiket diterbitkan secara resmi.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function AccountLayout() {
  const tabs = [
    { to: '/account', label: 'Ringkasan Akun', end: true },
    { to: '/account/orders', label: 'Tiket & Pesanan' },
    { to: '/account/profile', label: 'Pengaturan Profil' },
  ];

  return (
    <div className="container py-8 sm:py-10">
      <div className="border-b border-slate-200 pb-5">
        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Area Pembeli</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Kelola Akun & Tiket</h1>
      </div>
      <nav className="mt-4 flex gap-2 overflow-x-auto border-b border-slate-200" aria-label="Menu akun">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                '-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors',
                isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900',
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
