import {
  LayoutDashboard,
  Calendar,
  Building2,
  Wallet,
  Banknote,
  ScrollText,
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
    label: 'Event',
    icon: Calendar,
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
