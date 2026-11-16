import {
  LayoutDashboard,
  Calendar,
  Building2,
  Plus,
  Ticket,
  CreditCard,
  Users,
  ScanLine,
  ScrollText,
  Wallet,
  Banknote,
  Megaphone,
  Link as LinkIcon,
  Settings,
  LifeBuoy,
} from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { WorkspaceLayout, type WorkspaceNavItem } from '@/components/layout/workspace-layout';

const creatorNav: WorkspaceNavItem[] = [
  {
    group: 'Overview',
    to: '/creator/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    end: true,
  },
  {
    group: 'Event Management',
    to: '/creator/events',
    label: 'Event saya',
    icon: Calendar,
    end: true,
  },
  { group: 'Event Management', to: '/creator/events/new', label: 'Buat event', icon: Plus },
  {
    group: 'Event Management',
    to: '/creator/events?status=DRAFT',
    label: 'Draft event',
    icon: ScrollText,
  },
  {
    group: 'Event Management',
    to: '/creator/events?status=PENDING_REVIEW',
    label: 'Pengajuan event',
    icon: Calendar,
  },
  {
    group: 'Ticket Management',
    to: '/creator/tickets',
    label: 'Jenis, harga & kuota',
    icon: Ticket,
  },
  { group: 'Ticket Management', to: '/creator/promotions', label: 'Kode promosi', icon: Ticket },
  { group: 'Order Management', to: '/creator/orders', label: 'Semua pesanan', icon: CreditCard },
  { group: 'Order Management', to: '/creator/attendees', label: 'Daftar peserta', icon: Users },
  {
    group: 'Check-in Management',
    to: '/creator/check-in',
    label: 'Overview check-in',
    icon: ScanLine,
    end: true,
  },
  { group: 'Check-in Management', to: '/creator/staff', label: 'Check-in staff', icon: Users },
  {
    group: 'Check-in Management',
    to: '/creator/check-in/history',
    label: 'Riwayat check-in',
    icon: ScrollText,
  },
  {
    group: 'Financial Management',
    to: '/creator/finance',
    label: 'Revenue Overview',
    icon: Wallet,
  },
  {
    group: 'Financial Management',
    to: '/creator/payouts',
    label: 'Payouts & saldo',
    icon: Banknote,
    end: true,
  },
  {
    group: 'Financial Management',
    to: '/creator/bank-accounts',
    label: 'Rekening bank',
    icon: Building2,
  },
  {
    group: 'Financial Management',
    to: '/creator/payouts/history',
    label: 'Riwayat payout',
    icon: ScrollText,
  },
  {
    group: 'Financial Management',
    to: '/creator/event-reports',
    label: 'Laporan per event',
    icon: ScrollText,
  },
  { group: 'Marketing', to: '/creator/marketing', label: 'Promosi event', icon: Megaphone },
  { group: 'Marketing', to: '/creator/links', label: 'Tautan promosi', icon: LinkIcon },
  { group: 'Account', to: '/creator/settings', label: 'Profil organizer', icon: Building2 },
  { group: 'Account', to: '/account/settings', label: 'Pengaturan akun', icon: Settings },
  { group: 'Account', to: '/creator/support', label: 'Bantuan & dukungan', icon: LifeBuoy },
];
export function CreatorLayout() {
  return (
    <WorkspaceLayout
      workspace="Creator / Event Organizer"
      title="Workspace Creator"
      nav={creatorNav}
    >
      <Outlet />
    </WorkspaceLayout>
  );
}
export const OrganizerShell = CreatorLayout;
