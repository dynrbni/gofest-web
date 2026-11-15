# Mascot friends and email-first registration

The user requested additional cute blue mascots and a compact register flow that starts with email and OTP before asking for username, phone and password.

## Behavior

- Four short screens: Email → OTP → Profile → Password. The form preserves values when moving back. OTP supports change email, resend cooldown, pasted six-digit codes and one-time-code autocomplete. Password can be revealed and must meet the shared server schema.
- Username is normalized to lowercase, limited to 3–24 letters/digits/underscores and protected by a database unique index. Existing accounts retain null usernames and their original display names; new display names initially use the chosen username.
- Accounts cannot be created through the legacy direct registration payload. The server requires an email-bound, expiring verification proof and consumes it atomically with creation of the user. Verified email time is stored on the user; existing login behavior is retained.
- OTP codes use secure random generation and keyed hashes, expire after ten minutes, permit five attempts and have a 60-second resend cooldown. Failed guesses commit their attempt count. Resending invalidates previous proof/code; simultaneous sends, verification and account creation cannot produce duplicate successes.
- No fixed-height clipping or hidden page overflow is used. Normal steps fit 320×640, 390×844, 768×900, 1024×900 and 1440×900. Error messages, enlarged text and mobile keyboards can still use natural scrolling.

## Evidence

- PASS: additive Prisma migration applied to both local development and test databases, without a reset. Username is nullable for existing users.
- PASS: lint, package type checks, 56 API tests across eight files and API/web production builds.
- PASS: eleven new registration integration tests cover queued email/template, direct-signup rejection, concurrent resend cooldown, five failed attempts including concurrent guesses, expiry/resend, concurrent code verification, proof/email binding and one-use account creation, username conflicts with retry after concurrent claims, and invalidated/expired proofs.
- PASS: `pnpm test:registration` completes Email → actual queued OTP → Profile → Password → authenticated Account and reload. It also checks bad OTP, validation, resend disabled state, previous-step value preservation, password visibility, eight accessibility audits and all twenty normal-state viewport/step combinations without horizontal or vertical scroll. The fixture is restricted to development console mail and isolated QA addresses, and removes its records afterward.
- PASS: existing 24 public route/viewport checks and discovery interaction suite, with no runtime errors recorded by those suites.
- PASS: desktop and mobile trio illustrations and registration steps visually reviewed; original logo is unchanged. The generated group has an alpha channel and no visible backdrop in the browser.

## Delivery configuration

OTP uses the existing email outbox worker and SMTP transport. This local environment currently uses `EMAIL_PROVIDER=console`, so testing verified the actual queued email and code, not delivery into an external inbox. Set `EMAIL_PROVIDER=smtp`, `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT` and provider credentials for inbox delivery, and run the worker. OTP is never returned by the public API. See `docs/auth-registration.md` for API/deployment details.

Delivery gate: the three friends make the brand illustration more welcoming; steps encode the actual registration sequence; validation, errors and keyboard focus remain functional. No fabricated claims, dead controls or overflow clipping were introduced. GitHub push and CI status are reported after publication.
