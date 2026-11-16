import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Heart,
  House,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Settings,
  Ticket,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { RequireAuth, useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import { errorMessage } from '@/lib/api';
import { Logo } from '@/components/common/brand-logo';
import { LanguageMenu } from '@/components/common/language-menu';
import { RouteContent } from '@/components/common/route-content';
import { UserAccountMenu } from '@/components/common/user-account-menu';
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import './account.css';

export function AccountLayout() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const links = [
    { to: '/account', label: 'Dashboard', mobile: 'Home', icon: House },
    {
      to: '/account/tickets',
      label: t('Tiket Saya', 'My Tickets'),
      mobile: t('Tiket', 'Tickets'),
      icon: Ticket,
    },
    { to: '/account/orders', label: t('Riwayat Pesanan', 'Order History'), icon: ReceiptText },
    {
      to: '/account/favorites',
      label: t('Event Favorit', 'Favorite Events'),
      mobile: t('Favorit', 'Favorites'),
      icon: Heart,
    },
    {
      to: '/account/profile',
      label: t('Profil Saya', 'My Profile'),
      mobile: t('Profil', 'Profile'),
      icon: UserRound,
    },
    { to: '/account/settings', label: t('Pengaturan', 'Settings'), icon: Settings },
  ];
  async function signOut() {
    setLeaving(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLeaving(false);
    }
  }
  return (
    <div className="customer-account" data-sidebar-collapsed={sidebarCollapsed}>
      <a href="#account-main" className="account-skip">
        {t('Langsung ke konten', 'Skip to content')}
      </a>
      <aside
        id="account-sidebar"
        className="account-sidebar no-print"
        aria-label={t('Area akun', 'Account area')}
      >
        <div className="account-brand">
          <Logo className="account-wordmark" />
          <Link
            to="/"
            className="account-iconmark"
            aria-label={t('Gofest, ke beranda', 'Gofest home')}
          >
            <img src="/assets/gofest-icon-192.png" alt="" width={192} height={192} />
          </Link>
          <button
            type="button"
            className="account-sidebar-toggle"
            aria-label={
              sidebarCollapsed
                ? t('Perluas sidebar', 'Expand sidebar')
                : t('Ciutkan sidebar', 'Collapse sidebar')
            }
            aria-expanded={!sidebarCollapsed}
            aria-controls="account-sidebar"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={20} aria-hidden />
            ) : (
              <PanelLeftClose size={20} aria-hidden />
            )}
          </button>
        </div>
        <nav aria-label={t('Navigasi akun', 'Account navigation')} className="account-navigation">
          {links.map((item, index) => (
            <div key={item.to}>
              {index === 0 || index === 1 || index === 4 ? (
                <p className="account-nav-group">
                  {index === 0 ? 'Overview' : index === 1 ? 'My activities' : 'Account'}
                </p>
              ) : null}
              <NavLink
                to={item.to}
                end={item.to === '/account'}
                aria-label={item.label}
                title={sidebarCollapsed ? item.label : undefined}
                className={({ isActive }) => `account-nav-link${isActive ? ' is-active' : ''}`}
              >
                <item.icon size={19} aria-hidden />
                <span className="account-nav-label">{item.label}</span>
              </NavLink>
            </div>
          ))}
        </nav>
        <div className="account-sidebar-footer">
          <Link
            to="/events"
            className="account-secondary account-buyer-link"
            aria-label={t('Kembali ke Buyer Area', 'Back to Buyer Area')}
            title={sidebarCollapsed ? t('Kembali ke Buyer Area', 'Back to Buyer Area') : undefined}
          >
            <ArrowUpRight size={16} aria-hidden />
            <span className="account-nav-label">
              {t('Kembali ke Buyer Area', 'Back to Buyer Area')}
            </span>
          </Link>
          <button
            type="button"
            className="account-nav-link account-logout"
            aria-label={leaving ? t('Keluar…', 'Signing out…') : t('Keluar', 'Log out')}
            title={sidebarCollapsed ? t('Keluar', 'Log out') : undefined}
            disabled={leaving || !user}
            onClick={() => void signOut()}
          >
            <LogOut size={19} aria-hidden />
            <span className="account-nav-label">
              {leaving ? t('Keluar…', 'Signing out…') : t('Keluar', 'Log out')}
            </span>
          </button>
        </div>
      </aside>
      <div className="account-workspace">
        <header className="account-topbar no-print">
          <div className="account-mobile-brand">
            <Logo />
          </div>
          <span className="account-topbar-caption">
            {t('Ruang event kamu', 'Your event space')}
          </span>
          <div className="flex min-w-0 items-center gap-2 sm:gap-5">
            <Link to="/events" className="account-explore account-text-link">
              {t('Jelajahi event', 'Explore events')}
              <ArrowUpRight size={16} aria-hidden />
            </Link>
            <LanguageMenu />
            <UserAccountMenu />
          </div>
        </header>
        <main id="account-main" className="account-main" tabIndex={-1}>
          <RequireAuth>
            <RouteContent />
          </RequireAuth>
        </main>
      </div>
      <nav
        className="account-bottom-nav no-print"
        aria-label={t('Navigasi utama akun', 'Main account navigation')}
      >
        {links
          .filter((item) => item.mobile)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/account'}
              className={({ isActive }) => (isActive ? 'is-active' : '')}
            >
              <item.icon size={21} aria-hidden />
              <span>{item.mobile}</span>
            </NavLink>
          ))}
      </nav>
    </div>
  );
}
