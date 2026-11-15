# Typography correction

The user rejected Poppins and excessive bold text, asked for the earlier calmer appearance using a different font, and authorized a GitHub push.

## Change

- Self-hosted DM Sans variable replaces Poppins. The earlier Manrope family is not restored.
- Weight hierarchy: 400 body, 500 controls/labels/supporting text, 600 headings and prominent prices. Heavy 700–900 classes are removed across public, auth, account, admin, organizer and staff screens.
- Heading tracking is relaxed; native italic font files preserve emphasis in event descriptions. No runtime style injection or font-weight utility redefinition is used; source classes express their actual intended weights.
- User-supplied PNG logo, palette, layout geometry, routes and application logic are retained.

## Verification and delivery gate

- PASS: local lint, package type checks, 45 API tests and API/web production builds.
- PASS: browser body computes to DM Sans at 400, representative home heading 600 and navigation 500. The font is loaded from local assets.
- PASS: public 24, admin 16, organizer/account 26 and staff 2 route/viewport checks, with no horizontal overflow, excessive visible weights, automated accessibility violations or unexpected page error states.
- PASS: discovery and detail/carousel interaction tests, including category/filter/language behavior, five responsive widths, banner links and selected ticket checkout; no browser runtime errors recorded by these suites.
- PASS: desktop home and desktop/mobile authentication visually reviewed. Typography is lighter while event imagery, logo and blue actions retain the existing identity.
- PASS hard gate and craftsmanship: no assets or claims fabricated; existing links, controls and loading/error/empty states retained; font geometry is checked in real routes; builds and checks provide evidence.
- PASS purpose/liveliness: DM Sans was chosen for a more neutral reading texture and clear counters across dense ticket cards, forms and tables. ENERGY 2 / RHYTHM 2 / MOTION 1 and the existing white/blue composition remain; emphasis is conveyed through size, spacing and a limited 400/500/600 weight hierarchy.

Checks describe the verified local state. GitHub push and CI status are reported after publication in the final chat.
