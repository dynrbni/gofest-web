# Checkout customer details

Checkout stage two uses the event title, schedule (including timezone) and venue or online location. The buyer and the individual ticket holders are separate records in the purchase payload.

## Fields and rules

- Buyer: full name, email, identity type/number, and required phone number.
- Each holder: full name, email, gender, date of birth, identity type/number and required phone. There must be exactly one holder for each `(ticketTypeId, position)` in the selected quantities, starting at position zero.
- Identity types are `KTP`, `SIM`, `PASSPORT` (Paspor) and `STUDENT_CARD` (Kartu Pelajar). Identity numbers accept 3–50 letters/digits, spaces, dots, slashes and hyphens; this is input validation, not document authenticity verification.
- Age is calculated at purchase time using the current calendar date in Asia/Jakarta. The date of birth must be a real date between 1900-01-01 and today. Before the seventeenth birthday, only passport/student card is allowed. UI controls and API validation use the same shared rules, including the exact birthday boundary.
- The searchable country selector uses libphonenumber-js country/calling-code metadata and Indonesian/English country names. Phones are validated for possible length and normalized to E.164. This schema is specific to checkout; signup/account phone rules remain unchanged.
- “Samakan dengan data pemesan” follows edits to the buyer contact/identity while preserving the holder's gender/birth date. Editing the holder independently disables copying. A minor's unsupported copied identity is cleared so an allowed document can be chosen.

## Confirmation and persistence

A valid form opens a confirmation dialog. No order is created until **Saya Mengerti** is pressed. **Edit Data** returns focus to the buyer fields; Escape/close returns to the checkout button. The dialog traps focus, fits small screens and scrolls internally when necessary. Server errors remain recoverable in the dialog or form, and the existing idempotency key prevents duplicate orders on retries.

The modal summarizes buyer contact, ticket count and current server-quoted total. It describes email delivery and phone contact; it does not claim WhatsApp ticket delivery because that integration is not configured.

Migration `20261115120000_order_customer_details` adds nullable JSONB `orders.checkoutDetails`, an immutable validated snapshot containing the buyer identity and holder details. No index is needed because these private fields are not searched. Existing orders remain valid with a null snapshot. Ticket issuance uses the corresponding holder name/email and falls back to the buyer for legacy orders. The normal order/ticket serializer does not return identity numbers or dates of birth. Request logging redacts the new identity fields.

Deploy the additive migration using `pnpm --filter @gofest/api db:deploy` and regenerate Prisma using `pnpm db:generate` before running the updated API. Database resets are unnecessary. Both local development and test databases have been migrated.

Reproduce checks using `pnpm check`, `pnpm test:browser`, `pnpm test:event-detail` and `pnpm test:checkout-customer` with API/web running. Browser purchases use demo events and the mock payment provider only.
