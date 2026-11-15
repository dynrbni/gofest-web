# GoFest marketplace redesign QA

Date: 2026-11-15 (Asia/Jakarta).

## Delivered behavior

- Shared marketplace header, category navigation, event carousel, city filters, event cards, organizer profile, authentication, buyer account, organizer/admin workspaces, and responsive purchase controls.
- Ticket category selection survives navigation into checkout and is revalidated against currently sellable ticket types.
- Carousel supports previous/next, keyboard arrows, direct slide selection, pause, hover/focus pause, background-tab pause, and reduced motion.
- Route and card motion uses transforms without fading body text. Dialogs and forms retain keyboard focus indicators; wide management tables can be focused and scrolled.
- Public organizer events are combined with their parent organizer before rendering shared event cards. Their TypeScript model now matches the API response.
- API requests honor `VITE_API_URL`; local development/preview proxies can use `API_PROXY_TARGET`.
- Routes and React/UI dependencies are split into separate production chunks. No new runtime dependency was added.

## Checks

`LOG_LEVEL=silent pnpm check` passed: ESLint with zero errors/warnings, shared/API/web TypeScript checks, 45 tests across seven API test files, and both production builds. The test database was verified to be separate from the development database before running the suite.

Browser smoke tests use the running application and API, with no mocked event or order responses:

| Area                                                                                         | Checks | Viewports      | Result |
| -------------------------------------------------------------------------------------------- | -----: | -------------- | ------ |
| Public discovery, details, checkout, organizer, auth, legal, 404                             |     24 | 390px / 1440px | Pass   |
| Admin overview, users, organizers, moderation, orders, categories, settings, audit log       |     16 | 390px / 1440px | Pass   |
| Organizer overview, events, creation, settings, buyer account, and six event management tabs |     26 | 390px / 1440px | Pass   |
| Staff assignments                                                                            |      2 | 390px / 1440px | Pass   |

Every passing route check includes one main heading, no unexpected error state, no page-level horizontal overflow, and zero violations from the automated axe audit. A further 24 public route checks passed against the production bundle on both viewports (92 route checks total). Automated audits do not establish complete WCAG conformance.

Manual browser flow completed on a seeded demo event: choose the Rp260,000 ticket category, carry it into checkout, enter guest buyer information, accept terms, create order, create mock payment, simulate payment, open the issued ticket, load its QR image, and validate the ticket through the staff manual scanner. A subsequent scan was rejected as already used. One clearly labeled local QA order was created; no real payment occurred.

Additional checks: mobile detail purchase bar visible at 390px, internal tabs scroll without causing page overflow, 320px homepage has no horizontal overflow, mobile city filter updates its URL and results, and reduced-motion emulation disables both hero and route animations. The scanner screen also passed its automated accessibility audit.

Development QA used web `5180` / API `4180` because an unrelated project occupies IPv4 port `5173`. Production-bundle QA uses web `5181` / API `4181` with a matching allowed Origin and `API_PROXY_TARGET`. The API intentionally rejects writes from an unmatched web origin.

## Limits

- The backend currently implements a mock payment provider. Real bank, QRIS, and wallet payments are not integrated; their unsubstantiated UI claims were removed.
- Production SMTP, storage, hosting, and domain configuration are outside this redesign. Existing production guards reject the mock payment provider.
- Camera capture, audio behavior on physical phones, and actual printer output require device testing. The manual scanner and QR generation were exercised through the running app.
- Event poster content remains the existing organizer-supplied/seeded artwork. The new generic concert photograph is not used to misrepresent individual events.

## Reproduce

Run `pnpm test:browser` with the API and web running and published seed data available. For alternate ports, set `QA_BASE_URL` and `QA_API_URL`. For protected routes, log in using an `agent-browser` session, then set `QA_SESSION` and `QA_ROLE` as documented in the README.

## Screenshot follow-up

The follow-up replaces the sidebar catalog with an icon category ribbon, inline location/date/price/availability controls, reset, and a four-column result grid. The header now has a downward category mega menu, ID/English selection, and only Explore/Free in its lower row. Authentication uses a compact photo/form layout, and all five city cards use generated landmark dioramas with raised hover and keyboard-focus states. Reduced motion disables their transitions.

The real local outage was a stale PostgreSQL `postmaster.pid`: no postgres process or listener existed, and the saved PID belonged to an unrelated macOS audio helper. The Homebrew service was stopped, the stale file preserved, and PostgreSQL restarted. No development data or migration was reset. Actual categories/events/API health/worker health returned 200 after recovery.

Follow-up validation:

- `LOG_LEVEL=silent pnpm check`: zero ESLint errors/warnings, shared/API/web typechecks, 45 tests in seven files, and both builds pass.
- The route matrix above was repeated against the follow-up: 24 public, 16 admin, 26 organizer/account, and two staff checks. Production preview repeats the 24 public checks, for 92 current route checks.
- `pnpm test:discovery` passes on both development and production preview: category menu accessibility and Escape, category/city/price combinations without discarding earlier filters, date range conversion to Asia/Jakarta, reset, query-aware Free navigation, persisted ID/English, auth validation/password visibility, mobile menu, and city destinations.
- A real admin login and category description edit were exercised in the browser. The edited description appeared in the public mega menu, and the original description was restored. API integration verifies that inactive categories disappear publicly while remaining manageable by admin.
- Isolated API/worker processes pointed at an unavailable test port return 503, including worker health. The normal worker stays healthy. Error response tests verify Retry-After and that connection details are not exposed in JSON responses.
- Keyboard-focus/hover card transforms were inspected; reduced-motion emulation gives `transition-duration: 0s` and no hero animation. Registration also fits 320px without page overflow.

Current development checks use the existing localhost:5173/4000 services. The final production preview uses 127.0.0.1:5181 with a separate API on 4181 configured with the matching WEB_URL and API_PROXY_TARGET. A first preview attempt against the development API correctly rejected checkout quote requests from the unmatched origin; the correctly configured repeat passes without relaxing origin protection.

Language switching translates navigation, home, catalog, event cards, and login/register. Admin-authored content keeps its stored text; event detail, transactions, legal, and workspaces remain Indonesian. No real payment provider or production deployment has been added.

## GitHub publication and CI

Backend commit `4a68b65` and web commit `80de2d4` were pushed to `origin/main`, and the remote SHA was verified. [GitHub Actions run 43677648363](https://github.com/dynrbni/gofest-web/actions/runs/43677648363) did not start its verification job. Its failure annotation states: “The job was not started because your account is locked due to a billing issue.” There are no executed CI steps or test logs for that run. Account billing must be resolved before hosted CI can execute; the local checks documented above passed.
