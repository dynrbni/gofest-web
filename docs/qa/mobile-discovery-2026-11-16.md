# Mobile discovery, event detail and checkout

## Delivered behavior

- Below 768px, home events, categories and cities each use one horizontal row with native scrolling, snapping and part of the next item visible. Catalog and desktop grids retain their existing purpose.
- Home banners use a 16:5 aspect ratio instead of a 400px mobile height. Mobile detail starts with a 5:2 poster, then title, date, time, location and organizer.
- Mobile event detail keeps price and the booking action at the bottom, including a truthful unavailable state. Poster images on detail and checkout load eagerly; event cards remain lazy.
- Purchase progress shows the active step label and all four numbered steps. Other step labels remain accessible to screen readers.
- Checkout reserves a separate area for its total and action below a scrolling form. Ticket selection, customer data, confirmation, quantity limits and server quotes retain their existing behavior.
- Home/city/detail skeletons follow the revised proportions. No new artwork, content, payment method or API contract was introduced.

## Verification

PASS: `node e2e/tests/mobile-discovery.mjs` on development and the built production preview at 320, 390, 480, 640, 767, 768, 1024 and 1440px. Checks cover landscape proportions, a single scrollable row on mobile, readable card dimensions, desktop grids, page overflow, keyboard reachability, axe accessibility and runtime errors.

PASS: `pnpm test:event-detail` at 320, 390, 768, 1024 and 1440px. Covers banner navigation, detail poster order, ticket selection and removal, preserved buyer data, confirmation, actual guest demo order/payment/ticket issuance and accessibility.

PASS: `pnpm test:checkout-customer` at 320, 390, 768 and 1440px. Covers international phone countries, individual ticket holders, age restrictions, copied customer values, confirmation editing and keyboard focus. Tests click visible gender labels and explicitly scroll them into the form viewport.

PASS: `pnpm test:loading`, including navigation/reload skeletons, delayed requests, deferred cities, lazy cards, reduced motion, request failures and retry.

PASS: repository ESLint and scoped ESLint, changed-file formatting, `git diff --check`, and web TypeScript/production build. The final built mobile detail audit has zero axe violations or incomplete checks.

The build was verified from an export of commit `48eb9b0` plus exactly this task's source files, with frozen dependencies. Another chat was simultaneously replacing account dashboard files in the shared checkout; its temporary missing-module and account-loading-type errors were excluded from this task and its commit. The production preview used port 4178. Its discovery and detail audits passed; a repeat checkout run on that alternate origin was rejected by the API's configured `WEB_URL=http://localhost:5173` origin guard. All checkout and full demo purchase checks passed on the configured origin. API responses and payment behavior were not mocked.

## Delivery gate

- PASS: real API data and existing artwork; no fabricated claims or decorative controls added.
- PASS: working shelf links, banner navigation, booking, ticket quantity changes and checkout actions.
- PASS: existing loading, empty, unavailable and retryable error states retained; loading regression passed.
- PASS: keyboard and automated accessibility checks; mobile detail also visually reviewed.
- PASS: intentional scrolling is confined to shelves/form; no document width overflow at tested widths.
- PASS: build and actual purchasing verified. Backend changes and unrelated account work are outside this commit.
