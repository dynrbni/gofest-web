import {
  ArrowRight,
  Handshake,
  Menu,
  ReceiptText,
  Search,
  Ticket,
  User,
  X,
  LayoutDashboard,
  LogOut,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/language';
import { RouteContent } from '@/components/common/route-content';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAccountMenu } from '@/components/common/user-account-menu';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/common/brand-logo';
import { LanguageMenu } from '@/components/common/language-menu';

function UserMenu() {
  const { t } = useLanguage();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Skeleton
        className="h-11 w-28"
        role="status"
        aria-label={t('Memuat akun', 'Loading account')}
      />
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link to="/login" className="header-login">
          {t('Masuk', 'Log in')}
        </Link>
        <Link to="/register" className="primary-action header-register">
          {t('Daftar', 'Sign up')}
        </Link>
      </div>
    );
  }

  return <UserAccountMenu />;
}

function HeaderSearch({
  mobile = false,
  autoFocus = false,
}: {
  mobile?: boolean;
  autoFocus?: boolean;
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    navigate(query.trim() ? `/events?q=${encodeURIComponent(query.trim())}` : '/events');
  }

  return (
    <form
      role="search"
      aria-label={
        mobile
          ? t('Pencarian acara mobile', 'Mobile event search')
          : t('Pencarian acara', 'Event search')
      }
      onSubmit={onSubmit}
      className={cn('header-search', mobile ? 'flex md:hidden' : 'hidden md:flex')}
    >
      <label htmlFor={mobile ? 'mobile-event-search' : 'header-event-search'} className="sr-only">
        {t('Cari acara, artis, atau kota', 'Search events, artists, or cities')}
      </label>

      <input
        id={mobile ? 'mobile-event-search' : 'header-event-search'}
        type="search"
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('Cari acara, artis, atau kota...', 'Search events, artists, or cities...')}
      />

      <button type="submit" aria-label={t('Cari acara', 'Search events')}>
        <Search className="size-5" aria-hidden />
      </button>
    </form>
  );
}

