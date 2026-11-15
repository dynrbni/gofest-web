# Dedicated city event pages

City cards on the home page now open `/events/city/:citySlug`. Supported cities are Jakarta, Bandung, Yogyakarta, Surabaya and Denpasar. The city directory is `/cities`.

Each page shows its existing landmark artwork, a city heading and a paginated event list. It has no category ribbon or location selector. The route determines the city; unrelated query parameters cannot change the listing. Unknown slugs show a city-not-found page without requesting an unscoped list.

The public events API accepts the validated `citySlug` parameter. It takes precedence over the existing `city` substring filter and matches only offline events using exact, case-insensitive, trimmed aliases from `packages/shared/src/cities.ts`. Jakarta includes its five administrative cities. Neighboring cities, broader provinces such as Bali or DI Yogyakarta, online events, ended events and unpublished events are excluded.

## Verification

- PASS: lint with no warnings, workspace typecheck and production API/web builds on an exported copy of the staged source.
- PASS: all 93 API tests, including three city integration tests covering aliases, geographic exclusions, publication/type/time boundaries, pagination totals, empty results and invalid input.
- PASS: `pnpm test:cities` against the running workspace and the exported staged source. Covers all five city links/pages, heading and landmark identity, results compared with the real API, ignored catalog query parameters, refresh, invalid city/page recovery, loading/empty/error states, retry and Indonesian/English persistence.
- PASS: city pages at 1440, 1024, 768, 390 and 320 pixels, with no horizontal overflow. Automated accessibility audits report zero violations for all five city pages and the directory.
- PASS: `pnpm test:discovery` against the exported staged source, covering existing catalog filters, date selection/reset, navigation, language persistence, authentication form validation and the updated city link.
- PASS: no browser runtime errors during normal city navigation.
- PASS: both browser suites against the production web build, including successful loading of its bundled font. Retry verification waits for the completed recovery state.

The staged-source check excludes unrelated local edits. No database migration or new image asset is required.
