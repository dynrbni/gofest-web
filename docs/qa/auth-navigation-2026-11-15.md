# Authentication and public navigation

Requested changes: remove the navbar ticket link, rename the creator action to “Jadi Partner Kami”, and show login/register as standalone forms without the promotional photo or public header/footer.

- PASS: desktop and mobile navigation omit the direct ticket link. Partner action wording is consistent in the header, mobile menu, homepage CTA and footer.
- PASS: login/register and password recovery render outside PublicLayout. Auth forms have a 440px maximum width, are centered on white and grow vertically for long registration forms.
- PASS: desktop login and desktop/mobile registration visually reviewed. Supplied logo proportions and the existing DM Sans weight hierarchy remain intact. No horizontal overflow or promotional photo remains on the reviewed forms.
- PASS: guest partner action opens /login?next=%2Forganizer%2Fapply; successful demo login returns to /organizer/apply. No application was submitted.
- PASS: LOG_LEVEL=silent pnpm check — lint, all package type checks, 45 API tests and API/web builds.
- PASS: pnpm test:browser — 24 public route/viewport checks, including auth pages, with no unexpected error states or automated accessibility violations.
- PASS: pnpm test:discovery — filters, navigation, language persistence, login/register validation and password visibility; zero browser runtime errors.
- PASS delivery gate: existing form behavior and account access remain usable; removed UI is absent; responsive composition, typography and branding were reviewed in the browser. No generated assets were needed for this simplification.

GitHub delivery and remote CI status are reported after pushing.
