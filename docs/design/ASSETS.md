# GoFest visual assets

Discovery reference images were generated with the built-in ImageGen tool on 2026-11-15. Event covers are retained. The current logo is the original transparent PNG supplied by the user, documented below. The concert image is a generic illustration of the live-event experience, not a photograph claiming to depict one of the listed events.

## User-supplied brand assets

- Source: `gofest-logo-blue-transparent.png`, supplied by the user on 2026-11-15, 2192 × 690 RGBA.
- Website: `apps/web/public/assets/gofest-logo.png`, copied without modifying a pixel or byte. SHA-256: `1d94b77bf92f3e989cd2b063d795ddba92a904d4e49b3b3010420badd28d7e88`.
- Icon: crop rectangle `(79, 71, 679, 620)` from the source, excluding the wordmark. The original icon pixels are centered on a transparent 648px square and resized for `favicon-32.png`, `favicon.ico` (16/32/48), `apple-touch-icon.png` (180), and `gofest-icon-192.png` / `gofest-icon-512.png`. No shape was redrawn, no color/gradient was changed, and no background/effect was added.
- `site.webmanifest` references the 192/512px icons with the supplied white/blue brand colors. It does not introduce offline behavior or a service worker.

| File                                        | Purpose                                                                             |
| ------------------------------------------- | ----------------------------------------------------------------------------------- |
| `apps/web/public/images/concert-crowd.webp` | Generic discovery banner and authentication visual; 1440px WebP, approximately 91KB |
| `docs/design/marketplace-reference.webp`    | Homepage composition reference                                                      |
| `docs/design/event-detail-reference.webp`   | Event selection and purchasing composition reference                                |

## Concert image prompt

Use case: photorealistic-natural. Asset: wide website banner for GOFEST Indonesian event discovery, used as a generic editorial concert photograph, not a particular named real event. Wide 3:2 landscape composition. A stunning live indie music festival at blue hour in Indonesia, viewed behind a crowd of young adult music fans, silhouettes and raised hands, stage at right-center with vivid cobalt blue spotlights and warm amber lights, electric yet authentic atmosphere, realistic film photography with subtle grain and human skin, navy shadows, no lettering, no logos, no watermarks, no overlays, no interface. Leave left quarter darker for text legibility. High quality editorial concert photograph.

## Homepage reference prompt

Use case: ui-mockup. Create a high fidelity implementable desktop website redesign reference for GOFEST, an Indonesian event ticket marketplace very closely inspired by loket.com. Render a single large readable 1440x1050 screenshot with no browser chrome. White background, navy #14254c typography, vivid royal blue #0052cc action color, Manrope geometric sans. Preserve existing GOFEST uppercase wordmark with blue ticket icon. 80px white navigation: logo, Kategori, long light gray search, Buat event, Tiket saya, outlined Masuk and filled Daftar. Thin secondary category links below. Broad contained 1200x330 hero carousel with left navy text panel, right concert crowd photo; text 'Ada cerita seru di setiap pertemuan.' 'Temukan konser, festival, dan pengalaman berikutnya.' white CTA Jelajah event; right side show vibrant Indonesian concert photography. Small carousel arrows and pagination under. Next a compact row of six colored category icons with Indonesian names, flat without cards. Next heading 'Temukan acara pilihanmu' with tabs Semua kota Jakarta Bandung Bali and Lihat semua link. Four event cards in one row, wide photographic posters, date, title 'Suara Lembut di Ruang Beton', location Jakarta, bold price Rp175.000, thin separator and organizer. Another short pale blue editorial strip 'Punya ide acara? Waktunya jadi nyata.' with button Buat event. Realistic polished functional ticketing marketplace, compact laptop usable composition, beautiful photos, 12px radii, subtle borders, no generic SaaS bento, no fake metrics. This is a design reference only, not a deployable interface.

## Detail reference prompt

