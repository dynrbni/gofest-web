# Authentication transitions — 2026-11-16

- Final user direction restores skeleton navigation instead of sliding or fading between auth forms. The existing 320ms route skeleton now covers auth paths as well as public navigation. Actual forms are hidden and inert during loading, then appear directly without a fade.
- Auth skeleton columns match the destination: login form right, register form left. Their placeholders follow the form rows, logo/language header and mascot area on the existing white canvas, with no navbar/footer. Mobile shows only the form placeholders; reduced motion disables pulse animation.
- The shared AuthLayout and eagerly available auth pages remain. Login and register retain their distinct mascot poses; images decode before display and an available pose remains visible while an alternate loads. No database or authentication API behavior changed.
- Asset provenance: [auth-mascot-poses.md](../design/auth-mascot-poses.md).

## Verification

- `pnpm test:auth-transitions`: 1440×900, 1024×900, 768×900, 390×844 and 320×640; both navigation directions, destination skeleton sides/viewport fit, actual painted skeleton frames, hidden form interaction blocking, persistent layout, no cross-page movement or fade, distinct poses, no horizontal overflow, Back, reduced motion, login validation and password visibility. No automated accessibility violations or browser runtime errors.
- `pnpm test:loading`: boot/public/auth skeletons, cached navigation, Back/Forward/reload, delayed requests, reduced motion, mobile layout, request failure and retry.
- Production web build including TypeScript and scoped ESLint on changed components/tests pass.
- Visual review covers desktop login/register skeleton placement and loaded forms. Earlier full registration/OTP/login verification is recorded in progress.md; authentication behavior is unchanged.

Unrelated checkout customer-field edits remain outside this task.
