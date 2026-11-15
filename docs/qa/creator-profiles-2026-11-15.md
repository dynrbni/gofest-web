# Creator profiles and event cards — 2026-11-15

The latest user screenshots replace the former framed organizer introduction and flat discovery cards. Gofest keeps its supplied logo, blue palette and DM Sans typography.

## Behavior

- Public creator profiles show banner, circular logo, name, public event total and join month/year. Description and the generic organizer label were removed from this page.
- Event Aktif includes published events that have not ended, including events in progress. Event Lalu includes completed events and published events whose end time has passed. Draft, review and cancelled events are excluded. Counts cover the full history rather than a limited preview.
- `GET /api/v1/organizers/:slug` accepts `period=active|past`, positive `page`, and `limit` from 1–24 (default 12). Active events sort ascending by start time; past events descending, with ID as a stable tie-breaker. Excessive pages clamp to the final page. The response adds `eventCounts`, `eventsPagination`, `bannerKey`, `fallbackBannerKey` and `createdAt` without exposing owner/contact data.
- Active/past state and pagination live in the URL. Empty lists have explicit empty states. Loading another period does not temporarily show cards from the preceding period.
- Home, catalog and creator profiles share the new card: blue outer frame, 5:2 cover, white information panel, two-line title, date/range, price, dashed divider and circular creator avatar/name. Event and creator links are siblings; no nested anchors. Existing event/creator images are reused.
- Settings support authenticated image upload, preview and removal for logo and banner. Uploading alone does not update the profile: Save applies changes. Returning focus from the file picker cannot overwrite unsaved edits with a background profile refetch.
- A creator without a banner uses its newest public event cover; a creator without artwork uses a plain light-blue banner and initial avatar. Invalid images have readable fallbacks.

## Deployment

Run the additive migration and regenerate Prisma before starting the updated API:

```sh
pnpm --filter @gofest/api db:deploy
pnpm db:generate
```

`20261115124000_organizer_banner` adds nullable `organizer_profiles.bannerKey`; existing rows and event data are retained. Development and test databases were migrated locally without a reset.

## Verification

- `LOG_LEVEL=silent pnpm check`: 90 API tests across 11 files, all package type checks and both production builds passed. Root lint has no errors; unused-variable warnings originate in concurrent register/home edits that are excluded from these commits.
- New API tests exercise ongoing/upcoming/ended/completed events, unpublished-event exclusions, owner-data privacy, full counts, a 27-event history, clamped pagination, invalid filters, empty/inactive creators and authenticated upload/save/clear.
- `pnpm test:creators`: creator identity, full-width banner, circular avatar, active/past selection, reload persistence and accessibility at 1440, 1024, 768, 390 and 320px. Shared cards were checked on home/catalog/profile, including independent links, creator-to-event navigation and image-error fallbacks. No horizontal page overflow, browser runtime errors or automated accessibility violations.
- `pnpm test:browser`: 24 public route/viewport checks passed.
- `pnpm test:discovery`: category/city/date/price filters, reset, navigation, carousel controls, language and auth controls passed.
- Organizer settings were exercised with real uploads through the browser, then Save, Hapus logo/banner and Save again. Public API state was verified after both saves. The original null artwork values were restored and the two temporary uploaded files removed. Settings had zero automated accessibility violations.
- Desktop/mobile screenshots were inspected locally. Actual creator artwork is supplied through settings; no fictional creator logo or banner was added.

Concurrent account, registration, home partner-section and carousel edits are preserved outside these commits. GitHub Actions run [43714736923](https://github.com/dynrbni/gofest-web/actions/runs/43714736923), for implementation commit `93971d8`, could not start its verify job: `The job was not started because your account is locked due to a billing issue.` Local verification passed; remote CI is not verified.
