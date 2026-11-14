import {
  LayoutDashboard,
  Users,
  Building2,
  Calendar,
  CreditCard,
  Tag,
  Settings,
  ScrollText,
} from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { WorkspaceLayout, type WorkspaceNavItem } from '@/components/layout/workspace-layout';

const adminNav: WorkspaceNavItem[] = [
  { to: '/admin', label: 'Ringkasan', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Pengguna', icon: Users, end: false },
  { to: '/admin/organizers', label: 'Organizer', icon: Building2, end: false },
  { to: '/admin/events', label: 'Acara & Moderasi', icon: Calendar, end: false },
  { to: '/admin/orders', label: 'Transaksi', icon: CreditCard, end: false },
  { to: '/admin/categories', label: 'Kategori', icon: Tag, end: false },
  { to: '/admin/settings', label: 'Konfigurasi', icon: Settings, end: false },
  { to: '/admin/audit-logs', label: 'Audit Log', icon: ScrollText, end: false },
];

export function AdminShell() {
  return (
    <WorkspaceLayout
      workspace="Admin Platform"
      title="Menu Super Admin"
      nav={adminNav}
    >
      <Outlet />
    </WorkspaceLayout>
  );
}

