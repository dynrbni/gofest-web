import { Outlet, ScrollRestoration, createBrowserRouter } from 'react-router-dom';
import { lazy, type ComponentType } from 'react';
import { RouteTransition } from '@/components/common/route-transition';
import { BrandLogo } from '@/components/common/brand-logo';
import { AuthProvider, RequireAuth } from '@/lib/auth';
import { CheckoutLayout } from '@/components/layout/checkout-layout';
import { PublicLayout } from '@/components/layout/public-layout';
import { AuthLayout } from '@/pages/auth/auth-layout';
import { LoginPage } from '@/pages/auth/login';
import { RegisterPage } from '@/pages/auth/register';
import { ForgotPasswordPage } from '@/pages/auth/forgot-password';
import { ResetPasswordPage } from '@/pages/auth/reset-password';
import { AccountLayout } from '@/pages/account/account-layout';

function lazyPage<Props extends object>(load: () => Promise<ComponentType<Props>>) {
  return lazy(async () => ({ default: await load() }));
}

const HomePage = lazyPage(() => import('@/pages/public/home').then((m) => m.HomePage));
const AccountTicketsPage = lazyPage(() =>
  import('@/pages/account/tickets').then((m) => m.AccountTicketsPage),
);
const OrganizerShell = lazyPage(() =>
  import('@/pages/organizer/organizer-shell').then((m) => m.OrganizerShell),
);
const AdminShell = lazyPage(() => import('@/pages/admin/admin-shell').then((m) => m.AdminShell));
const EventsPage = lazyPage(() => import('@/pages/public/events').then((m) => m.EventsPage));
const CityEventsPage = lazyPage(() =>
  import('@/pages/public/city-events').then((m) => m.CityEventsPage),
);
const CitiesPage = lazyPage(() => import('@/pages/public/city-events').then((m) => m.CitiesPage));
const EventDetailPage = lazyPage(() =>
  import('@/pages/public/event-detail').then((m) => m.EventDetailPage),
);
const OrganizerPublicPage = lazyPage(() =>
  import('@/pages/public/organizer').then((m) => m.OrganizerPublicPage),
);
const CheckoutPage = lazyPage(() => import('@/pages/public/checkout').then((m) => m.CheckoutPage));
const OrderPage = lazyPage(() => import('@/pages/public/order').then((m) => m.OrderPage));
const TicketPage = lazyPage(() => import('@/pages/public/ticket').then((m) => m.TicketPage));
const TermsPage = lazyPage(() => import('@/pages/public/legal').then((m) => m.TermsPage));
const PrivacyPage = lazyPage(() => import('@/pages/public/legal').then((m) => m.PrivacyPage));
const AccountOverviewPage = lazyPage(() =>
  import('@/pages/account/overview').then((m) => m.AccountOverviewPage),
);
const AccountOrdersPage = lazyPage(() =>
  import('@/pages/account/orders').then((m) => m.AccountOrdersPage),
);
const AccountOrderDetailPage = lazyPage(() =>
  import('@/pages/account/order-detail').then((m) => m.AccountOrderDetailPage),
);
const AccountFavoritesPage = lazyPage(() =>
  import('@/pages/account/favorites').then((m) => m.AccountFavoritesPage),
);
const AccountSettingsPage = lazyPage(() =>
  import('@/pages/account/settings').then((m) => m.AccountSettingsPage),
);
const AccountTicketDetailPage = lazyPage(() =>
  import('@/pages/account/ticket-detail').then((m) => m.AccountTicketDetailPage),
);
const AccountProfilePage = lazyPage(() =>
  import('@/pages/account/profile').then((m) => m.AccountProfilePage),
);
const OrganizerApplyPage = lazyPage(() =>
  import('@/pages/organizer/apply').then((m) => m.OrganizerApplyPage),
);
const OrganizerDashboardPage = lazyPage(() =>
  import('@/pages/organizer/dashboard').then((m) => m.OrganizerDashboardPage),
);
const OrganizerEventListPage = lazyPage(() =>
  import('@/pages/organizer/events/event-list').then((m) => m.OrganizerEventListPage),
);
const OrganizerEventFormPage = lazyPage(() =>
  import('@/pages/organizer/events/event-form').then((m) => m.OrganizerEventFormPage),
);
const EventWorkspaceLayout = lazyPage(() =>
  import('@/pages/organizer/events/event-workspace').then((m) => m.EventWorkspaceLayout),
);
const EventTicketManagementPage = lazyPage(() =>
  import('@/pages/organizer/events/ticket-management').then((m) => m.EventTicketManagementPage),
);
const EventCouponManagementPage = lazyPage(() =>
  import('@/pages/organizer/events/coupon-management').then((m) => m.EventCouponManagementPage),
);
const EventOrderManagementPage = lazyPage(() =>
  import('@/pages/organizer/events/order-management').then((m) => m.EventOrderManagementPage),
);
const EventStaffManagementPage = lazyPage(() =>
  import('@/pages/organizer/events/staff-management').then((m) => m.EventStaffManagementPage),
);
const EventCheckInSummaryPage = lazyPage(() =>
  import('@/pages/organizer/events/checkin-summary').then((m) => m.EventCheckInSummaryPage),
);
const OrganizerSettingsPage = lazyPage(() =>
  import('@/pages/organizer/settings').then((m) => m.OrganizerSettingsPage),
);
const StaffEventsPage = lazyPage(() =>
  import('@/pages/staff/events').then((m) => m.StaffEventsPage),
);
const StaffCheckInScannerPage = lazyPage(() =>
  import('@/pages/staff/check-in').then((m) => m.StaffCheckInScannerPage),
);
const AdminOverviewPage = lazyPage(() =>
  import('@/pages/admin/overview').then((m) => m.AdminOverviewPage),
);
const AdminUsersPage = lazyPage(() => import('@/pages/admin/users').then((m) => m.AdminUsersPage));
const AdminOrganizersPage = lazyPage(() =>
  import('@/pages/admin/organizers').then((m) => m.AdminOrganizersPage),
);
const AdminEventsPage = lazyPage(() =>
  import('@/pages/admin/events').then((m) => m.AdminEventsPage),
);
const AdminOrdersPage = lazyPage(() =>
  import('@/pages/admin/orders').then((m) => m.AdminOrdersPage),
);
const AdminCategoriesPage = lazyPage(() =>
  import('@/pages/admin/categories').then((m) => m.AdminCategoriesPage),
);
const AdminSettingsPage = lazyPage(() =>
  import('@/pages/admin/settings').then((m) => m.AdminSettingsPage),
);
const AdminAuditLogsPage = lazyPage(() =>
  import('@/pages/admin/audit-logs').then((m) => m.AdminAuditLogsPage),
);

