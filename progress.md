# Progress

## Mobile layout tuning and skeleton loading, 15 November 2026

- Replaced the PageLoading spinner with responsive skeleton compositions, added full-site reload/navigation transitions, image placeholders, HTML boot skeleton and reduced-motion support.
- Lazy-load workspace shells and below-fold home city content; retain eager loading for prominent hero/auth imagery.
- Adjusted mobile navbar height to 64px (`h-16`) to eliminate flattened header appearance on mobile viewports.
- Hid mascot otter illustration on mobile auth viewports (`hidden md:flex`) to streamline the mobile login and authentication experience.

## Overflow-only event card marquees, 2026-11-15

- Event titles and creator names now use a single-line marquee only when their measured text width exceeds available space. Short labels remain static; dates, prices and creator footers keep aligned positions. ResizeObserver handles responsive widths/font changes and IntersectionObserver pauses offscreen text.
- Seamless copies preserve full accessible labels while hiding duplicate text from assistive technology. Hover/focus pauses both labels; an independent 44px control pauses/resumes a card persistently. Reduced motion uses static ellipses and full native tooltips.
- Verification: the new browser regression covers short/long titles and creators, five widths (1440/1024/768/390/320), aligned card rows, dynamic resize, loop geometry, live movement, hover/focus/manual pause, reduced motion and complete labels. No horizontal overflow, browser runtime errors or automated accessibility violations. Creator/card navigation regression also passes. Web typecheck, scoped ESLint and production build pass.
- Other ongoing workspace edits are preserved outside this change. No database or API changes are required.

## Creator profiles and shared event cards, 2026-11-15

- Simplified public creator profiles to banner, circular logo, name, join month/year and total public events, following the supplied Artatix reference. Active/past tabs use real event status/end times, URL state and 12-item pagination; drafts/review/cancelled events are excluded from counts and history.
- Replaced the shared home/catalog/creator event card with a soft blue rounded frame, wide 5:2 poster, white information surface, date/range, price and separate creator footer link. Missing artwork falls back without breaking navigation or layout.
- Added nullable organizer banner storage and authenticated logo/banner upload, preview, save and removal in organizer settings. Both development and test databases received the additive migration without resetting data.
- Verification: 90 API tests across 11 files, shared/API/web type checks and production builds pass. Public smoke: 24 route/viewport checks. Creator suite: five widths from 320 to 1440px, both tabs, reload, card anatomy, independent links, navigation and artwork failure states; zero automated accessibility violations or browser runtime errors. Discovery interactions pass. Real settings upload/save/remove was exercised and restored.
- Preserved concurrent account/register edits, home partner-section removal and carousel edits outside this task's commits. Root lint has no errors; existing concurrent edits leave unused-variable warnings. See docs/qa/creator-profiles-2026-11-15.md for verification and deployment details.

## Buyer identity, per-ticket holders and confirmation, 2026-11-15

- Stage-two heading now uses the event title with schedule/timezone and location. Added separate buyer/per-ticket holder panels, searchable country phone selectors, identity fields and gender radio buttons with birth date before document fields.
- Added shared web/API age and identity validation: age at purchase in Asia/Jakarta, exact seventeenth birthday boundary, only passport/student card below 17, and one unique holder per ordered ticket slot. Checkout phones normalize to E.164 while signup/account phone rules stay unchanged.
- Buyer-copy mode preserves holder gender/DOB, follows buyer contact edits and stops on independent holder edits. Confirmation opens before order creation; editing and closing preserve values and restore keyboard focus appropriately.
- Added nullable private JSONB order snapshot through an additive migration, applied to development/test databases. Issued tickets use each holder's name/email with legacy buyer fallback. Identity numbers/DOB are excluded from normal order/ticket responses and redacted from request logs.
- Verification: 86 API tests, TypeScript and API/web builds pass; checkout-scoped ESLint has zero warnings. Public smoke covers 24 checks. Purchase E2E passes at five widths and customer/country/age/confirmation E2E at four widths including 320px, with zero browser runtime errors and zero automated accessibility violations. Concurrent unrelated account/register edits remain unstaged; root lint reports two unused-variable warnings from that register edit.

