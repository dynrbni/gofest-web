import type { EventStatus, OrderStatus } from '@gofest/shared';

export interface LedgerEntry {
  id: string;
  transactionType: string;
  amount: number;
  debit: string;
  credit: string;
  referenceId: string;
  description: string;
  createdAt: string;
}
export interface FinancialData {
  range: { from: string; to: string };
  grossTicketSales: number;
  serviceFeeRevenue: number;
  paymentGatewayCosts: number | null;
  netFeeIncome: number;
  netFeeIncomeProvisional: boolean;
  totalRefunds: number;
  organizerProceeds: number;
  availableBalance: number;
  reservedBalance: number;
  pendingBalance: number;
  totalWithdrawn: number;
  outstandingOrganizerFunds: number;
  pendingPayouts: number;
  recentLedger: LedgerEntry[];
}
export interface WorkspaceOrder {
  id: string;
  orderCode: string;
  buyerName: string;
  buyerEmail?: string;
  total: number;
  subtotal?: number;
  discount?: number;
  platformFee?: number;
  status: OrderStatus;
  createdAt: string;
  event: { id: string; title: string };
}
export interface WorkspaceEvent {
  id: string;
  title: string;
  slug: string;
  startsAt: string;
  status: EventStatus;
  reviewNote: string | null;
  organizer: { organizationName: string };
}
export interface AnalyticsData {
  financial: FinancialData;
  summary: {
    totalTransactions: number;
    ticketsSold: number;
    totalEvents: number;
    activeEvents: number;
    registeredUsers: number | null;
    pendingEventApprovals: number;
    pendingPayouts: number;
    totalAttendees: number;
    checkedInAttendees: number;
  };
  trend: {
    date: string;
    ticketSales: number;
    serviceFees: number;
    tickets: number;
    transactions: number;
  }[];
  paymentDistribution: { status: string; count: number }[];
  eventPerformance: { id: string; title: string; tickets: number; sales: number }[];
  recentOrders: WorkspaceOrder[];
  recentEvents: WorkspaceEvent[];
  pendingEventReviews: WorkspaceEvent[];
  upcomingEvents: WorkspaceEvent[];
  recentCheckIns: {
    id: string;
    result: string;
    scannedAt: string;
    ticket: { holderName: string } | null;
    event: { title: string };
  }[];
  recentActivities: {
    id: string;
    action: string;
    createdAt: string;
    actor: { name: string } | null;
  }[];
  pendingPayouts: {
    id: string;
    amount: number;
    status: string;
    organizer: { organizationName: string };
  }[];
  recentRefunds: { id: string; amount: number; status: string; order: { orderCode: string } }[];
}
export interface BankAccount {
  id: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  isActive: boolean;
}
export interface Payout {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  note: string | null;
  bankSnapshot: Omit<BankAccount, 'id' | 'isActive'>;
  organizer: { organizationName: string };
  reviewedBy: { name: string } | null;
  providerMessage: string;
  wallet?: { available: number; reserved: number } | null;
  transactions?: {
    id: string;
    status: string;
    providerReference: string | null;
    createdAt: string;
    note: string | null;
  }[];
}
export interface EventReport {
  id: string;
  title: string;
  organizer: { organizationName: string };
  totalTicketsSold: number;
  grossTicketSales: number;
  discountAmount: number;
  serviceFeeRevenue: number;
  refundAmount: number;
  organizerProceeds: number;
  paidOutAmount: number;
  outstandingBalance: number;
}
export interface RefundRecord {
  id: string;
  orderId: string;
  amount: number;
  ticketAmount: number;
  feeAmount: number;
  status: string;
  reason: string;
  note: string | null;
  provider: string;
  createdAt: string;
  order: { orderCode: string; buyerName: string; event: { title: string } };
  reviewedBy: { name: string } | null;
}
