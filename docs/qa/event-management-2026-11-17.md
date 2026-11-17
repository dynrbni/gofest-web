# Event management UX revision

Implemented on 17 November 2026 (Asia/Jakarta) using the existing GOFEST design and shared event form.

- Replaced `Detail / kelola` with a single-line `Kelola acara` action, an internal-navigation arrow, visible keyboard focus and a 44px target. Moderation actions share sizing and align in one row; table overflow stays within its scroll region on small screens.
- Added a live event summary beside Create/Edit Event at viewport widths1280px and above. It shows the uploaded banner (or an honest fallback), title, venue/address/city or online state, start/end and timezone.
- The summary sticks96px from the top, below the workspace header. Short desktop screens cap its height and allow keyboard scrolling with visible focus. Below1280px it becomes a regular block after the form.
- Date input conversion and saving use the event's own timezone. The live summary matches the entered schedule, and opening/saving a non-Jakarta event preserves the original stored instants and timezone.

## Verification

- `pnpm lint`: PASS.
- `pnpm --filter @gofest/web build`: PASS, including TypeScript validation.
- `git diff --check`: PASS.
- `node e2e/tests/event-management.mjs`: PASS. Creator/Admin/Superadmin at1440/1280/1024/390px (12 role/viewport checks); sticky position while scrolling; responsive stacking; no document overflow; one-line management action and aligned moderation controls; empty Create Event; live title/location/dates/online state; actual banner upload/save; non-Jakarta timezone round trip;600px-height desktop; WCAG2A/AA main-content audits with zero violations; no browser runtime errors.
- Reviewed desktop screenshots of the event table and form. Screenshots/audits are in `/tmp/gofest-event-management-qa`, with run output in `/tmp/gofest-event-management-qa.log`.

QA creates one temporary Creator draft and removes it and its uploaded media. Existing events are opened for read-only layout checks. Browser date manipulation uses the native input setter and input/change events because segmented datetime controls do not accept CLI text filling consistently. Saving still runs the real React form handler and API. Repeated runs reached the existing development authentication rate limit; the local development API was restarted and readiness verified before the final successful run. Rate-limit configuration was unchanged.
