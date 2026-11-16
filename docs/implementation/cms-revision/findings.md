# Findings

- Event form loads/saves coverKey but exposes no upload control. Existing sharp/local storage can be reused; upload endpoint lacks MIME validation and type-specific limits.
- Organizer settings already upload logo/banner and persist on save; extend this flow and account avatar rather than duplicating profiles.
- Root RouteTransition keys Suspense by pathname and overlays full-page skeleton for workspace paths. RouteContent already offers an inner boundary; preserve shell and move workspace loading there.
- Existing Notification and AuditLog models should be extended/reused. Existing ContentItem is operational content; CMS needs structured editable/published entity documents and immutable revisions rather than one giant configuration JSON.
- Existing home sections are hero carousel, operational content, Event Seru Untukmu, categories and cities. CMS will manage these actual sections, with additional event source variants supported through event sections.
- Supplied logo assets were copied byte-for-byte and wired to the shared workspace shell. Lint and web build passed. Admin/Superadmin desktop/mobile verified; Creator login needs another check after a browser automation timeout.

- CMS uses separate typed document tables with current draft/published snapshots and immutable revisions; featured selections have relational event rows per stage. Required optimistic versions and slug advisory locks prevent lost updates/duplicate slug races.
- Public configuration now renders homepage, content pages, header/footer navigation, branding/SEO/colors/contact/language/timezone, announcement and maintenance. Preview requests are private/no-store, role-scoped and isolated from published queries.
- Real browser verification found homepage SEO title ordering and confirmed rate limiting during repeated login QA; both were resolved/tested without weakening authentication limits.
- Maintenance gates public and checkout layouts, leaving authentication/internal dashboards independent. Browser restored all temporary settings/content through APIs with monotonic version/audit history preserved.
