# Progress

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
