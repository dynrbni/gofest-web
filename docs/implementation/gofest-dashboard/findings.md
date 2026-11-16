# Findings

- Existing app has cookie-based access JWT and rotated refresh tokens. Auth middleware loads current user role/status from PostgreSQL; no localStorage authorization is needed.
- Roles were USER and ADMIN; organizer/staff capabilities are derived from relational profiles/assignments.
- Existing Order.platformFee is already a monetary snapshot. Platform settings exist but initially default to zero fees.
- Existing dashboards aggregate customer totals as grossRevenue, which must be replaced with separate ticket sales and fee metrics.
- EventStaff, CheckInLog, OrganizerProfile, EmailNotification and User already represent several requested entities; reuse them.
- Payouts, persisted wallets, ledger, refund records, content and in-app notifications are missing.
- Existing demo seed is production guarded and idempotent for base accounts/events, but uses different credentials and has no financial demo transactions.
- Four pre-existing modified files must be preserved.
