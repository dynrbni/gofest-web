# Account navigation and sidebar

The account shell now stays mounted between `/account` routes. The global transition no longer hides it behind a full-page skeleton or resets its Suspense boundary on every account pathname. Account layout code is available immediately; session authorization and lazy page rendering occur inside `#account-main`. Private page components remain behind `RequireAuth`, including after a reload or logout.

The sidebar has an accessible collapse/expand button beside the Gofest wordmark. Collapsing changes its width from 248px to an 88px rail: the original G icon and all menu icons remain visible, while group names and labels disappear. Accessible names and hover titles remain on icon links. The workspace uses the released space, and the choice persists across SPA navigation. The Overview group starts directly below the brand row. Mobile retains its existing bottom navigation. Sidebar logout uses the same horizontal position and width as the navigation links. The promotional footer text/link is replaced by one “Kembali ke Buyer Area” button linking to `/events`.

Home and account use the same `UserAccountMenu` component, including its avatar trigger, identity block, six navigation items, logout action, Poppins typography, menu dimensions and 44px item targets. Both dropdown logout actions return to the public homepage.

Verification: all commands below passed.

- `node e2e/tests/customer-dashboard.mjs`: sidebar/header DOM identity through actual SPA navigation, delayed account requests, content-only loading, icon rail, logo and control placement, closer Overview spacing, keyboard expansion, state across navigation, logout alignment, buyer link, actual reload with delayed session verification, and the existing 40 route/viewport/accessibility checks. Existing ticket/order/profile/password/language/logout, request recovery and private ticket flows remain covered.
- `pnpm test:header`: identical home/account menu items, dimensions and typography, keyboard operation, logout, language switching, protected ticket routes and responsive navigation.
- `pnpm test:loading`: public loading, delayed requests, back/forward navigation, reduced motion and request recovery.
- `pnpm test:auth-transitions`: login/register skeletons, destination layouts and keyboard/accessibility across five widths.
- `pnpm --filter @gofest/web build`, scoped ESLint, changed-file Prettier and `git diff --check`.

Browser checks use real local API data and isolated customer fixtures that are cleaned up afterward. Request delays exercise actual loading; responses are not fabricated. Desktop and mobile screenshots are saved under `/tmp/gofest-customer-qa` during the suite.

Expanded and collapsed sidebar states and the shared account dropdown were also visually inspected. The collapsed desktop page and account dropdown each have zero axe violations or incomplete checks. All interactive changes retain keyboard focus and accessible names, and the delayed-request regression verifies that skeletons remain inside page content.

Unrelated pending edits in the global category styles, design notes, category tests and the pre-existing checkout hint are excluded from this change.
