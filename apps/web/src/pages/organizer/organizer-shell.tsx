import { LayoutDashboard, Calendar, Settings, Building2 } from 'lucide-react';
import { Navigate, Outlet } from 'react-router-dom';
import { WorkspaceLayout, type WorkspaceNavItem } from '@/components/layout/workspace-layout';
import { useAuth } from '@/lib/auth';

const organizerNav: WorkspaceNavItem[] = [
  { to: '/organizer', label: 'Ringkasan', icon: LayoutDashboard, end: true },
  { to: '/organizer/events', label: 'Acara Saya', icon: Calendar, end: false },
  { to: '/organizer/settings', label: 'Profil Organisasi', icon: Building2, end: false },
];

export function OrganizerShell() {
  const { user } = useAuth();

  // If user is logged in but hasn't created an organizer profile yet, guide them to apply
  if (user && !user.roles.includes('ORGANIZER') && !user.roles.includes('ADMIN')) {
    return <Navigate to="/organizer/apply" replace />;
  }

  return (
    <WorkspaceLayout
      workspace="Organizer"
      title="Menu Organizer"
      nav={organizerNav}
    >
      <Outlet />
    </WorkspaceLayout>
  );
}
