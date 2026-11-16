# Media upload and creator profile verification

Verified against the development API and frontend on 17 November 2026 (Asia/Jakarta).

## Implementation

- Existing local storage functions remain the application boundary. Images are decoded with Sharp, normalized to WebP, resized within 2000 × 2000 without enlargement, and stored with UUID filenames. Declared MIME must match the detected file signature. Invalid/truncated images are rejected by decoding as well.
- Upload limits are 8 MB for event, organizer and CMS images; 2 MB for account avatars. Event/organizer uploads require an active organizer or operational admin. CMS uploads require Superadmin.
- `MediaAsset` records the owning user, storage key, public URL, original filename, normalized MIME/size, dimensions and upload time. An unsuccessful metadata insert removes its newly written file.
- New image references require the appropriate folder and ownership. Existing legacy event/organizer keys remain editable when unchanged. Creator event updates continue through existing event ownership checks. Account avatars persist on the user and are included in authentication responses.
- Creator settings separately manage the account photo, organizer logo and organizer banner. Public profile fields include description, email, phone, location, website, Instagram and TikTok. Social URLs allow HTTP/HTTPS only.
- The shared uploader previews the selected file during upload, displays the persisted image after completion, supports replacement/removal, exposes loading/errors, and blocks submitting while upload is pending. Event creation and editing both use it. Account and dashboard avatars fall back to initials when absent or unavailable.

## Automated evidence

`LOG_LEVEL=silent pnpm --filter @gofest/api exec vitest run tests/integration/media-profile.test.ts tests/integration/organizer-public.test.ts`

Result: 2 files, 8 tests passed. Log: `/tmp/gofest-media-profile-tests.log`.

Covered: anonymous access; unsupported/spoofed MIME/signature; avatar and upload size caps; upload role restrictions; metadata ownership and dimensions; cross-account image rejection; avatar save, logout/login persistence and removal; event banner save/reopen/public URL retrieval; cross-organizer event edits; organizer contact/banner publication and removal; unsafe social URLs; existing organizer public pagination/image behavior.

ESLint passed for all media/profile files. Web typecheck passed after this feature was implemented. A later parallel CMS edit introduced unrelated `cms-home.tsx` prop errors at the time of this local check; the root task owns the final repository-wide gate. `git diff --check` passed.

## Browser evidence

Used an isolated `agent-browser` session with the existing creator demo account. No user browser tabs were touched. Tested real UI file inputs against the running API, not intercepted upload responses.

- Creator settings: avatar and organizer banner upload, local preview, upload state, disabled submit, save, full reload, persisted images loading successfully, and saved location visible on the public organizer page.
- Image removal: cleared both uploaded profile images, saved, and verified database values returned to null. Restored the test location to its original null value. Blank text input via mobile browser automation did not update React reliably, so final location restoration used a narrowly scoped development Prisma update for the demo organizer.
- Create event at 390 px: real event image upload returned `/uploads/events/...`; preview decoded successfully; submit disabled during upload and enabled afterward; removal cleared the preview.
- Creator settings, event form and public organizer page had no horizontal document overflow at 390 px. Desktop settings/public profile were also exercised.
- Browser console error list was empty. Event form axe audit with WCAG 2A/AA tags returned zero violations. Audit artifact: `/tmp/gofest-media-profile-a11y.json`.

The browser session was closed. No screenshot artifacts were captured in this pass. API tests cover event persistence/public retrieval and avatar logout/login persistence; the browser checks cover the visible interactions above.

## Retention and integration notes

Replacing/removing an image detaches the database reference and does not immediately delete the stored media. This preserves other event/profile/CMS references and published revisions that might reuse a key. Unreferenced upload cleanup requires a future reference-aware retention job; there is no destructive automatic garbage collection in this change. Normalized images are publicly readable by design, so uploads should contain only imagery intended for public display.
