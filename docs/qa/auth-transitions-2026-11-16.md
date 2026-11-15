# Authentication transitions — 2026-11-16

- Login keeps the form on the right and welcome-back mascot pose on the left. Register places the form on the left and high-five mascot pose on the right. White canvas, supplied logo, language menu and existing fields are retained. Mobile keeps the form in one column and hides the artwork.
- A shared AuthLayout remains mounted across auth routes. Login/register/recovery components are available in the same bundle; the forced 320ms route overlay is skipped for auth paths. Other routes retain their loading behavior. Initial HTML boot loading remains separate from switching auth forms.
- Column swaps use 560ms native transform animations. Resizing cancels in-flight movement and immediately follows the responsive grid. The new form fades in; the image pose crossfades only after decoding. Both image elements stay mounted, so the current available pose remains visible while the alternate loads. Reduced motion removes the swap, fade and image transition.
- Generated assets and exact imagegen prompts: [auth-mascot-poses.md](../design/auth-mascot-poses.md). The two RGBA PNGs were copied unchanged from the built-in generator and reviewed against a white browser canvas. No source mascot or brand logo was overwritten.

## Verification

- `pnpm test:auth-transitions`: five viewport sizes (1440×900, 1024×900, 768×900, 390×844, 320×640), both directions, different active poses, correct desktop sides and single-column mobile. Frame sampling and DOM mutation observers verify actual movement, a persistent main/form slot, exactly one heading/form, no route/image skeleton and no horizontal overflow throughout switching. Back, reduced motion, login validation and show-password also pass. No automated accessibility violations or browser runtime errors.
- `pnpm test:registration`: personal information → strong password → final OTP → authenticated account, then actual login again. Password strength/visibility, invalid submission, previous-step persistence, language and fifteen responsive step checks pass. The test uses the currently configured arbitrary-code testing OTP mode and cleans up its test account.
- `node e2e/tests/loading.mjs`: boot/public loading, delayed API requests, back/forward/reload, auth's no-skeleton exception, reduced motion, request errors and retry pass.
- `pnpm test:browser`: 24 public route/viewport checks pass.
- `pnpm typecheck` and production web build pass. ESLint on all auth/router/test files changed by this task passes with `--max-warnings 0`. Root lint has no errors; unrelated concurrent event-card edits had unused-variable warnings during verification.
- Desktop login/register and mobile registration were visually inspected. The art remains contained at its original ratio with transparent edges, and normal form steps fit the tested viewport heights without scrolling.

No database or authentication API behavior changed. Existing checkout-field edits are preserved outside this task. Existing pending changes that remove the blue auth canvas/form box are retained as part of the white auth layout shown in the user's screenshots.
