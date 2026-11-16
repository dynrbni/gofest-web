# Customer dashboard findings

- See docs/superpowers/specs/2026-11-16-customer-dashboard-design.md for the full repository audit and proposed design.
- Existing customer routes are nested under PublicLayout. Existing account-order reads enforce authenticated userId.
- Existing ticket QR, print and email-reset flows can be reused. No favorites/avatar/notification-preferences/direct-password-change/logout-all/guest-order-claim API was found.
- Complete statistics and globally correct wallet filters need small authenticated read endpoints. Do not derive counts from a paginated order subset.
- OrderStatus and PaymentStatus differ; FAILED is a payment state. Recommendations must validate sale windows, not just remaining quota.
- Concurrent local edits and new commits appeared during the audit; stage only owned changes and inspect Git state before every commit.
