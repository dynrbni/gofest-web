# GOFEST dashboard and role management

## Goal

Implement the attached dashboard specification in the existing React/Vite, Express/TypeScript, PostgreSQL and Prisma 4 application, preserving ticketing and excluding Xendit calls.

## Architecture decisions

- Extend UserRole with SUPERADMIN and CREATOR; retain USER and active legacy organizer profiles for compatibility. Resolve privileges from the database on every authenticated request.
- Share AdminLayout and overview for operational roles. CreatorLayout scopes all data by authenticated organizer. Keep existing /organizer URLs compatible with /creator.
- Snapshot fees at checkout. Post balanced integer-Rupiah ledger entries and update persisted organizer wallets in the payment transaction. Paid ticket proceeds become available immediately in this internal workflow; no settlement or provider transfer is implied.
- Reserve withdrawals atomically using a conditional wallet update, persist a unique idempotency key and bank snapshot, and release reservations on rejection. Approval waits for a provider and never completes a transfer.
- Preserve existing brand assets, DM Sans and blue design tokens. Data density, useful charts, grouped navigation and readable finance labels establish hierarchy; no new decorative assets.

## Phases

### Phase 1: Repository audit and plan

**Status:** complete

- Read schema, auth, routes, UI, checkout and payment fulfillment.
- Preserve pre-existing edits in DESIGN.md, checkout-customer-fields.tsx, globals.css and category-ribbon.mjs.

### Phase 2: Roles, schema and financial core

**Status:** complete

- Add compatible roles/statuses, bank/wallet/ledger/payout/refund/content/support/notification representations and migration/backfill.
- Protect system administration and staff accounts; audit login and privileged changes.
- Wire payment fulfillment, fee snapshots, internal refunds and atomic payouts.

### Phase 3: Operational APIs and dashboard analytics

**Status:** complete

- Period-filtered global/owned analytics, reports, monitoring, management endpoints and ownership checks.

### Phase 4: Integrated responsive UI

**Status:** complete

- Shared admin layout, creator layout, grouped navigation, analytics, finance, bank/payout forms, management and operational pages.

### Phase 5: Demo seed, verification and delivery

**Status:** complete

- Idempotent development-only demo accounts and consistent transactions.
- Integration tests for RBAC, ownership, finance, refunds and concurrent payouts; lint, types, migration, build and browser validation.
- Document setup, simulation limits and future provider boundaries.
