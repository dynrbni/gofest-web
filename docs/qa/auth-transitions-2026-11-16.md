# Authentication transitions — 2026-11-16

- Login keeps the form on the right and welcome-back mascot pose on the left. Register places the form on the left and high-five mascot pose on the right. White canvas, supplied logo, language menu and existing fields are retained. Mobile keeps the form in one column and hides the artwork.
- A shared AuthLayout remains mounted across auth routes. Login/register/recovery components are available in the same bundle; the forced 320ms route overlay is skipped for auth paths. Other routes retain their loading behavior. Initial HTML boot loading remains separate from switching auth forms.
- Following user feedback, the large 560ms column swap has been removed. CSS grid places each form directly on its intended side, including after resize. Content stays visible and immediately usable with a 140ms opacity-only entrance (0.65 to 1); the image pose crossfades in 140ms only after decoding. Both image elements stay mounted, so the current available pose remains visible while the alternate loads. Reduced motion removes the fades.
- Generated assets and exact imagegen prompts: [auth-mascot-poses.md](../design/auth-mascot-poses.md). The two RGBA PNGs were copied unchanged from the built-in generator and reviewed against a white browser canvas. No source mascot or brand logo was overwritten.

## Verification

- `pnpm test:auth-transitions`: five viewport sizes (1440×900, 1024×900, 768×900, 390×844, 320×640), both directions, different active poses, correct desktop sides and single-column mobile. Frame sampling and DOM mutation observers verify no intermediate cross-page travel, a persistent main/form slot, exactly one heading/form, no route/image skeleton and no horizontal overflow throughout switching. Back, reduced motion, login validation and show-password also pass. No automated accessibility violations or browser runtime errors.
- `pnpm test:registration`: personal information → strong password → final OTP → authenticated account, then actual login again. Password strength/visibility, invalid submission, previous-step persistence, language and fifteen responsive step checks pass. The test uses the currently configured arbitrary-code testing OTP mode and cleans up its test account.
- `node e2e/tests/loading.mjs`: boot/public loading, delayed API requests, back/forward/reload, auth's no-skeleton exception, reduced motion, request errors and retry pass.
- Production web build (including web TypeScript) and ESLint on changed auth/test files with `--max-warnings 0` pass.
- Desktop login/register and mobile registration were visually inspected. The art remains contained at its original ratio with transparent edges, and normal form steps fit the tested viewport heights without scrolling.

No database or authentication API behavior changed. Existing checkout-field edits are preserved outside this task. The existing white auth layout is retained.
