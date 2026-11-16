# Redesign findings

## Mobile discovery, 16 November 2026

- Mobile home used vertical event/city grids and a wrapped category grid, while a final CSS override forced the banner to 400px. Native horizontal shelves and fixed aspect ratios address the supplied screenshots.
- Metadata date text mixed directly into a flex row could split dates into separate anonymous items; grouping date/time/location text in spans keeps icon/text alignment stable.
- Fixed checkout actions require a reserved viewport area for the form. The browser CLI needs explicit scrolling when clicking gender labels inside that nested scroll area; the final customer suite passes at all four widths.
- Concurrent account dashboard edits temporarily break the combined working-tree build. A frozen-dependency export of the committed baseline plus the mobile task files builds successfully, without touching those independent changes.

## Skeleton loading audit, 15 November 2026

- Route pages already use React.lazy. Workspace shells were eagerly imported; they now load on demand.
- PageLoading was a centered spinner and data placeholders used one generic list shape. Added page-specific home, catalog, detail, creator, auth, checkout, workspace and document skeletons, plus event-grid/table variants.
- A 320ms route transition covers site chrome while keeping content mounted so requests start immediately. Actual requests retain their own loading/error states after this short transition.
- Home city content now waits until it approaches the viewport; native image lazy loading remains on posters/avatars, while hero and auth artwork stay eager. Image placeholders settle on success and failure.
- Initial HTML includes a lightweight skeleton before JavaScript loads. All skeleton animation respects reduced motion.
- Pre-existing uncommitted changes in home, carousel, registration and account layout are preserved and excluded from this task's commit. Their removed JSX left unused imports/constants, cleaned up where necessary for verification.

- Existing app supports public events, guest checkout, orders, digital tickets, auth, buyer account, organizer event/ticket/coupon/order/staff management, check-in, and administration.
- Current public pages have inconsistent styling and oversized dark hero. Backend contains four published demo events with cover images.
- Current footer and authentication screen advertise unintegrated bank and wallet payments. README identifies payment as a development mock provider.
- Live Loket reference inspected on 2026-11-15: white compact header, prominent search and category control, shallow promotional carousel, image-led event shelves, clear creator and account access.
- Existing lint warnings include stale effect dependencies in event filtering, auth, and check-in.

## Screenshot follow-up, 15 November

- Actual PostgreSQL startup failed because `postmaster.pid` pointed to PID 869, now an unrelated macOS audio helper. No postgres process or port 5432 listener existed. Stopped the Homebrew service, preserved the stale PID file, and restarted PostgreSQL. Categories, events, API health and worker health recovered without resetting data.
- Database initialization/pool outages now receive retryable 503 responses. Worker logs use Pino's `err` serializer, and worker health actually queries the database. `pnpm dev` performs `db:check` before starting.
- Dynamic category creation/activation already existed in the backend. Added editing in the admin UI and wired the same active-category API into the mega menu and horizontal catalog ribbon. Tested an edit in the actual browser, observed it in the public menu, and restored the original description.
- Rapid filter interactions exposed a React Router transition race that could discard the preceding filter. Filter navigation now uses synchronous router updates; the real browser regression combines category, city, and price before resetting.
- The browser CLI's native date `fill` reports success while leaving native date fields empty on this engine. The interaction test uses native input setters and real bubbling input/change events, then verifies the controlled field values and resulting Asia/Jakarta URL range. API/event data is not mocked.
- ID/English applies to the requested public navigation, discovery, cards, and login/register. Event/admin authored content, legal, transactions, and workspaces retain their stored/Indonesian text.
