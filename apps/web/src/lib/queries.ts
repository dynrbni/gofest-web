import type { EventStatus, OrderStatus, PaginationMeta } from '@gofest/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, apiPage } from './api';
import type {
  AdminDashboard,
  Category,
  EventDetail,
  EventManage,
  EventSummary,
  OrganizerDashboard,
  OrganizerProfile,
  StaffEvent,
} from './models';

export interface EventFilters {
  q?: string;
  category?: string;
  city?: string;
  dateFrom?: string;
  dateTo?: string;
  price?: 'all' | 'free' | 'paid';
  availability?: 'all' | 'available' | 'sold_out';
  sort?: 'starts_soon' | 'published_newest';
  page?: number;
  limit?: number;
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api<{ categories: Category[] }>('/categories'),
    staleTime: 5 * 60_000,
  });
}

export function usePublicEvents(filters: EventFilters) {
  return useQuery({
    queryKey: ['public-events', filters],
    queryFn: () => apiPage<EventSummary>('/events', { query: { ...filters } }),
    placeholderData: keepPreviousData,
  });
}

export function usePublicEvent(slug: string | undefined) {
  return useQuery({
    queryKey: ['public-event', slug],
    queryFn: () => api<{ event: EventDetail }>(`/events/${encodeURIComponent(slug!)}`),
    enabled: Boolean(slug),
  });
}

export function usePublicOrganizer(
  slug: string | undefined,
  filters: { period?: 'active' | 'past'; page?: number } = {},
) {
  return useQuery({
    queryKey: ['public-organizer', slug, filters],
    placeholderData: keepPreviousData,
    queryFn: () =>
      api<{ organizer: OrganizerProfile }>(`/organizers/${encodeURIComponent(slug!)}`, {
        query: filters,
      }),
    enabled: Boolean(slug),
  });
}

export function useOrganizerDashboard() {
  return useQuery({
    queryKey: ['organizer-dashboard'],
    queryFn: () => api<OrganizerDashboard>('/organizer/dashboard'),
  });
}

export function useOrganizerEvents(params: {
  page?: number;
  limit?: number;
  status?: EventStatus;
  q?: string;
}) {
  return useQuery({
    queryKey: ['organizer-events', params],
    queryFn: () => apiPage<EventSummary>('/organizer/events', { query: { ...params } }),
    placeholderData: keepPreviousData,
  });
}

export function useOrganizerEvent(id: string | undefined) {
  return useQuery({
    queryKey: ['organizer-event', id],
    queryFn: () => api<{ event: EventManage }>(`/organizer/events/${encodeURIComponent(id!)}`),
    enabled: Boolean(id),
  });
}

export function useOrganizerProfile() {
  return useQuery({
    queryKey: ['organizer-profile'],
    queryFn: () => api<{ organizer: OrganizerProfile }>('/organizer/account/profile'),
    retry: false,
  });
}

export function useAccountOrders(page: number, limit = 10, status?: OrderStatus, q?: string) {
  return useQuery({
    queryKey: ['account-orders', page, limit, status, q],
    queryFn: () =>
      apiPage<import('./models').Order>('/account/orders', {
        query: { page, limit, status, q },
      }),
    placeholderData: keepPreviousData,
  });
}

export function usePlatformSettings() {
  return useQuery({
    queryKey: ['platform-settings-public'],
    queryFn: () =>
      api<{
        settings: {
          platformFeeType: 'none' | 'fixed' | 'percentage';
          platformFeeValue: number;
          orderReservationMinutes: number;
        };
      }>('/settings'),
    staleTime: 5 * 60_000,
  });
}

export function useStaffEvents() {
  return useQuery({
    queryKey: ['staff-events'],
    queryFn: () => api<{ events: StaffEvent[] }>('/staff/events'),
  });
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api<AdminDashboard>('/admin/dashboard'),
  });
}

export function useAdminList<T>(
  key: string,
  path: string,
  params: Record<string, string | number | undefined>,
) {
  return useQuery({
    queryKey: [key, params],
    queryFn: () => apiPage<T>(path, { query: params }),
    placeholderData: keepPreviousData,
  });
}

export interface EventOrderRow {
  id: string;
  orderCode: string;
  status: OrderStatus;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  total: number;
  createdAt: string;
  paidAt: string | null;
  tickets: Array<{ id: string; ticketCode: string; holderName: string; status: string }>;
  ticketCount: number;
}

export function pageMeta(meta: PaginationMeta | undefined | null): PaginationMeta {
  return meta ?? { page: 1, limit: 10, total: 0, totalPages: 1 };
}
