import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, House, LogOut, ReceiptText, Settings, Ticket, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/api';
import { useLanguage } from '@/lib/language';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import './user-account-menu.css';

export function UserAccountMenu() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  const initials = user?.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toLocaleUpperCase('id-ID');
  const links = [
    {
      to: user?.roles.some((role) => ['ADMIN', 'SUPERADMIN'].includes(role))
        ? '/admin/dashboard'
        : user?.roles.includes('CREATOR') || user?.roles.includes('ORGANIZER')
          ? '/creator/dashboard'
          : '/account',
      label: 'Dashboard',
      icon: House,
    },
    { to: '/account/tickets', label: t('Tiket Saya', 'My Tickets'), icon: Ticket },
    { to: '/account/orders', label: t('Riwayat Pesanan', 'Order History'), icon: ReceiptText },
    { to: '/account/favorites', label: t('Event Favorit', 'Favorite Events'), icon: Heart },
    { to: '/account/profile', label: t('Profil Saya', 'My Profile'), icon: UserRound },
    { to: '/account/settings', label: t('Pengaturan', 'Settings'), icon: Settings },
  ];

  async function signOut() {
    setLeaving(true);
    try {
      await logout();
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLeaving(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="user-account-trigger"
          disabled={!user}
          aria-label={t(`Menu akun ${user?.name ?? ''}`, `Account menu for ${user?.name ?? ''}`)}
        >
          <span aria-hidden>{initials || <UserRound size={20} />}</span>
        </button>
      </DropdownMenuTrigger>
      {user ? (
        <DropdownMenuContent
          align="end"
          className="user-account-menu w-64 max-w-[calc(100vw-32px)] p-2"
        >
          <DropdownMenuLabel>
            <span className="block break-words">{user.name}</span>
            <span className="block break-all text-xs font-normal text-slate-600">{user.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {links.map((item) => (
            <DropdownMenuItem key={item.to} onSelect={() => navigate(item.to)}>
              <item.icon aria-hidden />
              {item.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={leaving}
            onSelect={() => void signOut()}
            className="text-rose-700"
          >
            <LogOut aria-hidden />
            {leaving ? t('Keluar…', 'Signing out…') : t('Keluar', 'Log out')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      ) : null}
    </DropdownMenu>
  );
}
