# Buyer and per-ticket holder checkout — 2026-11-15

## Implemented

- The second checkout stage uses the event title with complete date/time/timezone and venue or online location below it.
- Buyer panel: full name, email, identity type/number and required international phone. Each purchased ticket has its own holder panel with those fields plus gender buttons and date of birth before identity fields.
- Searchable country dropdown supports country names, English aliases and calling codes. Phone normalization/length checks are shared between web/API via libphonenumber-js.
- Age is calculated at purchase time in Asia/Jakarta. Before the seventeenth birthday, KTP/SIM are disabled in the UI and rejected by the API; only passport/student card is allowed. Invalid/future dates are rejected.
- Copying buyer data preserves each holder's birth date/gender and follows buyer edits until the holder is edited independently. Changing a holder to a minor clears an unsupported document.
- A confirmation dialog appears before the order POST. Edit preserves values; Escape returns focus to checkout and Edit Data focuses the buyer form. The dialog traps keyboard focus and scrolls internally on small displays. Copy describes available email delivery/phone contact, without claiming unimplemented WhatsApp delivery.
- Nullable JSONB checkout snapshot is additive and legacy order ticket issuance still falls back to buyer contact. New tickets use their individual holder names/emails; identity numbers and birth dates are omitted from normal order/ticket responses and redacted from request logs.

## Verification

- `LOG_LEVEL=silent pnpm check` exits successfully: shared/API/web TypeScript checks, **86 tests across 10 API test files**, and both production builds. Root lint has no errors; two unused-variable warnings come from concurrent edits in `pages/auth/register.tsx`, outside this change. ESLint on all checkout-related changed files passes with `--max-warnings 0`.
- `pnpm test:browser`: **24 route/viewport checks** pass.
- `pnpm test:event-detail`: five-width detail/category/buyer checks, preserved data, confirmation-before-order and edit/reopen flow, guest order token, mock payment and issued tickets pass. No browser runtime errors or automated accessibility violations.
- `pnpm test:checkout-customer`: **1440, 768, 390 and 320px** checks pass for event heading, two holders, searchable countries/empty search, Singapore phone, copy synchronization, independent holders, minor identity restrictions, confirmation contact/count, focus trapping, Escape/edit/reopen and preserved data. No horizontal page overflow, browser runtime errors or automated accessibility violations.
- API tests cover missing/duplicate/mismatched holder slots, exact seventeenth birthday, impossible/future dates, minor passport/student acceptance, direct KTP/SIM bypass rejection, international number normalization, persistence, and issuing distinct holders' tickets. Private identity/DOB data is absent from the purchase response.
- Browser date inputs are set atomically through the native value setter plus input/change events because text insertion does not fill native date segments reliably. Other form interactions use the browser's normal click/fill/select/check controls.
- Both development and test databases received `20261115120000_order_customer_details` through migrate deploy; no reset or destructive migration was used.

Unrelated existing/concurrent edits to `pages/account/account-layout.tsx` and `pages/auth/register.tsx` are preserved outside these commits. See `docs/checkout-customers.md` for the payload/storage contract and deployment commands.
