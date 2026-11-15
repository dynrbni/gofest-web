# Event detail and checkout separation — 2026-11-15

The supplied Artatix screenshots are the layout reference. Gofest retains its original transparent logo, DM Sans typography and blue palette.

## Result

- `/events/:slug` presents event category/title, organizer, description, terms/refund policy and location. The right column contains the proportional poster, schedule/location and starting price. **Pesan Sekarang** navigates directly to `/checkout/:eventSlug`.
- Checkout uses a logo/language header and purchase progress bar without public navigation/footer. Ticket categories, availability and quantity controls are the first stage; buyer details, promo and consent are the second. Existing order/payment functionality handles the remaining stages.
- No ticket is preselected for a normal detail-to-checkout visit. Existing `?ticket=` deep links remain supported and are checked against current availability. Back navigation between checkout stages retains quantities and buyer inputs.
- Server quotes and order creation continue to validate prices, stock, sale windows, per-category limits and coupons. Submission waits for a current successful quote. Guest access tokens and idempotency remain intact.
- No bank/wallet integrations or exclusive-access mechanism were invented. Local demo payments use the existing mock provider without transferring money.

## Validation

- `LOG_LEVEL=silent pnpm check`: lint, all package type checks, 69 API tests across nine files and API/web production builds.
- `pnpm test:browser`: 24 public route/viewport checks.
- `pnpm test:event-detail`: carousel links/transitions preserved; detail and both checkout stages fit 320, 390, 768, 1024 and 1440px; no ticket selector on detail; no buyer form before ticket selection; mixed-category subtotal, minimum removal, preserved input when going back, and full guest demo order → mock payment → issued ticket flow.
- Automated accessibility checks report zero violations on the inspected detail/checkout states and paid order; browser runtime error list is empty. Accessibility audits wait for transient toast animations to finish.
- Visual review: desktop detail, checkout category view, buyer view and 390px category layout. One click-through issue was caught and fixed: changing the continue button into a submit button could trigger validation during the stage transition; the continue handler now prevents that default action.

No backend schema or payment-provider changes were needed. A pre-existing edit to `pages/account/account-layout.tsx` was left outside these commits.
