# GoFest customer dashboard redesign

Status: approved by the user on 2026-11-16. Implementation and pushes per coherent change group are authorized.

## Scope and design

Redesign only the authenticated customer area. Keep React 19, Vite, React Router, TanStack Query, Tailwind, Express, Prisma, PostgreSQL, cookie authentication, guest checkout and existing payment/check-in lifecycles. The supplied customer-dashboard brief takes precedence over older design notes for this area, including its Poppins requirement.

Desktop uses a white 248px sidebar, compact topbar, and a spacious content area on #F8FAFC. Sidebar groups: Overview (Dashboard), My Activities (Tiket Saya, Riwayat Pesanan, Event Favorit), Account (Profil Saya, Pengaturan), with logout at the bottom. Main text is #111827; secondary text #64748B; borders #E2E8F0; primary actions #0052CC. Panels use 12–16px corners. The current original logo and actual event posters provide identity. No new illustration, fabricated avatar, statistic or notification count is needed.

Customer routes move outside PublicLayout into their own authenticated shell. Public navigation and footer remain as they are. Desktop uses the sidebar; mobile uses a compact header and fixed Home/Tiket/Favorit/Profil navigation with safe-area padding. Orders and settings remain reachable through page shortcuts and the account menu. At intermediate widths, keep a readable content column rather than compressing the sidebar and cards together. Page titles use one h1; all controls have visible labels, keyboard focus, and touch targets at least 44px.

Design read: ENERGY 2 / RHYTHM 2 / MOTION 1. Actual posters distinguish events; a prominent next-event ticket provides a clear entry point. Three restrained activity summaries support the ticket content. Motion is limited to loading and interaction feedback and respects reduced motion.

## Approaches considered

1. Recommended: dedicated customer shell plus small authenticated read endpoints for statistics and ticket search. This provides accurate totals and filtering across all results without altering write flows or database schema.
2. Frontend-only redesign using the existing paginated order response. Less backend work, but counts and ticket filters would be wrong if calculated from only the loaded page. Reject this approach.
3. Build favorites, avatar storage and account-notification infrastructure now. This exceeds the brief's instruction to document unsupported backend features. Defer it.

## Repository audit

- Routes: apps/web/src/app/router.tsx currently nests /account under PublicLayout and RequireAuth. Existing children are overview, tickets, orders, orders/:id and profile.
- Existing account screens: apps/web/src/pages/account/{account-layout,overview,tickets,orders,order-detail,profile}.tsx.
- UI reuse: Radix-backed button, input, select, dialog, alert dialog, avatar, dropdown, tabs; shared loading/error/empty states, pagination, confirmation dialog, language menu, brand logo, status badges and EventCard.
- Query layer: apps/web/src/lib/queries.ts has useAccountOrders, with page/limit/order-status/text filters and TanStack Query caching.
- Data: Prisma User has name/email/phone and authentication relations, but no avatar, favorite-event relation or customer-notification preferences.
- Ownership: listAccountOrders and getAccountOrder constrain queries with authenticated userId. Ticket retrieval permits the owning user or the existing order access token. Preserve those boundaries.
- Order, payment and ticket statuses are separate Prisma enums. FAILED exists on PaymentStatus, not OrderStatus. Preserve that distinction in all labels and filters.
- Ticket QR generation/storage, authenticated/token-protected retrieval, regeneration, check-in timestamps and print already exist. Issued tickets have individual codes; the scanner owns single-use enforcement.
- Guest orders are not claimed by matching a login email. No verified guest-order claim endpoint was found. Do not add implicit linking.
- Public event listing excludes ended/unpublished events and supports availability filtering, but quota availability alone does not validate event/ticket sale windows. Recommendations must check real active sale windows and inventory before offering an event.
- Existing profile PATCH supports name and phone; email is not editable. Password reset is email-token based. No authenticated direct password-change or logout-all endpoint exists.
- Working tree contains concurrent unrelated edits. Stage only files/hunks belonging to this redesign. Preserve checkout, authentication and marketplace edits.

## Pages and behavior

### Overview: /account

Time-aware greeting and authenticated name, with an initials avatar derived from the real name. Show total issued tickets, upcoming distinct events and total orders from authenticated database aggregates, never a page-length approximation. Upcoming counts require a usable ticket, an eligible paid order and an event that has not ended; exclude cancelled events. A currently ongoing event may appear until its end time. Sort by event start ascending.

The next-event list shows poster, title, local event schedule/timezone, venue or online label, ticket category, quantity and ticket status, with a real ticket-detail link. A concise empty state links to /events. Quick access links lead to tickets, orders, favorites and profile. Recommendations reuse EventCard and only show genuinely purchasable future/ongoing events. Recommendation failure does not hide the user's ticket information.

