import type {
  CheckInResult,
  DiscountType,
  EventStatus,
  EventType,
  OrderStatus,
  OrganizerStatus,
  PaginationMeta,
  PaymentStatus,
  PlatformFeeType,
  TicketStatus,
  UserStatus,
} from '@gofest/shared';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
}

export interface TicketType {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quotaTotal: number;
  quantitySold: number;
  quantityReserved: number;
  available?: number;
  isOnSale?: boolean;
  salesStartAt: string | null;
  salesEndAt: string | null;
  minPerOrder: number;
  maxPerOrder: number;
  isActive: boolean;
  sortOrder: number;
}

export interface EventOrganizer {
  id?: string;
  organizationName: string;
  slug: string;
  logoKey?: string | null;
  status?: string;
}

export interface EventSummary {
  id: string;
  title: string;
  slug: string;
  summary: string;
  coverKey: string | null;
  type: EventType;
  venueName: string | null;
  city: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  status: EventStatus;
  isDemo: boolean;
  priceFrom: number | null;
  priceTo?: number | null;
  isSoldOut: boolean;
  isOnSale?: boolean;
  category: Pick<Category, 'id' | 'name' | 'slug'>;
  organizer: EventOrganizer;
}

export interface EventDetail extends Omit<EventSummary, 'priceTo'> {
  description: string;
  address: string | null;
  salesStartAt: string | null;
  salesEndAt: string | null;
  rules: string | null;
  refundPolicy: string | null;
  publishedAt: string | null;
  onlineAccessUrl?: string | null;
  onlineAccessNote?: string | null;
  ticketTypes: TicketType[];
  priceTo: number | null;
}

export interface EventManage extends EventSummary {
  description: string;
  address: string | null;
  onlineAccessUrl: string | null;
  onlineAccessNote: string | null;
  salesStartAt: string | null;
  salesEndAt: string | null;
  rules: string | null;
  refundPolicy: string | null;
  reviewNote: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  ticketTypes: TicketType[];
  totalQuota: number;
  totalSold: number;
  totalReserved: number;
  staff?: StaffAssignment[];
}

export interface EventStaffMember {
  user: { id: string; name: string; email: string; phone: string | null };
}

export interface StaffAssignment {
  id: string;
  role: 'CHECK_IN' | 'MANAGER';
  assignedAt: string;
  user: { id: string; name: string; email: string; phone?: string | null };
}

export interface OrganizerProfile {
  bannerKey?: string | null;
  fallbackBannerKey?: string | null;
  eventCounts?: { active: number; past: number; total: number };
  eventsPagination?: PaginationMeta;
  id: string;
  userId?: string;
  organizationName: string;
  slug: string;
  description: string | null;
  logoKey: string | null;
  status: OrganizerStatus;
  reviewNote?: string | null;
  createdAt: string;
  _count?: { events: number };
  user?: { id: string; name: string; email: string; phone: string | null; status: UserStatus };
  events?: Array<Omit<EventSummary, 'organizer'>>;
}

export interface Coupon {
  id: string;
  eventId: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount: number | null;
  minimumPurchase: number;
  maxRedemptions: number | null;
  maxPerUser: number | null;
  redeemedCount: number;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
}

export interface Payment {
  id?: string;
  provider: string;
  providerReference: string;
  method: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paidAt?: string | null;
  expiresAt?: string | null;
}

export interface TicketRecord {
  id: string;
  ticketCode: string;
  ticketTypeId?: string;
  ticketTypeName?: string;
  holderName: string;
  holderEmail?: string;
  status: TicketStatus;
  issuedAt: string;
  checkedInAt: string | null;
  checkedInByName?: string | null;
  qrUrl?: string;
}

