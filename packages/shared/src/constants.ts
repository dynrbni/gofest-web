import type {
  CheckInResult,
  EventStatus,
  EventType,
  OrderStatus,
  OrganizerStatus,
  TicketStatus,
  UserStatus,
} from './enums';

export const SITE_NAME = 'Gofest';
export const SITE_DESCRIPTION =
  'Temukan acara musik, festival, dan pertemuan yang layak keluar rumah. Beli tiket dengan alur yang jelas.';
export const DEFAULT_TIMEZONE = 'Asia/Jakarta';
export const DEFAULT_CURRENCY = 'IDR';
export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 100;
export const ORDER_ACCESS_TOKEN_QUERY = 'token';

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: 'Draf',
  PENDING_REVIEW: 'Menunggu review',
  PUBLISHED: 'Tayang',
  REJECTED: 'Ditolak',
  CANCELLED: 'Dibatalkan',
  COMPLETED: 'Selesai',
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  ONLINE: 'Online',
  OFFLINE: 'Offline',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Menunggu pembayaran',
  PAID: 'Lunas',
  EXPIRED: 'Kedaluwarsa',
  CANCELLED: 'Dibatalkan',
  PAYMENT_REVIEW: 'Perlu peninjauan',
  REFUND_PENDING: 'Menunggu refund',
  REFUNDED: 'Dana dikembalikan',
  PARTIALLY_REFUNDED: 'Refund sebagian',
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  VALID: 'Berlaku',
  CHECKED_IN: 'Sudah check-in',
  CANCELLED: 'Dibatalkan',
  REFUNDED: 'Dana dikembalikan',
};

export const ORGANIZER_STATUS_LABELS: Record<OrganizerStatus, string> = {
  PENDING: 'Menunggu review',
  ACTIVE: 'Aktif',
  REJECTED: 'Ditolak',
  SUSPENDED: 'Ditangguhkan',
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Aktif',
  PENDING_VERIFICATION: 'Belum verifikasi',
  SUSPENDED: 'Ditangguhkan',
  DELETED: 'Dihapus',
};

export const CHECK_IN_RESULT_LABELS: Record<CheckInResult, string> = {
  VALID: 'Tiket valid, check-in berhasil',
  ALREADY_USED: 'Tiket sudah pernah check-in',
  INVALID: 'Tiket tidak ditemukan',
  CANCELLED: 'Tiket dibatalkan atau di-refund',
  WRONG_EVENT: 'Tiket bukan untuk event ini',
};

export const ORDER_STATUS_TONE: Record<
  OrderStatus,
  'neutral' | 'warning' | 'success' | 'danger' | 'info'
> = {
  PENDING_PAYMENT: 'warning',
  PAID: 'success',
  EXPIRED: 'neutral',
  CANCELLED: 'danger',
  PAYMENT_REVIEW: 'warning',
  REFUND_PENDING: 'info',
  REFUNDED: 'info',
  PARTIALLY_REFUNDED: 'info',
};
