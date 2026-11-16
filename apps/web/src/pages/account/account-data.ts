import { useQuery } from '@tanstack/react-query';
import type { AccountHistoryQuery, AccountTicketQuery, EventStatus } from '@gofest/shared';
import { useAuth } from '@/lib/auth';
import { api, apiPage } from '@/lib/api';
import type { EventSummary, Order, OrderEvent, TicketRecord } from '@/lib/models';

export interface AccountEvent extends OrderEvent {
  coverKey: string | null;
  status: EventStatus;
}
export interface WalletTicket extends TicketRecord {
  ticketType: { id: string; name: string };
  event: AccountEvent;
  order: { id: string; orderCode: string; status: Order['status'] };
}
export interface AccountDashboard {
  summary: { totalTickets: number; upcomingEvents: number; totalOrders: number };
  upcoming: Array<
    AccountEvent & { tickets: Array<TicketRecord & { ticketType: { id: string; name: string } }> }
  >;
}
export function useAccountDashboard() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['customer', user?.id, 'dashboard'],
    enabled: Boolean(user),
    queryFn: ({ signal }) => api<AccountDashboard>('/account/dashboard', { signal }),
  });
}
export function useAccountTickets(filters: AccountTicketQuery) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['customer', user?.id, 'tickets', filters],
    enabled: Boolean(user),
    queryFn: ({ signal }) =>
      apiPage<WalletTicket>('/account/tickets', { query: { ...filters }, signal }),
  });
}
export function useAccountHistory(filters: AccountHistoryQuery) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['customer', user?.id, 'history', filters],
    enabled: Boolean(user),
    queryFn: ({ signal }) =>
      apiPage<Order & { event: AccountEvent }>('/account/history', {
        query: { ...filters },
        signal,
      }),
  });
}
export function useAccountRecommendations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['customer', user?.id, 'recommendations'],
    enabled: Boolean(user),
    queryFn: ({ signal }) =>
      api<{ events: EventSummary[] }>('/account/recommendations', { signal }),
  });
}
