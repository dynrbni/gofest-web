# Redesign findings

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