### Ticket wallet: /account/tickets

Upcoming, past and cancelled/invalid views with event-name search, date range and server pagination. Filtering happens before pagination. Past includes checked-in tickets; invalid includes cancelled/refunded tickets and tickets for cancelled events. Each ticket shows poster, event, schedule, venue, holder, ticket category, unique code and ticket status independently from payment status.

Add a customer ticket-detail route under /account/tickets/:ticketCode. Reuse existing protected ticket and QR APIs, while leaving the public/guest /ticket/:ticketCode route intact. Show a readable QR, holder/category/code, event details and check-in state. Checked-in tickets clearly say they have already been used. Invalid tickets must not show an entry QR. QR regeneration and printing use the existing supported functionality and confirmation behavior; no client-generated QR.

Before implementation, verify the existing issuance/QR invariant for paid and refunded orders. If the existing public QR endpoint permits an unintended state, document it and make only the narrowly necessary authorization/payment guard correction with regression coverage; leave scanner logic untouched.

### Order history: /account/orders and /account/orders/:id

Search by order code/event title; date range; order status and payment status are separate filters. Include pending, paid, expired, failed and refunded payment states using the actual latest payment status. Preserve other existing lifecycle states where relevant. All filters apply on the server before pagination and persist in the URL, including Back/reload behavior. Reset the page when a filter changes.

List order code, event, transaction time, purchased quantity, total, actual method/provider and explicit payment status. Unset methods are described honestly. Detail shows buyer, event, order status, payment status, purchased category breakdown, subtotal, discount, service fee, total and issued tickets. Pending payments link to the existing payment flow rather than reimplementing checkout. Never equate payment success with check-in.

### Favorites: /account/favorites

The backend has no favorites model or API. Provide a truthful availability state with a working event-discovery link, not a fabricated empty saved list, pretend save/remove controls or browser-only substitute. Document the dependency on authenticated persistent favorites APIs and marketplace save controls. The reusable EventCard is ready for a future persisted list but no unsupported functionality is claimed.

### Profile: /account/profile

Show an initials avatar and real account information. Edit name and WhatsApp/phone using the existing shared validation and PATCH endpoint. Email remains read-only with a clear explanation. Include saving, validation, recoverable error and success feedback; prevent duplicate submits. Use the real email reset request flow for password security, with confirmation and accurate generic success messaging. No photo upload or inline password-change form without supporting endpoints.

### Settings: /account/settings

Use the existing ID/English preference, clearly scoped to this browser. Provide a real password-reset-by-email action, current-session logout and links to profile/security information. Do not add unpersisted notification toggles, fabricated notifications, device lists or a logout-all button. Explain notification preferences are unavailable where needed, without rendering disabled controls as working features.

## Minimal data/API work

Add customer-only read services/routes for dashboard aggregates and ticket wallet pagination. Derive identity exclusively from requireAuth. Validate query parameters and date ranges with shared Zod schemas. Extend account-order read filters without changing checkout creation, payment processing, organizer/admin listing semantics or the database schema. Queries must select only necessary fields, avoid exposing QR storage keys/access tokens/private identity snapshots, and use existing Prisma parameterization.

Use auth-scoped query keys for new customer data. Clear or invalidate on logout and after relevant mutations. Keep loading, error and empty states per data section. Include event cover metadata and category names in customer results without changing public component behavior. Define typed response contracts and share existing status types.

## Verification and delivery

- Baseline on 2026-11-16: pnpm lint succeeds with five existing unused-variable warnings in event-presentation.tsx. pnpm typecheck succeeds for shared, API and web.
- Add API coverage for authentication, cross-user denial, complete aggregates, ticket periods, invalid tickets, date/search filters, payment-status separation, pagination and recommendation availability.
- Exercise real customer navigation, ticket detail/QR/print behavior, order filters/detail, profile validation/save, reset request, language and logout. Verify empty/loading/error states. Use test fixtures only in test execution, never to replace production data.
- Inspect desktop/tablet/mobile at 1440, 1024, 768, 390 and 320px. Check no horizontal overflow, accessible labels/focus, fixed-navigation clearance, long names, missing posters and reduced motion.
- Run pnpm lint, pnpm typecheck, pnpm test and pnpm build. Record any pre-existing failures separately and fix errors introduced by this work.
- Record touched files, evidence and backend limitations in docs/qa. Commit coherent verified groups and push each to the existing origin/main, as requested. Never stage unrelated local changes or force push.

## Review decision

Approve the dedicated customer shell and narrow read-only API additions, with unsupported favorites, uploads, notification preferences, direct password change, logout-all and guest-order claiming documented rather than simulated.
