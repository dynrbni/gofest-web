# GoFest marketplace redesign

## Goal

Redesign the existing ticketing application around Loket-style event discovery, consistent purchasing and management screens, accessible motion, and working backend flows. Commit and push all task changes to the existing GitHub repository.

## Phases

1. Audit current routes, reference, and baseline checks — complete.
2. Create visual reference and implement shared design and motion — complete.
3. Redesign discovery, event detail, checkout, authentication, account, and workspaces — complete.
4. Verify lint, types, API tests, production build, desktop/mobile UI and purchasing — complete, including the screenshot follow-up and production preview.
5. Commit and push verified changes; record limitations — complete. Backend and web commits are on origin/main; GitHub Actions cannot start because the account is locked for billing.

## Decisions

- Keep GoFest branding, React/Vite/Tailwind, existing API contracts, and database data.
- Use the repository's documented antislop during mode.
- Existing GitHub origin/main is the requested push destination; no new hosting provider is required.
- Prioritize real event data and truthful payment information over decorative claims.
- Motion must respect reduced motion and carousel must support pause, focus, and keyboard.
- Screenshot follow-up: compact auth, raised landmark city cards, dynamic category mega menu/admin editing, ID/English, two-link lower header, and horizontal catalog filters.
- Repair the actual local PostgreSQL outage and provide preflight/503/readiness diagnostics; never reset development data to fix connectivity.

## Baseline

- Clean main branch at b627b47.
- Lint has no errors and six pre-existing warnings. Typecheck passes.
- Web on localhost:5173 and API on localhost:4000 are available.

## Skeleton loading and lazy loading, 15 November 2026

- [x] Audit loading states, route splitting, existing design and local edits.
- [x] Replace PageLoading with responsive skeleton layouts and add a brief full-site transition on reload/navigation.
- [x] Add image placeholders, reduced-motion support, deferred city content and lazy workspace shells.
- [x] Verify browser loading/navigation/error states, mobile layout, lint, types, tests and builds.
- [x] Hide mascot otter illustration on mobile auth screens and tune mobile navbar height.
- [x] Commit and push verified changes to origin/main.

