export interface ApiErrorDetail {
  path: string;
  message: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
  requestId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  meta: Record<string, unknown> | null;
  error: ApiError | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  [key: string]: unknown;
}

export interface AuthUser {
  avatarKey?: string | null;
  id: string;
  name: string;
  email: string;
  phone: string | null;
  roles: string[];
  organizerStatus: string | null;
  organizerSlug: string | null;
}

export interface OrganizerSummary {
  id: string;
  organizationName: string;
  slug: string;
  logoKey: string | null;
  status: string;
}

export interface EventSummary {
  id: string;
  title: string;
  slug: string;
  summary: string;
  coverKey: string | null;
  type: string;
  venueName: string | null;
  city: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  status: string;
  isDemo: boolean;
  category: { id: string; name: string; slug: string };
  organizer: OrganizerSummary;
  priceFrom: number | null;
  isSoldOut: boolean;
}

export interface TicketTypeSummary {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quotaTotal: number;
  quantitySold: number;
  quantityReserved: number;
  available: number;
  salesStartAt: string | null;
  salesEndAt: string | null;
  minPerOrder: number;
  maxPerOrder: number;
  isActive: boolean;
  isOnSale: boolean;
}

export interface OrderSummary {
  id: string;
  orderCode: string;
  status: string;
  total: number;
  currency: string;
  buyerName: string;
  buyerEmail: string;
  createdAt: string;
  expiresAt: string;
  paidAt: string | null;
  event: {
    id: string;
    title: string;
    slug: string;
    startsAt: string;
    timezone: string;
    venueName: string | null;
    city: string | null;
    type: string;
  };
  itemCount: number;
  ticketCount: number;
}