export function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, logout, isLoading } = useAuth();

  const creatorLink =
    user && user.roles.includes('ORGANIZER') ? '/organizer/events/new' : '/organizer/apply';

  useEffect(() => {
    setMenuOpen(false);
    setMobileSearchOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <div className="public-shell flex min-h-screen flex-col">
      <a href="#page-content" className="skip-link">
        {t('Langsung ke konten', 'Skip to content')}
      </a>

      <header className="public-header sticky top-0 z-40 bg-white">
        <div className="container flex h-16 min-h-16 shrink-0 items-center gap-3 py-0 sm:gap-5 lg:gap-7 md:h-[70px] md:min-h-[70px]">
          <Logo />
          <HeaderSearch />

          {/* Desktop Navigation Items */}
          <div className="ml-auto hidden shrink-0 items-center gap-3 md:flex lg:gap-5">
            {!user && !isLoading ? (
              <>
                <Link
                  to={creatorLink}
                  className="hidden items-center gap-1.5 whitespace-nowrap text-sm font-medium hover:text-blue-700 lg:flex"
                >
                  <Handshake className="size-4" aria-hidden />
                  {t('Jadi Partner Kami', 'Partner with us')}
                </Link>

                <span className="hidden h-6 w-px bg-slate-200 lg:block" />
              </>
            ) : null}

            <div className="hidden sm:block">
              <LanguageMenu />
            </div>

            <UserMenu />
          </div>

          {/* Mobile Navigation Controls */}
          <div className="ml-auto flex shrink-0 items-center gap-2 md:hidden">
            <LanguageMenu />

            {/* Search Toggle */}
            <button
              type="button"
              onClick={() => {
                setMobileSearchOpen((val) => !val);
                if (!mobileSearchOpen) setMenuOpen(false);
              }}
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200',
                mobileSearchOpen && 'bg-blue-50 text-blue-700 ring-2 ring-blue-600/20',
              )}
              aria-label={
                mobileSearchOpen
                  ? t('Tutup pencarian', 'Close search')
                  : t('Cari acara', 'Search events')
              }
              aria-expanded={mobileSearchOpen}
            >
              <Search className="size-4" aria-hidden />
            </button>

            {/* Hamburger Menu */}
            <button
              type="button"
              onClick={() => {
                setMenuOpen((val) => !val);
                if (!menuOpen) setMobileSearchOpen(false);
              }}
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200',
                menuOpen && 'bg-blue-50 text-blue-700 ring-2 ring-blue-600/20',
              )}
              aria-label={menuOpen ? t('Tutup menu', 'Close menu') : t('Buka menu', 'Open menu')}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
            >
              {menuOpen ? (
                <X className="size-5" aria-hidden />
              ) : (
                <Menu className="size-5" aria-hidden />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {mobileSearchOpen ? (
          <div className="container pb-3 md:hidden">
            <HeaderSearch mobile autoFocus />
          </div>
        ) : null}

        {/* Mobile Navigation Dropdown */}
        {menuOpen ? (
          <nav
            id="mobile-navigation"
            aria-label={t('Menu mobile', 'Mobile navigation')}
            className="mobile-navigation"
          >
            {/* Login & Register */}
            {!user && !isLoading ? (
              <div className="mb-4 grid grid-cols-2 gap-2.5">
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="header-login flex min-h-11 items-center justify-center rounded-xl border border-blue-600 bg-white px-3 text-center text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"
                >
                  {t('Masuk', 'Log in')}
                </Link>

                <Link
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className="primary-action header-register flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-3 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                  {t('Daftar', 'Sign up')}
                </Link>
              </div>
            ) : null}

            {/* Authenticated User Section */}
            {user ? (
              <div className="mb-3">
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm">
                    {user.name
                      .split(' ')
                      .slice(0, 2)
                      .map((p) => p.charAt(0))
                      .join('')
                      .toUpperCase()}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-slate-900">{user.name}</div>
                    <div className="truncate text-xs text-slate-500">{user.email}</div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Link
                    to="/account/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                  >
                    <User className="size-4 text-slate-400" aria-hidden />
                    {t('Profil Saya', 'My Profile')}
                  </Link>

                  <Link
                    to="/account/orders"
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                  >
                    <ReceiptText className="size-4 text-slate-400" aria-hidden />
                    {t('Transaksi Saya', 'My Transactions')}
                  </Link>

                  <Link
                    to="/account/tickets"
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                  >
                    <Ticket className="size-4 text-slate-400" aria-hidden />
                    {t('Tiket Saya', 'My Tickets')}
                  </Link>

                  {user.roles.includes('ORGANIZER') ? (
                    <Link
                      to="/organizer/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                    >
                      <LayoutDashboard className="size-4 text-blue-600" aria-hidden />
                      Workspace Organizer
                    </Link>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      void logout().then(() => navigate('/'));
                    }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="size-4 text-rose-500" aria-hidden />
                    {t('Keluar', 'Log out')}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="my-2 border-t border-slate-100" />

            {/* Navigation Links */}
            <div className="space-y-1">
              <Link
                to="/events"
                onClick={() => setMenuOpen(false)}
                className="flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600"
              >
                {t('Jelajah semua acara', 'Explore all events')}
              </Link>

              <Link
                to="/events?category=musik"
                onClick={() => setMenuOpen(false)}
                className="flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600"
              >
                {t('Musik', 'Music')}
              </Link>

              <Link
                to="/terms"
                onClick={() => setMenuOpen(false)}
                className="flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-blue-600"
              >
                {t('Syarat & ketentuan', 'Terms & conditions')}
              </Link>

              <Link
                to="/privacy"
                onClick={() => setMenuOpen(false)}
                className="flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-blue-600"
              >
                {t('Kebijakan privasi', 'Privacy policy')}
              </Link>
            </div>
          </nav>
        ) : null}
      </header>

      <div id="page-content" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
        <RouteContent />
      </div>

      {/* Footer */}
      <footer className="site-footer">
        <div className="container py-10 sm:py-12">
          <div className="grid gap-9 md:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <Logo />

              <p className="mt-4 max-w-sm text-sm leading-7 text-slate-600">
                {t(
                  'Tempat menemukan acara, bertemu orang baru, dan membawa pulang cerita. Pilih pengalamanmu berikutnya di Gofest.',
                  'Find events, meet new people, and take home a story. Discover your next experience on Gofest.',
                )}
              </p>

              <Link to="/events" className="text-link mt-4">
                {t('Temukan acara', 'Find events')} <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>

            <div>
              <h2 className="text-sm font-semibold">{t('Jelajahi Gofest', 'Explore Gofest')}</h2>

              <ul className="footer-links">
                <li>
                  <Link to="/events">{t('Semua acara', 'All events')}</Link>
                </li>
                <li>
                  <Link to="/events?category=musik">{t('Musik', 'Music')}</Link>
                </li>
                <li>
                  <Link to="/account/orders">
                    {t('Tiket & pesanan saya', 'My tickets & orders')}
                  </Link>
                </li>
                <li>
                  <Link to={creatorLink}>{t('Jadi Partner Kami', 'Partner with us')}</Link>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-sm font-semibold">{t('Informasi', 'Information')}</h2>

              <ul className="footer-links">
                <li>
                  <Link to="/terms">{t('Syarat & ketentuan', 'Terms & conditions')}</Link>
                </li>
                <li>
                  <Link to="/privacy">{t('Kebijakan privasi', 'Privacy policy')}</Link>
                </li>
                <li>
                  <Link to="/organizer/apply">{t('Menjadi organizer', 'Become an organizer')}</Link>
                </li>
                <li>
                  <Link to="/account/profile">{t('Pengaturan akun', 'Account settings')}</Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} Gofest Indonesia.</p>
            <p>{t('Setiap pertemuan punya cerita.', 'Every gathering has a story.')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