function RootLayout() {
  return (
    <AuthProvider>
      <ScrollRestoration />
      <RouteTransition>
        <Outlet />
      </RouteTransition>
    </AuthProvider>
  );
}

function RouteErrorPage() {
  return (
    <main className="container flex min-h-screen max-w-xl flex-col items-start justify-center py-12">
      <BrandLogo />
      <h1 className="mt-3 text-3xl font-semibold">Halaman belum bisa ditampilkan.</h1>
      <p className="mt-4 text-sm leading-7 text-slate-600">
        Muat ulang halaman untuk mencoba lagi. Jika masalah berlanjut, kembali ke daftar acara.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={() => window.location.reload()} className="primary-action">
          Muat ulang
        </button>
        <a href="/events" className="text-link">
          Lihat acara
        </a>
      </div>
    </main>
  );
}

function NotFoundPage() {
  return (
    <main className="container flex min-h-[60vh] max-w-lg flex-col items-center justify-center py-16 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-olive">
        404 · Halaman tidak ditemukan
      </p>
      <h1 className="mt-4 font-display text-5xl leading-none tracking-tightest">
        Acara atau halaman ini tidak ada.
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Tautan mungkin sudah berubah, acara dibatalkan, atau alamat diketik keliru. Kembali ke
        daftar acara untuk melihat jadwal yang tersedia.
      </p>
      <a
        href="/events"
        className="mt-8 inline-flex h-11 items-center justify-center rounded-md bg-brick px-6 text-sm font-medium text-paper hover:bg-brick/90"
      >
        Lihat semua acara
      </a>
    </main>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <CheckoutLayout />,
        children: [
          { path: '/checkout/:eventSlug', element: <CheckoutPage /> },
          { path: '/order/:orderCode', element: <OrderPage /> },
        ],
      },
      {
        path: '/account',
        element: <AccountLayout />,
        children: [
          { index: true, element: <AccountOverviewPage /> },
          { path: 'orders', element: <AccountOrdersPage /> },
          { path: 'tickets', element: <AccountTicketsPage /> },
          { path: 'tickets/:ticketCode', element: <AccountTicketDetailPage /> },
          { path: 'favorites', element: <AccountFavoritesPage /> },
          { path: 'settings', element: <AccountSettingsPage /> },
          { path: 'orders/:id', element: <AccountOrderDetailPage /> },
          { path: 'profile', element: <AccountProfilePage /> },
        ],
      },
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
          { path: '/reset-password', element: <ResetPasswordPage /> },
        ],
      },
      {
        element: <PublicLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/events', element: <EventsPage /> },
          { path: '/cities', element: <CitiesPage /> },
          { path: '/events/city/:citySlug', element: <CityEventsPage /> },
          { path: '/events/:slug', element: <EventDetailPage /> },
          { path: '/organizers/:slug', element: <OrganizerPublicPage /> },
          { path: '/ticket/:ticketCode', element: <TicketPage /> },
          { path: '/terms', element: <TermsPage /> },
          { path: '/privacy', element: <PrivacyPage /> },
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
      {
        path: '/admin',
        element: (
          <RequireAuth roles={['ADMIN']}>
            <AdminShell />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <AdminOverviewPage /> },
          { path: 'users', element: <AdminUsersPage /> },
          { path: 'organizers', element: <AdminOrganizersPage /> },
          { path: 'events', element: <AdminEventsPage /> },
          { path: 'orders', element: <AdminOrdersPage /> },
          { path: 'categories', element: <AdminCategoriesPage /> },
          { path: 'settings', element: <AdminSettingsPage /> },
          { path: 'audit-logs', element: <AdminAuditLogsPage /> },
        ],
      },
    ],
  },
]);
