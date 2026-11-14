import { Outlet, ScrollRestoration, createBrowserRouter } from 'react-router-dom';
import { AuthProvider, RequireAuth } from '@/lib/auth';
import { PublicLayout } from '@/components/layout/public-layout';
import { HomePage } from '@/pages/public/home';
import { EventsPage } from '@/pages/public/events';
import { EventDetailPage } from '@/pages/public/event-detail';
import { OrganizerPublicPage } from '@/pages/public/organizer';
import { CheckoutPage } from '@/pages/public/checkout';
import { OrderPage } from '@/pages/public/order';
import { TicketPage } from '@/pages/public/ticket';
import { TermsPage, PrivacyPage } from '@/pages/public/legal';
import { LoginPage } from '@/pages/auth/login';
import { RegisterPage } from '@/pages/auth/register';
import { ForgotPasswordPage } from '@/pages/auth/forgot-password';
import { ResetPasswordPage } from '@/pages/auth/reset-password';
import { AccountLayout } from '@/pages/account/account-layout';
import { AccountOverviewPage } from '@/pages/account/overview';
import { AccountOrdersPage } from '@/pages/account/orders';
import { AccountOrderDetailPage } from '@/pages/account/order-detail';
import { AccountProfilePage } from '@/pages/account/profile';
import { OrganizerApplyPage } from '@/pages/organizer/apply';
import { OrganizerShell } from '@/pages/organizer/organizer-shell';
import { OrganizerDashboardPage } from '@/pages/organizer/dashboard';
import { OrganizerEventListPage } from '@/pages/organizer/events/event-list';
import { OrganizerEventFormPage } from '@/pages/organizer/events/event-form';
import { EventWorkspaceLayout } from '@/pages/organizer/events/event-workspace';
import { EventTicketManagementPage } from '@/pages/organizer/events/ticket-management';
import { EventCouponManagementPage } from '@/pages/organizer/events/coupon-management';
import { EventOrderManagementPage } from '@/pages/organizer/events/order-management';
import { EventStaffManagementPage } from '@/pages/organizer/events/staff-management';
import { EventCheckInSummaryPage } from '@/pages/organizer/events/checkin-summary';
import { OrganizerSettingsPage } from '@/pages/organizer/settings';
import { StaffEventsPage } from '@/pages/staff/events';
import { StaffCheckInScannerPage } from '@/pages/staff/check-in';

function RootLayout() {
  return (
    <AuthProvider>
      <ScrollRestoration />
      <Outlet />
    </AuthProvider>
  );
}

function NotFoundPage() {
  return (
    <main className="container flex min-h-[60vh] max-w-lg flex-col items-center justify-center py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-olive">404 · Halaman tidak ditemukan</p>
      <h1 className="mt-4 font-display text-5xl leading-none tracking-tightest">Acara atau halaman ini tidak ada.</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Tautan mungkin sudah berubah, acara dibatalkan, atau alamat diketik keliru. Kembali ke daftar acara untuk
        melihat jadwal yang tersedia.
      </p>
      <a
        href="/events"
        className="mt-8 inline-flex h-11 items-center justify-center rounded-md bg-brick px-6 text-sm font-semibold text-paper hover:bg-brick/90"
      >
        Lihat semua acara
      </a>
    </main>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/events', element: <EventsPage /> },
          { path: '/events/:slug', element: <EventDetailPage /> },
          { path: '/organizers/:slug', element: <OrganizerPublicPage /> },
          { path: '/checkout/:eventSlug', element: <CheckoutPage /> },
          { path: '/order/:orderCode', element: <OrderPage /> },
          { path: '/ticket/:ticketCode', element: <TicketPage /> },
          { path: '/terms', element: <TermsPage /> },
          { path: '/privacy', element: <PrivacyPage /> },
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
          { path: '/reset-password', element: <ResetPasswordPage /> },
          {
            path: '/account',
            element: (
              <RequireAuth>
                <AccountLayout />
              </RequireAuth>
            ),
            children: [
              { index: true, element: <AccountOverviewPage /> },
              { path: 'orders', element: <AccountOrdersPage /> },
              { path: 'orders/:id', element: <AccountOrderDetailPage /> },
              { path: 'profile', element: <AccountProfilePage /> },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      {
        path: '/organizer/apply',
        element: (
          <RequireAuth>
            <PublicLayout />
          </RequireAuth>
        ),
        children: [{ index: true, element: <OrganizerApplyPage /> }],
      },
      {
        path: '/organizer',
        element: (
          <RequireAuth roles={['ORGANIZER', 'ADMIN']}>
            <OrganizerShell />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <OrganizerDashboardPage /> },
          { path: 'events', element: <OrganizerEventListPage /> },
          { path: 'events/new', element: <OrganizerEventFormPage isNew /> },
          {
            path: 'events/:id',
            element: <EventWorkspaceLayout />,
            children: [
              { index: true, element: <OrganizerEventFormPage /> },
              { path: 'edit', element: <OrganizerEventFormPage /> },
              { path: 'tickets', element: <EventTicketManagementPage /> },
              { path: 'coupons', element: <EventCouponManagementPage /> },
              { path: 'orders', element: <EventOrderManagementPage /> },
              { path: 'staff', element: <EventStaffManagementPage /> },
              { path: 'check-in', element: <EventCheckInSummaryPage /> },
            ],
          },
          { path: 'settings', element: <OrganizerSettingsPage /> },
        ],
      },
      {
        path: '/staff',
        element: (
          <RequireAuth roles={['STAFF', 'ORGANIZER', 'ADMIN']}>
            <PublicLayout />
          </RequireAuth>
        ),
        children: [
          { path: 'events', element: <StaffEventsPage /> },
          { path: 'events/:id/check-in', element: <StaffCheckInScannerPage /> },
        ],
      },
    ],
  },
]);
