# Form header and three-step signup

The user's latest reference places the logo and language selector above the form while retaining the mascots at left. Signup now follows Personal information → Create password → Email verification. The user explicitly authorized arbitrary OTP codes for current local testing.

- Header: original supplied PNG, flag/ID/EN selector, left-aligned heading/lede, no public navbar/footer/back-to-events action or account tabs. The shared language menu retains keyboard support and persists the existing preference. Register/login language switching preserves entered values.
- Personal information: separate full name and unique username, Indonesian mobile number and normalized email. Full names are saved as names, not overwritten by usernames.
- Password: live meter and checklist for 8–72 characters, uppercase, lowercase, digit and non-whitespace symbol, plus accessible show/hide. Meter labels reflect basic rule coverage and length/variety; they are not an entropy guarantee. Invalid passwords cannot advance. Shared API/reset schemas enforce the same requirements; login validation retains compatibility with existing accounts.
- OTP last: requested only after successful password/consent validation; final verification then creates the account. Change email/back navigation and retry after username conflicts retain entered data. Password/proof stay in memory.
- Testing mode: `REGISTRATION_TEST_OTP=true` is explicitly enabled in the ignored local development API environment. Only development + console mail can accept arbitrary six-digit codes; default is false and production refuses an enabled flag. Tests/SMTP use real OTP. Expiry, attempt counts, resend limits, proof binding and consumption remain in place.
- Responsive composition: normal steps fit the five tested viewports including 320×640px. On short mobile screens the register illustration is hidden to prioritize the form; desktop always retains the trio. Enlarged text, errors and keyboards can still use natural scrolling rather than clipping.

Verification commands: `LOG_LEVEL=silent pnpm check`, `pnpm test:browser`, `pnpm test:discovery`, `pnpm test:registration`.

PASS: 69 API tests across nine files, lint, package type checks, API/web builds, 24 public route/viewport checks, discovery interactions and the updated full registration browser flow. A subprocess with production + enabled testing OTP exits with the expected configuration error.

- API verification covers all password requirements, strict OTP behavior, proof/username concurrency and six development/test/production/provider combinations for the testing-mode boundary.
- Browser registration covers all three stages, missing personal fields, weak/strong meter states, weak-password blocking, show/hide, previous-step value preservation, language switching on register/login, arbitrary testing OTP acceptance, full-name persistence, authenticated reload and fifteen step/viewport layout checks with accessibility audits.
- Desktop personal/password/login and mobile personal/password compositions were visually reviewed. Existing supplied logo and mascot artwork are reused without generating or modifying assets.

Delivery gate: form grouping follows the actual registration sequence, blue accents identify actions/progress, and password feedback provides actionable requirements. No fabricated claims or dead controls are introduced. Final pass counts, GitHub delivery and CI status are reported in chat after verification and publication.