Use case ui-mockup. Single large high fidelity website screenshot 1440x1050 of GOFEST Indonesian event ticket detail and purchase interface, close to Loket.com marketplace design. White header logo GOFEST existing blue ticket icon, Kategori, search, Buat event, Tiket saya, Masuk, Daftar. Pale gray #f7f9fc background, navy #14254c text and royal blue #0052cc buttons. Breadcrumb. Left column 760px wide large 16:9 warm acoustic concert poster photograph. Under it title 'Suara Lembut di Ruang Beton', subtle date and venue info. Right 360px white sticky booking panel with thin blue top border, 'Pilih tiketmu', ticket options Early Bird Rp175.000 and Reguler Rp225.000, round radio controls selection clearly blue outlined ticket, inventory availability and large blue 'Lanjutkan pembelian' button plus price total. Below photo on left, horizontal tabs Tentang acara Tiket Syarat & ketentuan Lokasi, readable description body and organizer row Ruang Rekam. Professional dense usable ecommerce event page, no nested bento, restrained rounded 12px corners, crisp thin borders, generous readable typography. This is an implementation reference only.

## Follow-up references and city assets

| File                                          | Purpose                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `docs/design/catalog-dropdown-reference.webp` | Downward category menu, horizontal category ribbon, inline filters, and four-column catalog reference   |
| `docs/design/auth-reference.webp`             | Compact photo/form authentication composition reference                                                 |
| `apps/web/public/images/city-landmarks.webp`  | Transparent five-landmark sprite used with CSS background positions; no event content or external logos |

The catalog reference establishes a white menu below the primary navbar, pastel icon tiles with labels, a subdued backdrop, and a flat filter row. The authentication reference establishes a contained two-column composition, an image approximately half the content width, underlined login/register tabs, and a form without a second surrounding card. The implementation uses existing real event posters rather than the illustrative event posters in the reference image.

### Catalog reference prompt

Create a high fidelity website UI design reference screenshot for GoFest Indonesian event ticket marketplace. Desktop 1440px, white page, navy text, primary royal blue #0052CC, Manrope type. Top slim main navbar GOFEST logo, Kategori button, wide event search, Buat acara, globe ID, login buttons. Below nav only Jelajah acara and Acara gratis tabs. Main event browse page: heading Cari event seru favoritmu, spacious but compact, horizontally arranged 6 pastel icon category selectors with blue underline on active category. Inline horizontal dropdown filters all location, date, price and availability plus reset, sorting right. Four column poster events results below with realistic music/film/workshop poster art. A large downward category mega menu is OPEN under navbar containing 3-column accessible category icon+label grid above page, outside backdrop lightly dim. Clean professional realistic browserless full page reference, no device framing, no ornamental blobs or nested panel boxes, readable hierarchy, screenshot quality.

### Authentication reference prompt

High fidelity desktop website design reference for GoFest Indonesian event ticketing LOGIN page. White and very pale cool blue background, Manrope font navy #102447, royal blue #0052CC buttons. Browserless 1440x1000 screenshot. Simple thin GOFEST navbar with search and category. Main compact centered 900px width split composition starting 60px below navbar: left narrow beautiful concert crowd photo 380x490 with white short text 'Satu akun, banyak cerita.' at bottom. Right white login form 400px width, without bulky card border, top Masuk / Daftar small tab switcher blue underline, heading 'Senang bertemu lagi.', email, password with eye, forgot password link, full width blue Masuk button, account sign up link. Tidy little back to events link. Elegant restrained ticket marketplace UI, no fake social authentication buttons, no decorative security claims, no excessive empty space or enormous photo, readable compact polished proportions. Indonesian.

### City landmark prompt

A single cohesive asset sheet of five distinct separate miniature 3D clay architectural landmarks for an Indonesian event ticket website. TRANSPARENT background. Arrange exactly five islands in one horizontal row, equal spacing, each island fully isolated with abundant transparent gaps, no overlapping. Left to right: Jakarta Monas monument golden flame white obelisk; Bandung Gedung Sate white art deco building; Yogyakarta Tugu white and gold monument; Surabaya Sura and Baya shark crocodile statue; Denpasar Balinese meru temple black tiered pagoda roofs. Each tiny miniature sits on its own pale gray rectangular platform with a couple small rounded green trees. Isometric three-quarter front camera, soft studio lighting, polished friendly realistic toy architectural dioramas with muted natural colors, clean crisp details, each similar visual scale. No text, no words, no labels, no frame, no background, no shadows beyond its island. Wide image 3:1 composition.
