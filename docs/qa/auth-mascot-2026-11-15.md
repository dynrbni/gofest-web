# Blue mascot authentication

The user's new reference replaces the minimal one-column form with a blue mascot/form composition. They explicitly requested a new cute mascot and removal of the back-to-events action and login/register tabs.

- PASS: original transparent blue otter mascot generated using built-in imagegen and copied into the project. Its prompt/provenance is recorded in `docs/design/gofest-mascot.md`. Existing supplied logo PNG is unchanged.
- PASS: desktop login/register visually reviewed: logo centered above two columns, mascot at left and white form card at right on the brand's light blue canvas. Mobile uses a compact mascot above the form without a public header or site footer.
- PASS: ten targeted layout checks across login/register at 320, 390, 768, 1024 and 1440px: mascot loads and remains visible; form fits; no horizontal overflow; side-by-side or stacked composition matches viewport; tabs and back-to-events links are absent; contextual account-switch link is present.
- PASS: `LOG_LEVEL=silent pnpm check` — lint, package type checks, all 45 API tests and API/web builds.
- PASS: `pnpm test:browser` — 24 public route/viewport checks, including auth/recovery, with zero automated accessibility violations or unexpected page error states.
- PASS: `pnpm test:discovery` — auth validation, password visibility, language persistence and existing discovery interactions; no browser runtime errors.
- PASS: contextual register-to-login link and successful demo administrator login reach /admin, with no browser runtime errors. No registration or business data was submitted.
- PASS delivery gate: user-authorized illustration provides the brand-specific welcome; headphones/ticket connect the mascot to concerts; blue canvas and one white card establish hierarchy. Existing DM Sans weights remain at 400/500/600. No additional animation, fabricated claims, or nonfunctional controls were introduced.

Push and remote CI status are reported in the final chat after publication.
