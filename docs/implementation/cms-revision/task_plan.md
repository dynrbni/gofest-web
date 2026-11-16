# GOFEST CMS revision implementation plan

Goal: implement the supplied revision end to end without replacing ticketing, authentication, finance, or the established design.
Spec: `spec.md` in this directory. Work in the existing checkout and push tested groups to origin/main as requested.
Architecture: extend existing storage, organizer, notification and workspace modules; use structured CMS entities with validated per-entity documents and immutable publish revisions. Public rendering consumes only published documents; authenticated draft preview shares public components.
Stack: React 19/Vite, Express/TypeScript, Prisma 4.16.2/PostgreSQL, existing local image storage.

## Tasks

- [x] 1. Finish supplied Admin/Creator logo integration and verify role rendering.
- [x] 2. Repair event uploader and persist account/organizer imagery, with MIME/signature/size validation, ownership and integration tests.
- [x] 3. Keep dashboard shells mounted, preserve sidebar scroll, introduce content-specific skeletons and category-based unread badges with efficient polling.
- [x] 4. Add structured CMS schema, revisions and validated APIs for overview, homepage sections, featured events, banners, pages, navigation, footer, branding, SEO and maintenance. Test RBAC, draft isolation, publication, safe destinations and event eligibility.
- [x] 5. Add CMS editor and authenticated preview, event selector, uploads and confirmation dialogs. Connect published sections, banners, pages, branding, navigation, footer, SEO and maintenance to the public site.
- [x] 6. Apply additive migrations to development/test; validate Prisma; run lint/types/tests/build and browser acceptance/regression checks. Fix failures, document API/file map and limits, commit and push each verified group.

## Validation

Each deliverable gets targeted behavioral verification before commit/push. Final gate: full lint, shared/API/web types, API tests, production builds; browser role navigation/persistent shell, uploads, draft/publish/unpublish, featured selection, public page/branding/footer/maintenance, mobile and tablet. Never reset development data. Payment/payout provider scope stays unchanged.

## Next Step

None. Implementation, migrations, validation and browser regressions are complete; final verification report is committed and pushed to origin/main.
