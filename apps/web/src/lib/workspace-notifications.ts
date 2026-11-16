import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export interface WorkspaceNotice {
  id: string;
  title: string;
  message: string;
  href: string | null;
  category: string;
  readAt: string | null;
  createdAt: string;
}
interface NotificationInbox {
  notifications: WorkspaceNotice[];
  unread: number;
  unreadByCategory: Record<string, number>;
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const configuredInterval = Number(import.meta.env.VITE_NOTIFICATION_POLL_INTERVAL_MS ?? 30_000);
export const notificationPollInterval = Number.isFinite(configuredInterval)
  ? Math.max(10_000, configuredInterval)
  : 30_000;

export function useWorkspaceNotifications(apiBase: string, page = 1, limit = 20) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['workspace-notifications', user?.id, apiBase, page, limit],
    queryFn: () => api<NotificationInbox>(`${apiBase}/notifications`, { query: { page, limit } }),
    enabled: Boolean(user),
    staleTime: 10_000,
    refetchInterval: notificationPollInterval,
    refetchIntervalInBackground: false,
  });
}

export function notificationCategoryForMenu(to: string): string | undefined {
  if (to === '/admin/events?status=PENDING_REVIEW') return 'EVENT_REVIEW';
  if (to === '/creator/events' || to === '/organizer/events') return 'EVENT';
  const section = to.split('/')[2];
  if (to.includes('?') || to.split('/').length !== 3) return undefined;
  return (
    {
      orders: 'ORDER',
      refunds: 'REFUND',
      support: 'SUPPORT',
      payouts: 'PAYOUT',
      organizers: 'ORGANIZER',
      'check-in': 'CHECK_IN',
    } as Record<string, string>
  )[section ?? ''];
}
