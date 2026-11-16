# Customer dashboard verification, 16 November 2026

The approved customer redesign uses a dedicated authenticated layout, Poppins scoped to the account area, a 248px desktop sidebar, mobile bottom navigation, real database activity totals, ticket wallet/detail and transaction history/detail. Public marketplace, checkout, payment processing, organizer/admin workspaces and scanning retain their existing flows.

## Routes

| Route                        | Behavior                                                                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| /account                     | Time-based greeting, actual ticket/order/distinct upcoming-event counts, closest valid tickets, shortcuts and purchasable-event discovery |
| /account/tickets             | Individual tickets, upcoming/past/invalid views, event search, inclusive date filters and pagination                                      |
| /account/tickets/:ticketCode | Ownership-checked ticket, holder/category/code, protected QR, checked-in state, print and confirmed QR regeneration                       |
| /account/orders              | Search, separate order/payment-status filters, transaction dates, purchased quantity and server pagination                                |
| /account/orders/:id          | Event/buyer information, independent lifecycle states, ticket/payment breakdown and existing payment continuation                         |
| /account/profile             | Validated name/WhatsApp updates, read-only email, real initials and email-based password reset                                            |
| /account/settings            | Existing browser language preference, email reset and confirmed current-session logout                                                    |
| /account/favorites           | Honest feature-availability state with a working discovery link                                                                           |

## Evidence

- `pnpm check`: PASS. Repository lint, shared/API/web TypeScript checks, 101 tests across 14 files and API/web production builds pass. The five warnings observed at the initial baseline are no longer present after concurrent work elsewhere in the repository.
- `pnpm --filter @gofest/api exec vitest run tests/integration/account.test.ts tests/unit/openapi.test.ts`: PASS, eight tests. Coverage includes anonymous denial, another customer's inaccessible orders/tickets, aggregate totals, individual-ticket pagination, used/refunded/cancelled tickets, query validation, impossible calendar dates, Asia/Jakarta inclusive date boundaries, latest-payment status, purchase windows, guest ownership and QR restrictions.
- `node e2e/tests/customer-dashboard.mjs`: PASS, 40 route/viewport/accessibility combinations: eight routes at 1440, 1024, 768, 390 and 320px. No horizontal overflow or automated accessibility violations on these checks. Real actions cover wallet views/search/reset/dates, payment filters/reload, pending-payment navigation, valid/used-ticket states, print invocation, confirmed QR regeneration, profile validation/persistence, reset request, browser language persistence, logout and protected-route redirects. A deliberately aborted request verifies loading placeholders, recoverable error and retry without mocking successful data.
- `node e2e/tests/header-account.mjs`: PASS. Public account entry, category/search navigation, dedicated customer menu, keyboard activation, mobile navigation, ID/English, logout, responsive layouts and access protection.
- Browser runtime-error collection during normal customer interactions: zero errors. Intentional failed network requests are used only to verify error recovery.
- Password reset visibility controls: both password and confirmation toggle from password to text; the existing reset form remains usable at 320px with zero automated accessibility violations. No password request was submitted with the visibility-only inspection token.
- Manual visual inspection: empty/populated overview on desktop/mobile, populated wallet on mobile, poster proportions, readable ticket layout, actual logo and account-only font/tokens. Reduced motion disables customer animations; keyboard focus is visible. Customer menu/dialog targets are at least 44px.

The browser fixture is guarded to development plus console mail and an isolated `qa-customer-…@example.com` address. It uses actual registration, checkout and mock payment APIs for a customer account, changes only that account's test ticket states, and removes its orders/user/mail/QR files while releasing its own reserved/sold inventory. It does not replace production API data. DB-backed Vitest processes must run sequentially because their existing setup truncates the shared test database.

## Backend dependencies and limits