export interface OrderItem {
  id: string;
  ticketTypeId: string;
  ticketNameSnapshot?: string;
  ticketTypeName?: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderEvent {
  id: string;
  title: string;
  slug: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  type?: EventType;
  venueName: string | null;
  address?: string | null;
  city: string | null;
  onlineAccessUrl?: string | null;
  onlineAccessNote?: string | null;
  organizer?: { organizationName: string; slug: string };
}

export interface Order {
  id: string;
  orderCode: string;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  platformFee: number;
  total: number;
  currency: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  createdAt: string;
  expiresAt: string;
  paidAt: string | null;
  event: OrderEvent;
  items: OrderItem[];
  payment: Payment | null;
  tickets: TicketRecord[];
  ticketCount?: number;
}

export interface CheckInSummary {
  event: {
    id: string;
    title: string;
    slug: string;
    status: EventStatus;
    startsAt: string;
    endsAt: string;
    timezone: string;
    venueName: string | null;
    city: string | null;
  };
  counts: { valid: number; checkedIn: number; cancelled: number; refunded: number };
  issued: number;
  attendanceRate: number;
  lastScanAt: string | null;
  recentScans: Array<{
    id: string;
    result: CheckInResult;
    gate: string | null;
    scannedAt: string;
    staffName: string;
    ticketCode: string | null;
    holderName: string | null;
  }>;
}

export interface ScanResult {
  result: CheckInResult;
  accepted: boolean;
  message: string;
  scannedAt: string;
  replayed: boolean;
  ticket: {
    id: string;
    ticketCode: string;
    holderName: string;
    status: TicketStatus;
    checkedInAt: string | null;
    ticketTypeName: string;
    orderCode: string;
  } | null;
}

export interface StaffEvent {
  id: string;
  title: string;
  slug: string;
  status: EventStatus;
  startsAt: string;
  endsAt: string;
  timezone: string;
  venueName: string | null;
  city: string | null;
  organizer: { organizationName: string };
  accessRole: 'OWNER' | 'CHECK_IN' | 'MANAGER';
  ticketCounts: { valid: number; checkedIn: number; cancelled: number; refunded: number };
}

export interface OrganizerDashboard {
  summary: {
    totalEvents: number;
    publishedEvents: number;
    draftEvents: number;
    pendingReviewEvents: number;
    upcomingEvents: number;
    quotaTotal: number;
    ticketsSold: number;
    ticketsReserved: number;
    ticketsCheckedIn: number;
    ticketsValid: number;
    grossRevenue: number;
    paidOrders: number;
    pendingOrders: number;
  };
  events: Array<{
    id: string;
    title: string;
    slug: string;
    status: EventStatus;
    startsAt: string;
    endsAt: string;
    timezone: string;
    city: string | null;
    venueName: string | null;
    category: { id: string; name: string; slug: string };
    ticketTypes: Array<{
      id: string;
      name: string;
      price: number;
      quotaTotal: number;
      quantitySold: number;
      quantityReserved: number;
      isActive: boolean;
    }>;
    quotaTotal: number;
    sold: number;
    reserved: number;
  }>;
  recentOrders: Array<{
    id: string;
    orderCode: string;
    status: OrderStatus;
    total: number;
    buyerName: string;
    buyerEmail: string;
    createdAt: string;
    paidAt: string | null;
    event: { id: string; title: string; slug: string; startsAt: string };
    ticketCount: number;
  }>;
}

export interface AdminDashboard {
  users: { total: number; active: number; suspended: number };
  organizers: { total: number; pending: number; active: number; suspended: number };
  events: {
    total: number;
    draft: number;
    pendingReview: number;
    published: number;
    cancelled: number;
  };
  orders: {
    total: number;
    paid: number;
    pendingPayment: number;
    paymentReview: number;
    refundPending: number;
    grossRevenue: number;
  };
  tickets: { issued: number; checkedIn: number; cancelled: number; refunded: number };
  recentOrders: Array<{
    id: string;
    orderCode: string;
    status: OrderStatus;
    total: number;
    buyerName: string;
    buyerEmail: string;
    createdAt: string;
    event: { id: string; title: string; slug: string };
  }>;
  reviewOrders: Array<{
    id: string;
    orderCode: string;
    total: number;
    buyerName: string;
    createdAt: string;
    event: { id: string; title: string };
    payment: Payment | null;
  }>;
  recentAudit: Array<{
    id: string;
    action: string;
    resourceType: string;
    resourceId: string | null;
    createdAt: string;
    actor: { name: string } | null;
  }>;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'USER' | 'ADMIN';
  status: UserStatus;
  emailVerifiedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  organizerProfile: {
    id: string;
    organizationName: string;
    slug?: string;
    status: OrganizerStatus;
  } | null;
  _count?: { orders: number; staffAssignments: number };
  orders?: AdminUserOrder[];
  staffAssignments?: Array<{
    role: 'CHECK_IN' | 'MANAGER';
    assignedAt: string;
    event: { id: string; title: string; startsAt: string };
  }>;
}

export interface AdminUserOrder {
  id: string;
  orderCode: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  event: { id: string; title: string };
}

export interface AdminOrganizer extends Omit<OrganizerProfile, 'events'> {
  user: { id: string; name: string; email: string; phone: string | null; status: UserStatus };
  events?: Array<{
    id: string;
    title: string;
    slug: string;
    status: EventStatus;
    startsAt: string;
    createdAt: string;
    _count?: { orders: number };
  }>;
}

export interface AdminEvent extends Omit<EventSummary, 'organizer'> {
  publishedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  description?: string;
  quotaTotal?: number;
  ticketsSold?: number;
  _count?: { orders: number; tickets: number; staff: number };
  organizer: EventOrganizer & { status?: OrganizerStatus; id?: string };
}

export interface AdminOrder extends Order {
  ticketCount?: number;
  payments?: Payment[];
}

export interface AuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  requestId: string | null;
  createdAt: string;
  actor: { id: string; name: string; email: string } | null;
}

export interface PlatformSettings {
  platformFeeType: PlatformFeeType;
  platformFeeValue: number;
  orderReservationMinutes: number;
  eventReviewRequired: boolean;
  updatedAt?: string;
}

export interface UploadResult {
  key: string;
  url: string;
  width: number;
  height: number;
  size: number;
  mimeType: string;
}

export interface TicketPageRecord {
  id: string;
  ticketCode: string;
  holderName: string;
  holderEmail: string;
  status: TicketStatus;
  issuedAt: string;
  checkedInAt: string | null;
  orderCode: string;
  qrUrl: string;
  ticketType: { name: string; price: number };
  event: {
    id: string;
    title: string;
    slug: string;
    startsAt: string;
    endsAt: string;
    timezone: string;
    type: EventType;
    venueName: string | null;
    address: string | null;
    city: string | null;
    onlineAccessUrl: string | null;
    onlineAccessNote: string | null;
    organizer: { organizationName: string; slug: string };
  };
}
