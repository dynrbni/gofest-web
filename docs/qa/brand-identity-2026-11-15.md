# Gofest brand identity

The user supplied the final transparent logo and explicitly requested global integration and a GitHub push of all pending changes.

## Asset verification

- PASS: main PNG is byte-identical to the source. SHA-256 `1d94b77bf92f3e989cd2b063d795ddba92a904d4e49b3b3010420badd28d7e88`; 2192 × 690 RGBA with transparent corners.
- PASS: favicon and app icons are resized crops of the original G icon, preserving its pixels, shape and gradient. Crop coordinates and output dimensions are documented in `docs/design/ASSETS.md`.
- PASS: manifest icon files exist and all PNG icons have transparent corners.
- PASS: shared logo uses original PNG, automatic width and `object-fit: contain`. Browser assertions verify 44px desktop / 36px mobile, original ratio, no border, background, shadow or filter.
- PASS: Poppins loads from local font assets; browser confirms the font is ready and used by the document. The PNG wordmark is never reconstructed as HTML.

## Coverage and verification

- Public navbar/footer, login/register/password layouts, admin/organizer desktop sidebar and mobile navigation, account pages through public layout, loading/error screens, digital ticket and email template use the supplied identity.
- Public 24, admin 16, organizer/account 26 and staff 2 browser route checks pass at 390/1440px (68 total), including automated accessibility audits and logo geometry/style assertions.
- Discovery and event-detail/carousel suites pass, including 320/390/768/1024/1440px layout checks and selected ticket checkout navigation, with zero browser runtime errors.
- `LOG_LEVEL=silent pnpm check` passes: zero lint errors/warnings, all package type checks, 45 API tests and both production builds.
- Production output contains a byte-identical copy of the supplied main PNG.
- Desktop/mobile authentication, public logo/loading screen, workspace logo and original G favicon visually inspected.

## Delivery gate

- PASS hard gate: assets are explicitly user supplied/authorized; no generated logo, duplicate wordmark text, decorative logo effects, fabricated claims or new dead controls. Existing loading, empty, error and unavailable-ticket states are retained. Logo proportion and mobile overflow checks pass; keyboard/accessibility checks and production builds pass.
- PASS purpose gate: user palette defines primary actions, borders, foreground and pale blue surfaces; existing white/blue layout remains. Poppins follows the requested typography and is separate from the immutable PNG wordmark. Favicons identify the site using the original G; no new logo motif is invented.
- PASS liveliness: existing ENERGY 2 / RHYTHM 2 / MOTION 1 retained. The supplied logo establishes identity, real poster art remains the discovery focal point, and brand updates add no decorative animation.
- PASS craftsmanship: one shared image component keeps all layouts consistent; explicit image dimensions prevent layout shift; logo and font assets are local. Semantic ticket icons remain where they represent tickets, rather than branding.

Local checks cover the stated routes/states and do not guarantee every future input or third-party environment. GitHub publication is recorded in the final chat after remote verification.