## Separate event detail and staged checkout, 2026-11-15

- Followed the supplied Artatix screenshots with Gofest branding: white two-column detail, organizer and descriptive tabs on the left, proportional poster/schedule/location and a direct Pesan Sekarang link on the right. Removed ticket selection from detail.
- Moved checkout and order routes into a minimal logo/language layout without public navigation/footer. Added the four-stage purchase indicator; category/quantity selection precedes buyer details, then the existing payment provider flow.
- Added separate ticket cards with availability, per-category limits and remove/increment controls. Preserved server quotes, coupons, terms, idempotent order creation, guest access tokens and mock payment/ticket issuance. Navigation between form stages preserves input; continuing does not submit the form.
- Verification: lint, TypeScript, 69 API tests and both builds pass. Public smoke checks cover 24 routes/sizes. Updated event-detail E2E covers five widths (320–1440px), distinct routes/stages, mixed-category totals, removal and restored selections/buyer data, guest mock payment and issued tickets, zero automated accessibility violations and zero browser runtime errors. Existing carousel navigation assertions remain.

## Form header and three-step registration, 2026-11-15

- Followed the new reference: original logo plus flag/ID/EN language selector at the top of the form, left-aligned headings and one white form surface. Desktop mascot trio is retained; language control is shared with public navigation.
- Reordered signup to Personal information → Create password → Email verification. Full name, unique username, required Indonesian phone and email come first; password remains in memory and OTP is requested only after valid personal information/password/consent. Final verification creates the account. Back navigation preserves values.
- Added a live strength meter, visible requirement checklist and show/hide control. Shared signup/reset validation enforces 8–72 characters, uppercase, lowercase, digit and non-whitespace symbol; existing login passwords remain accepted.
- Enabled arbitrary six-digit signup OTP only for explicitly opted-in development + console mail. The default is false, production rejects the flag, and SMTP uses real OTP. Local ignored API environment is opted in per the user's testing request.
- Verification: 69 API tests across nine files, lint/type checks and both builds pass. Existing public 24 and discovery suites pass. Updated registration E2E verifies the three-step flow, strength/visibility controls, language switching, no normal-state scroll at five sizes, full-name persistence and arbitrary testing OTP. A subprocess check confirms production refuses the enabled testing flag.

## Mascot friends and verified registration, 2026-11-15

- Added a transparent three-character illustration retaining the original otter and adding a sky-blue bunny and navy penguin. Original mascot/logo assets remain intact.
- Replaced the long register form with Email → OTP → Profile → Password. Profile collects a unique normalized username and phone; password visibility, consent, previous-step navigation, edit email, resend countdown and recoverable error states remain usable.
- OTP is server-enforced: six random digits, HMAC hash, ten-minute expiry, five attempts, atomic 60-second resend limit, expiring one-use proof bound to email and transactional proof consumption/account creation. User emailVerifiedAt is set only after verification; existing accounts remain usable. Migration applied to local development and test databases without resetting data.
- Used the existing transactional email outbox and SMTP/console transport with a registration template. Local environment is console mail, so real inbox delivery still requires SMTP configuration; no browser OTP shortcut was added.
- Verification: 56 API tests, lint, package type checks and both builds pass; 24 public route checks and discovery interactions pass. New end-to-end suite completes real registration, rejects a wrong code, checks validation/back navigation/session persistence and verifies all four normal steps fit five viewport sizes including 320×640px without scrolling. Automated auth accessibility checks pass.

## Blue mascot authentication, 2026-11-15

