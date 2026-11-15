# Home layout correction

Reference: six screenshots supplied by the user on 2026-11-15. Scope: category dropdown, home banner, discovery event cards and city cards. Event titles, prices, posters, categories and organizer names remain API data.

## Verification

- PASS: `LOG_LEVEL=silent pnpm check`, including lint, TypeScript, 45 API tests and API/web builds.
- PASS: `pnpm test:discovery`, including desktop/mobile menu centering, filters, language, validation, city navigation and zero browser runtime errors.
- PASS: banner reaches both viewport edges, no page overflow, city artwork retains 3:5 ratio at 320, 390, 768, 1024 and 1440px; five city cards share one row at 1440px.
- PASS: `pnpm test:browser`, 24 public route checks at 390/1440px, with zero automated accessibility violations.
- PASS: inspected desktop home, open category menu, city row and mobile menu screenshots.

## Delivery gate

- PASS R-02/R-17/R-18/R-23/R-28/R-36/R-38: no fabricated claims, testimonials, statistics, new image assets or irrelevant FAQ added. Existing user-approved event and landmark assets are reused.
- PASS R-03: five viewport assertions find no horizontal page overflow.
- PASS R-24/R-26: category links, city links, event cards, filters and navigation use existing routes; discovery interaction suite exercises navigation and controls.
- PASS R-25/R-32: automated accessibility checks find no violations on 24 routes and both open category panels; modal focus, Escape and focus return use Radix primitives.
- PASS R-27: existing loading, error, retry and empty states remain in the homepage event query.
- PASS R-33/R-35: edits are direct source changes; application and builds were run and interaction evidence is recorded above.
- PASS R-34: no theme toggle introduced.
- PASS R-37: user-supplied LOKET composition drives the changes, with GoFest typography, colors and real content retained.
- PASS R-39/R-40: native buttons/links, labelled dialogs, existing visible focus and reduced-motion rules retained; hero uses explicit dimensions and high fetch priority; city artwork uses fixed dimensions.
- PASS purpose gate: bottom hero shade separates the caption from photography; white caption ensures contrast; category icons identify event types; pin/megaphone label content groups; arrows indicate navigation; shadows distinguish modal elevation and hovered city links. No new decorative patterns, glow or glass effects.
- PASS liveliness: ENERGY 2 / RHYTHM 2 / MOTION 1, recorded in DESIGN.md. Banner photography leads, smaller poster and destination rows support browsing, blue identifies actions, and whitespace separates content groups.
- PASS craftsmanship: changes stay within the screenshot requests; real event data is retained, existing non-home card layouts are preserved, and responsive/interacting states are covered by browser checks.

Tests describe the verified local state; they are not a guarantee against every possible future error. No deployment or remote push was performed for this correction.
