# Customer dashboard implementation plan

> Execute inline in this session, with verification and a GitHub push after each coherent change group. The user approved implementation and these pushes on 2026-11-16.

**Goal:** Deliver the approved customer ticketing hub with actual authenticated data.

**Architecture:** A dedicated authenticated customer layout consumes small account-only read endpoints. Existing checkout, payment, QR, scanner and public marketplace flows remain the source of truth.

**Tech stack:** React 19, Vite, Tailwind, TanStack Query, Express, Prisma, PostgreSQL, Zod and Vitest.

**Spec:** ../specs/2026-11-16-customer-dashboard-design.md

## Global constraints

- Customer area only; keep concurrent edits out of commits.
- Primary #0052CC, navy #111827, secondary #64748B, border #E2E8F0, background #F8FAFC; Poppins scoped to customer UI.
- Every account query uses the authenticated user ID. Never auto-claim guest orders by email.
- Filtering precedes pagination; order/payment/ticket lifecycles stay separate.
- Unsupported features have honest availability messages and working alternative actions.
- Reduced motion, visible focus, 44px targets and no mobile horizontal overflow.

## Task 1: Verified account read API

Files: packages/shared/src/account.ts and index.ts; apps/api/src/modules/account/account.{routes,service}.ts; apps/api/src/routes/v1/index.ts; apps/api/tests/integration/account.test.ts.

Interfaces: GET /account/dashboard returns summary and upcoming order-grouped event tickets; GET /account/tickets accepts period/q/dateFrom/dateTo/page/limit and returns ticket records plus pagination; GET /account/history accepts q/status/paymentStatus/dateFrom/dateTo/page/limit and returns existing serialized orders. GET /account/recommendations returns existing EventSummary records validated against sales windows.

- [ ] Create integration cases for 401 unauthenticated requests and two-user ownership isolation. Example assertions:

```ts
expect((await request(app).get('/api/v1/account/dashboard')).status).toBe(401);
expect((await other.agent.get('/api/v1/account/tickets')).body.data).toEqual([]);
```

- [ ] Exercise actual order creation/payment fixtures, count all tickets, distinct upcoming events and orders; ensure pending orders never count as usable upcoming tickets.
- [ ] Cover future/past/invalid tickets, partial refunds, date ranges, latest payment FAILED distinct from pending order status, search and pagination before implementing handlers.
- [ ] Run the new test file, observe missing endpoint failures, implement Zod schemas and services with requireAuth and explicit selects, rerun tests/types.
- [ ] Commit and push the verified API group.

## Task 2: Customer shell and overview

Files: apps/web/src/pages/account/account-layout.tsx; account.css; account-components.tsx; account-data.ts; overview.tsx; apps/web/src/app/router.tsx; apps/web/package.json; pnpm-lock.yaml.

Interfaces: useAccountDashboard(), useAccountTickets(filters), useAccountHistory(filters), useAccountRecommendations(); AccountHeading and AccountAvatar; navigation paths from approved spec.

- [ ] Inspect generated reference and write composition notes; keep real branding, smaller poster proportions and actual names/data in implementation.
- [ ] Add locally hosted Poppins and scope font/tokens to .customer-account.
- [ ] Move only /account routes outside PublicLayout; preserve all public and workspace routes. Add sidebar, compact topbar, accessible account menu, logout and safe-area bottom navigation.
- [ ] Implement overview with time greeting, aggregate cards, ticket-led next events, real quick links, independently loaded recommendations, empty/loading/error states.
- [ ] Verify web types/build and browser layout at desktop/mobile before committing and pushing.

## Task 3: Wallet and history

Files: tickets.tsx; ticket-detail.tsx; orders.tsx; order-detail.tsx; account-filters.tsx.

- [ ] Bind wallet period/search/date/page controls to URL parameters; use authenticated read endpoint and preserve filters across page changes and Back.
- [ ] Render individual wallet ticket cards with poster, real holder/category/code and status; add customer ticket detail using existing protected ticket/QR endpoints and print.
- [ ] Bind history search/order status/payment status/date/page controls to /account/history; show purchased quantity independently from issued-ticket count.
- [ ] Render detail with event, buyer, items, payment/order status, subtotal/discount/fee/total, ticket links and existing pending-payment link.
- [ ] Check invalid/used-ticket states, reset filters, long titles and print; run types/API regressions and browser checks, commit and push.

## Task 4: Profile, settings and availability

Files: profile.tsx; settings.tsx; favorites.tsx; account-security.tsx.

- [ ] Validate profile with updateProfileSchema, map field errors, keep email read-only and provide actual save feedback.
- [ ] Share a confirmation-based email reset request using POST /auth/forgot-password; no direct password-change form.
- [ ] Settings uses existing browser language preference and real logout. Favorites states that saved events are unavailable and links to discovery.
- [ ] Verify real save/reset/language/logout behavior and accessibility; commit and push.

## Task 5: Delivery verification

Files: e2e/tests/customer-dashboard.mjs; docs/qa/customer-dashboard-2026-11-16.md; dedicated planning records.

- [ ] Use existing browser automation conventions with actual test accounts/orders; do not substitute mocked production API data.
- [ ] Test all customer paths at 1440, 1024, 768, 390 and 320px, including h1/navigation/focus/overflow, data states, print and reduced motion.
- [ ] Run pnpm lint, pnpm typecheck, pnpm test and pnpm build; fix introduced failures and record baseline warnings.
- [ ] Document evidence, file summary and unsupported backend dependencies. Stage only owned files, push final group and verify origin/main contains every task commit.