- Created an original transparent blue otter concert mascot using the built-in imagegen tool, with headphones, festival wristband and ticket. Saved the 1254px PNG in public/assets; supplied Gofest logo remains unchanged.
- Matched the new reference with a centered top logo, mascot/form desktop columns, pale blue canvas and one white form card. Mobile retains a compact mascot above the form. Removed the back-to-events action and login/register tabs; a contextual account-switch link remains beneath the heading.
- Login/register validation, password visibility, recovery, language support and submission handlers are retained. Asset prompt and provenance are recorded in docs/design/gofest-mascot.md.
- Verification: all ten auth layout checks across five widths, 24 public route/accessibility checks and discovery interactions pass. Lint, package type checks, 45 API tests and both production builds pass.

## Authentication and public navigation, 2026-11-15

- Removed the direct tickets link from desktop/mobile public navigation and renamed the creator action to Jadi Partner Kami, including the home CTA and footer partner link.
- Moved login, register and password recovery outside PublicLayout. Shared auth shell now centers a single form up to 440px wide on white, without promotional photography, public navbar or site footer. Original PNG logo, account tabs, back link and form validation remain.
- Verification: lint, package type checks, 45 API tests and both production builds pass. All 24 public route/viewport checks pass with zero automated accessibility violations; discovery interactions pass including auth validation, password visibility and language persistence. Desktop/mobile auth visually reviewed; partner link redirects guests to standalone login and returns a successfully authenticated demo account to /organizer/apply.

## Typography correction, 2026-11-15

- User rejected the heavy Poppins styling and requested a new font while preserving the calmer pre-brand-update appearance. Replaced Poppins with self-hosted DM Sans variable; Manrope was not restored.
- Normalized typography across public discovery/detail/checkout, authentication, account, admin, organizer and staff: regular 400 body; medium 500 controls/labels/supporting text; semibold 600 headings and prominent prices. Removed 700/800/900 utility classes, reduced overly tight tracking and supplied native italics without synthetic font styles.
- Retained original logo PNG, brand palette, layouts and application behavior. TSX edits change font-weight classes only, plus final newlines.
- Browser checks now assert loaded DM Sans, regular body weight and no visible text over 600. Public/admin/organizer/account/staff suites cover 68 route/viewport combinations, alongside existing discovery and event-detail/checkout interaction suites.

## Supplied brand identity, 2026-11-15

- Copied the user's transparent 2192 × 690 PNG byte-for-byte to `public/assets/gofest-logo.png`; favicon and app icons use a crop of its original G icon.
- Added shared image/link logo components; replaced the ticket-square HTML wordmark across public and workspace layouts, authentication, loading/error screens, printed tickets and email. Desktop logo height 44px; mobile 36px; original aspect ratio and transparency retained.
- Applied the supplied palette through CSS/Tailwind tokens and self-hosted Poppins; removed unused Manrope/Instrument Serif dependencies. Semantic ticket navigation icons remain functional ticket symbols.
- Added browser assertions for original logo proportions, responsive sizing, contain fitting and absence of border/background/filter/shadow. Public 24, admin 16, organizer/account 26 and staff two route checks pass (68 total) with zero automated accessibility violations; discovery and detail/checkout suites also pass. Final `pnpm check` passes all 45 API tests, lint/type checks and both builds; production PNG is byte-identical to source.
- User authorized committing and pushing all pending work, including the earlier home/detail/carousel changes. Remote was fetched and main was aligned before commit.

## Event detail and carousel follow-up, 2026-11-15

