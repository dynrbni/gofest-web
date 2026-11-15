import {
  ArrowRight,
  ChevronDown,
  Compass,
  Globe,
  Check,
  LayoutDashboard,
  Menu,
  Handshake,
  Search,
  Ticket,
  User,
  X,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { CategoryIcon } from '@/components/discovery/category-icon';
import { categoryName } from '@/lib/categories';
import { useLanguage } from '@/lib/language';
import { RouteContent } from '@/components/common/route-content';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth';
import { useCategories } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/common/brand-logo';

function workspaceLink(roles: string[]) {
  if (roles.includes('ADMIN')) return { to: '/admin', label: 'Dashboard admin' };
  if (roles.includes('ORGANIZER')) return { to: '/organizer', label: 'Dashboard organizer' };
  if (roles.includes('STAFF')) return { to: '/staff/events', label: 'Check-in acara' };
  return { to: '/organizer/apply', label: 'Jadi organizer' };
}

function UserMenu() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user)
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
  const workspace = workspaceLink(user.roles);
  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5"
          aria-label={`Menu akun ${user.name}`}
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-blue-50 text-xs font-medium text-blue-700">
            {initials}
          </span>
          <span className="hidden max-w-24 truncate text-sm font-medium xl:block">{user.name}</span>
          <ChevronDown className="size-4" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2">
        <DropdownMenuLabel>
          <span className="block">{user.name}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/account')}>
          <User className="mr-2 size-4" aria-hidden />
          {t('Akun saya', 'My account')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/account/orders')}>
          <Ticket className="mr-2 size-4" aria-hidden />
          {t('Tiket & pesanan', 'Tickets & orders')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate(workspace.to)}>
          <LayoutDashboard className="mr-2 size-4" aria-hidden />
          {workspace.label}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void logout().then(() => navigate('/'));
          }}
          className="text-rose-700"
        >
          {t('Keluar', 'Log out')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HeaderSearch({ mobile = false }: { mobile?: boolean }) {
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

function CategoryMenu() {
  const categories = useCategories();
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.key]);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="category-menu-trigger flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-blue-50 data-[state=open]:bg-blue-50 data-[state=open]:text-blue-700"
        >
          <Compass className="size-4" aria-hidden />
          {t('Kategori', 'Categories')}
          <ChevronDown className="size-3.5" aria-hidden />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="category-backdrop" />
        <Dialog.Content
          className="category-mega-menu"
          aria-label={t('Kategori acara', 'Event categories')}
          aria-describedby={undefined}
        >
          <div className="mb-5 flex items-center justify-between gap-4">
            <Dialog.Title className="text-xl font-semibold">
              {t('Kategori acara', 'Event categories')}
            </Dialog.Title>
            <Dialog.Close
              className="flex size-11 items-center justify-center rounded-lg hover:bg-slate-100"
              aria-label={t('Tutup kategori', 'Close categories')}
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>
          {categories.isLoading ? (
            <p role="status">{t('Memuat kategori...', 'Loading categories...')}</p>
          ) : categories.isError ? (
            <div role="alert">
              <p>{t('Kategori belum dapat dimuat.', 'Could not load categories.')}</p>
              <button
                type="button"
                className="text-link mt-2"
                onClick={() => void categories.refetch()}
              >
                {t('Coba lagi', 'Try again')}
              </button>
            </div>
          ) : (
            <nav
              aria-label={t('Pilih kategori', 'Choose a category')}
              className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
            >
              {(categories.data?.categories ?? []).map((category) => (
                <Link
                  key={category.id}
                  to={`/events?category=${encodeURIComponent(category.slug)}`}
                  onClick={() => setOpen(false)}
                  className="mega-category-link group"
                >
                  <CategoryIcon slug={category.slug} />
                  <span className="min-w-0">
                    <span className="block font-medium group-hover:text-blue-700">
                      {categoryName(category, language)}
                    </span>
                    <span className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                      {category.description || t('Temukan acara pilihanmu', 'Find your next event')}
                    </span>
                  </span>
                </Link>
              ))}
            </nav>
          )}
          <div className="mt-5 border-t border-slate-200 pt-4">
            <Link to="/events" onClick={() => setOpen(false)} className="text-link">
              {t('Jelajah semua acara', 'Explore all events')}{' '}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function LanguageMenu() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium hover:bg-slate-50"
          aria-label={t('Pilih bahasa', 'Choose language')}
        >
          <Globe className="size-4" aria-hidden />
          <span>{language.toUpperCase()}</span>
          <ChevronDown className="size-3.5" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 p-2">
        <DropdownMenuItem onSelect={() => setLanguage('id')} className="min-h-12 gap-3">
          <span aria-hidden>🇮🇩</span> Bahasa Indonesia{' '}
          {language === 'id' ? <Check className="ml-auto size-4" aria-hidden /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setLanguage('en')} className="min-h-12 gap-3">
          <span aria-hidden>🇬🇧</span> English{' '}
          {language === 'en' ? <Check className="ml-auto size-4" aria-hidden /> : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { t } = useLanguage();
  const { user } = useAuth();
  const creatorLink =
    user && user.roles.includes('ORGANIZER') ? '/organizer/events/new' : '/organizer/apply';
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) setMenuOpen(false);
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
        <div className="container flex h-[76px] items-center gap-5 lg:gap-7">
          <Logo />
          <div className="hidden lg:block">
            <CategoryMenu />
          </div>
          <HeaderSearch />
          <div className="ml-auto flex shrink-0 items-center gap-3 lg:gap-5">
            <Link
              to={creatorLink}
              className="hidden items-center gap-1.5 whitespace-nowrap text-sm font-medium hover:text-blue-700 lg:flex"
            >
              <Handshake className="size-4" aria-hidden />
              {t('Jadi Partner Kami', 'Partner with us')}
            </Link>
            <span className="hidden h-6 w-px bg-slate-200 lg:block" />
            <div className="hidden sm:block">
              <LanguageMenu />
            </div>
            <UserMenu />
            <button
              type="button"
              className="flex size-11 items-center justify-center rounded-lg border border-slate-200 md:hidden"
              aria-label={menuOpen ? t('Tutup menu', 'Close menu') : t('Buka menu', 'Open menu')}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? (
                <X className="size-5" aria-hidden />
              ) : (
                <Menu className="size-5" aria-hidden />
              )}
            </button>
          </div>
        </div>
        <div className="container pb-3 md:hidden">
          <HeaderSearch mobile />
        </div>

        {menuOpen ? (
          <nav
            id="mobile-navigation"
            aria-label={t('Menu mobile', 'Mobile navigation')}
            className="mobile-navigation"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <CategoryMenu />
              <LanguageMenu />
            </div>
            <Link to="/events" onClick={() => setMenuOpen(false)}>
              {t('Jelajah semua acara', 'Explore all events')}
            </Link>
            <Link to="/events?price=free">{t('Acara gratis', 'Free events')}</Link>
            <Link to={creatorLink}>{t('Jadi Partner Kami', 'Partner with us')}</Link>
            {user ? (
              <Link to={workspaceLink(user.roles).to}>{workspaceLink(user.roles).label}</Link>
            ) : null}
          </nav>
        ) : null}
      </header>
      <div id="page-content" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
        <RouteContent />
      </div>
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
                  <Link to="/events?price=free">{t('Acara gratis', 'Free events')}</Link>
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
