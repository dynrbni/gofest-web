# Customer dashboard progress

## 2026-11-16: Audit and review preparation

- Read the supplied redesign brief and relevant project skills; user selected antislop during.
- Audited customer routes/screens, reusable UI, query layer, authentication, Prisma schema, order ownership, ticket QR access and event availability.
- Prepared a concrete proposed design with truthful backend limitations and scoped data/API additions.
- Baseline verification: pnpm lint exits 0 with five pre-existing warnings in event-presentation.tsx; pnpm typecheck exits 0 across shared/API/web.
- Application implementation has not started. Waiting for the required design review.

- User approved the concrete design and implementation/pushes. Detailed inline plan prepared; API work is next.

## Account read API

- Added validated customer-only dashboard, wallet, history and purchasable recommendations without schema changes. Every private query is scoped by authenticated userId.
- Added a narrow QR guard for unpaid orders/cancelled events; scanner and payment write flows remain unchanged.
- New API integration tests first failed on missing routes. After implementation, all six pass. API typecheck and scoped ESLint pass; the initial full regression also passed 100 tests before the sixth case was added.
- A mistakenly overlapping second Vitest process collided with the shared test database truncation. Reran the focused suite sequentially; six pass. Keep DB-backed tests sequential.

## Customer ticket detail and UI integration

- Added a customer-only ticket-detail read that checks ownership even for admin-role accounts; shared guest ticket route remains available. QR availability now communicates paid/valid/non-cancelled/non-ended state.
- Documented all five new account endpoints in OpenAPI. Eight focused account/OpenAPI tests pass, including Asia/Jakarta inclusive date boundaries and invalid calendar dates.
- Dedicated shell, overview, wallet, transaction detail/history, profile, email-reset security, settings and truthful favorites availability are implemented. Local Poppins is scoped to customer UI.
- Browser verification exposed and fixed duplicate unnamed aside landmarks and success-toast contrast. Header/account regression now passes with the dedicated customer navigation.
- Full API regression: 101 tests pass. Lint/types and API/web production build pass. Customer interaction suite is still being completed.