- Rebuilt event detail around the user's LOKET reference: colored header with title/location/time/category at left; proportional poster, price, buy action and organizer at right; description/ticket/terms/location tabs below. Mobile stacks these regions with a bottom purchase action.
- Ticket choice now lives in the Tickets tab. Buy opens the tab, availability and min/max remain truthful, and the selected ticket ID still reaches checkout.
- Taller viewport-wide carousel uses actual event slides, whole-banner event links, left/right edge arrows, 720ms directional enter/exit motion and wraparound. Removed visible pause/stop per the user's explicit request; hover/focus/hidden/reduced-motion stopping remains.
- Preserved concurrent removal of the lower header navigation and homepage category/city filter strips; cleaned the unused imports/variable and adapted the footer free-event navigation check.
- Verification: `LOG_LEVEL=silent pnpm check` passes (zero lint errors/warnings, all TypeScript checks, 45 API tests, both builds). `pnpm test:discovery`, `pnpm test:event-detail`, and 24 public browser route checks pass. Detail/ticket accessibility and layout tested at 320/390/768/1024/1440px; no browser runtime errors found.

## Home layout correction, 2026-11-15

- Matched the user's LOKET screenshots: centered category panel beneath the primary header, viewport-wide hero with bottom caption, flat discovery event cards, and five city cards per desktop row.
- Replaced trigger-relative category positioning with a Radix Dialog panel; Escape, outside click, focus trapping and trigger focus return remain available.
- Preserved the city sprite's native cell ratio and clipped neighboring-cell fragments; responsive cards no longer stretch the landmark artwork.
- Verification: `LOG_LEVEL=silent pnpm check` passed (45 API tests, lint, all TypeScript packages and both production builds). Discovery E2E covers centered panels, edge-to-edge banners, native landmark ratio and overflow at 320/390/768/1024/1440px. Public browser smoke: 24 route checks passed, zero automated accessibility violations.

- Audited routes and components; inspected live Loket in a separate browser session.
- Baseline lint and TypeScript checks completed.
- Generated homepage design reference requested before implementation.
- Implemented shared visual system, discovery carousel, cards, ticket selection, checkout handoff, auth/account/workspace layouts, and route motion.
- Added reduced-motion support, carousel pause/focus/visibility handling, keyboard-scrollable tables, page error fallback, and contrast corrections.
- Split routes and vendor bundles; added configurable API base URL and corrected the public organizer event type.
- Browser smoke checks: 24 public, 16 admin, 26 organizer/account, and 2 staff route checks passed at 390px and 1440px with zero automated accessibility violations.
- Completed guest checkout, mock payment, QR ticket rendering, successful staff check-in, and duplicate check-in rejection using a demo event.
- Isolated QA at web port 5180 and API port 4180 because another project occupies IPv4 port 5173.
- Final `LOG_LEVEL=silent pnpm check` passed: zero lint errors/warnings, all TypeScript checks, 42 API tests, and both production builds.
- Another 24 browser route checks passed against the production bundle, bringing the total to 92 checks with zero automated accessibility violations.
- Final QA report and asset provenance saved under `docs/qa/` and `docs/design/`; GitHub push remains.

## Screenshot follow-up implementation

- Recovered PostgreSQL after verifying the stale PID belonged to an unrelated process; preserved the stale lock as a backup and retained all data.
- Added database preflight, retryable 503 mapping, useful worker error serialization, truthful worker health, and three outage regression checks.
- Replaced category mini-menu with an accessible downward mega menu; lower header now contains only Explore/Free tabs with query-aware active state.
- Added persisted ID/English, compact login/register composition, registration password visibility and associated validation errors.
- Built horizontal catalog categories and location/date/price/status filters, including date-range validation and timezone conversion. Fixed a rapid-navigation filter race.
- Added generated 3D city landmark assets and raised hover/focus cards, honoring reduced motion.
- Added admin category editing; verified a real edit reaches the public menu and restored the original data.
- Latest check: 45 API tests across seven files, zero lint warnings/errors, typecheck and both builds pass. Public 24, admin 16, organizer 26, staff two, and production public 24 current route checks pass (92 total). Interaction suite passes on development and production preview.
- Pushed backend commit `4a68b65` and web commit `80de2d4` to origin/main and verified the remote SHA. GitHub Actions run 43677648363 did not start its job: GitHub reports the account is locked due to a billing issue. Local verification remains green; no CI test execution is claimed.