| Feature                          | Current state / required dependency                                                                                                                                                                                                                       |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Saved events                     | No favorites relation, persisted API or marketplace save action. The page explains availability; no fake saved list, local-only substitute or remove control is shipped. Requires ownership-scoped list/add/remove APIs and a unique user/event relation. |
| Profile photo                    | No user avatar column or supported customer upload endpoint. Real initials are shown. Requires validated image upload, ownership checks and persisted avatar metadata.                                                                                    |
| Notification preferences / inbox | No customer notification-preference/inbox API. No pretend bell badge, notification list or unpersisted toggles. Requires authenticated persistence and delivery preferences.                                                                              |
| Direct password change           | No authenticated current-password/change endpoint. The real token-by-email reset flow is used; the shared reset form provides confirmation and visibility controls.                                                                                       |
| Logout every device              | No standalone endpoint. Current-session logout is provided. Existing password reset still revokes prior sessions according to its original backend behavior.                                                                                              |
| Changing email                   | No verified email-change flow. Email stays read-only.                                                                                                                                                                                                     |
| Claim guest orders               | No verified claim endpoint. Guest token links still work; logging in with a matching email never silently attaches someone else's order.                                                                                                                  |
| Download PDF                     | No server PDF generation endpoint. Existing browser printing is supported, including Save as PDF when offered by the user's browser.                                                                                                                      |
| Payment provider                 | Existing mock provider is preserved and labeled as simulated when returned. This redesign does not add real bank/wallet integrations.                                                                                                                     |
| Recommendations                  | Uses currently purchasable inventory and event/ticket sale windows. No interest-profiling backend exists, so the UI does not claim personalized ranking.                                                                                                  |

## File summary

- Customer UI: existing `apps/web/src/pages/account/{account-layout,overview,tickets,orders,order-detail,profile}.tsx`; new `account.css`, `account-components.tsx`, `account-data.ts`, `account-filters.tsx`, `account-security.tsx`, `ticket-detail.tsx`, `favorites.tsx`, `settings.tsx`.
- Routing/font dependency: `apps/web/src/app/router.tsx`, `apps/web/package.json`, `pnpm-lock.yaml`. Existing public/guest ticket routes remain available.
- Small shared security UI change: `apps/web/src/pages/auth/reset-password.tsx` adds independent visibility toggles and accessible validation to the existing password/confirmation fields.
- Backend: new `apps/api/src/modules/account/account.{routes,service}.ts`; mounted in `routes/v1/index.ts`; existing order serialization reused via exported `orderInclude`; narrow unpaid/cancelled-event QR guard plus availability metadata in `modules/tickets/ticket.service.ts`.
- Contracts/docs: `packages/shared/src/account.ts`, shared index export, `apps/api/src/docs/openapi.ts`, approved spec and implementation plan.
- Verification: `apps/api/tests/integration/account.test.ts`, development-only `apps/api/tests/customer-dashboard-fixture.ts`, `e2e/tests/customer-dashboard.mjs`, adjusted header/account regression and dedicated `.planning/customer-dashboard` records.

## Delivery gate

| Gate                                                   | Result                                                                                                                |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Real account data, no fabricated numbers/identities/QR | PASS: database counts, authenticated name, actual protected QR                                                        |
| Navigation and controls                                | PASS: all eight routes and real actions exercised; unsupported controls are omitted                                   |
| Loading/error/empty states                             | PASS: real empty results, loading placeholders, intentional network failure and retry                                 |
| Contrast/keyboard/focus                                | PASS: automated audits, distinct landmark labels, visible focus and darker success-toast text scoped to customer area |
| Responsive/reduced motion                              | PASS: five widths without horizontal overflow; media preference checked                                               |
| Type-safe filters and ownership                        | PASS: shared Zod query schemas, user-scoped queries/caches and cross-user API tests                                   |
| Lifecycle/guest behavior                               | PASS: independent order/payment/ticket states; existing guest access and scanner regression retained                  |
| Build and regression evidence                          | PASS: `pnpm check`, customer suite and header/account suite                                                           |

Only task-owned files are staged for the redesign. The pre-existing local edit to `apps/web/src/pages/public/checkout-customer-fields.tsx` is preserved outside these commits.
