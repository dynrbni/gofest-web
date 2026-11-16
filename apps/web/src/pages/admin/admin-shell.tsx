import {
  LayoutDashboard,
  Users,
  Building2,
  Calendar,
  CreditCard,
  Tag,
  Settings,
  ScrollText,
  Wallet,
  Banknote,
  FileText,
  ScanLine,
  Image,
  LifeBuoy,
  Bell,
  ShieldCheck,
  UserCircle,
  Ticket,
} from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { WorkspaceLayout, type WorkspaceNavItem } from '@/components/layout/workspace-layout';
import { useAuth } from '@/lib/auth';

const adminNav: WorkspaceNavItem[] = [
  {
    group: 'Overview',
    to: '/admin/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    end: true,
  },
  {
    group: 'Event Management',
    to: '/admin/events',
    label: 'Semua event',
    icon: Calendar,
    end: true,
  },
  {
    group: 'Event Management',
    to: '/admin/events?status=PENDING_REVIEW',
    label: 'Review event',
    icon: FileText,
  },
  { group: 'Event Management', to: '/admin/categories', label: 'Kategori', icon: Tag },
  {
    group: 'Transaction Management',
    to: '/admin/orders',
    label: 'Semua pesanan',
    icon: CreditCard,
    end: true,
  },
  { group: 'Transaction Management', to: '/admin/payments', label: 'Pembayaran', icon: Banknote },
  { group: 'Transaction Management', to: '/admin/refunds', label: 'Refunds', icon: CreditCard },
  { group: 'User Management', to: '/admin/users', label: 'Customers', icon: Users },
  { group: 'User Management', to: '/admin/organizers', label: 'Organizers', icon: Building2 },
  { group: 'User Management', to: '/admin/staff', label: 'Check-in staff', icon: Users },
  {
    group: 'Check-in Management',
    to: '/admin/check-in',
    label: 'Monitoring check-in',
    icon: ScanLine,
    end: true,
  },
  {
    group: 'Check-in Management',
    to: '/admin/check-in/history',
    label: 'Riwayat check-in',
    icon: ScrollText,
  },
  {
    group: 'Financial Management',
    to: '/admin/finance',
    label: 'Financial Overview',
    icon: Wallet,
  },
  {
    group: 'Financial Management',
    to: '/admin/event-reports',
    label: 'Laporan event',
    icon: FileText,
  },
  {
    group: 'Financial Management',
    to: '/admin/payouts',
    label: 'Payout Management',
    icon: Banknote,
    end: true,
  },
  {
    group: 'Financial Management',
    to: '/admin/payouts/history',
    label: 'Riwayat payout',
    icon: ScrollText,
  },
  {
    group: 'Content Management',
    to: '/admin/content?kind=HOMEPAGE',
    label: 'Homepage',
    icon: LayoutDashboard,
  },
  { group: 'Content Management', to: '/admin/content?kind=BANNER', label: 'Banner', icon: Image },
  {
    group: 'Content Management',
    to: '/admin/promotions',
    label: 'Promosi & voucher',
    icon: Ticket,
  },
  { group: 'Other', to: '/admin/support', label: 'Customer Support', icon: LifeBuoy },
  { group: 'Other', to: '/admin/notifications', label: 'Notifikasi', icon: Bell },
];
const systemNav: WorkspaceNavItem[] = [
  { group: 'Superadmin', to: '/admin/admins', label: 'Admin Management', icon: ShieldCheck },
  {
    group: 'Superadmin',
    to: '/admin/permissions',
    label: 'Roles & Permissions',
    icon: ShieldCheck,
  },
  { group: 'Superadmin', to: '/admin/settings', label: 'System Settings', icon: Settings },
  { group: 'Superadmin', to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
];
export function AdminLayout() {
  const { user } = useAuth();
  const superadmin = user?.roles.includes('SUPERADMIN');
  const nav = [
    ...adminNav,
    ...(superadmin
      ? systemNav
      : [
          {
            group: 'Other',
            to: '/admin/audit-logs',
            label: 'Aktivitas operasional',
            icon: ScrollText,
          },
        ]),
    { group: 'Account', to: '/account/profile', label: 'Profil akun', icon: UserCircle },
    { group: 'Account', to: '/account/settings', label: 'Pengaturan akun', icon: Settings },
  ];
  return (
    <WorkspaceLayout
      workspace={superadmin ? 'Superadmin' : 'Admin'}
      title="Operasional GOFEST"
      nav={nav}
    >
      <Outlet />
    </WorkspaceLayout>
  );
}
export const AdminShell = AdminLayout;
