# GOFEST dashboard improvements & Website CMS

Revisi ini memperluas repository existing. Authentication, ticketing, checkout, keuangan, ledger, refund dan reservasi payout tetap menggunakan implementasi sebelumnya. Tidak ada integrasi Xendit atau transfer payout baru.

## Penggunaan

- Superadmin: **Website CMS** → Ringkasan, Homepage, Hero banners, Halaman website, Navigasi website, Branding & footer.
- Admin/Superadmin: **Content Management → Event Seru Untukmu**.
- Creator: Create/Edit Event untuk banner; Pengaturan Organisasi untuk profil publik/cover; Profil akun untuk foto akun. Logo Admin digunakan Admin/Superadmin, logo Creator digunakan kedua alias `/creator/*` dan `/organizer/*`.
- Simpan draft, buka Preview website, lalu Publish dengan konfirmasi. Perubahan draft tidak mengganti snapshot published. Unpublish menyembunyikan snapshot tersebut; audit/revisi tetap disimpan.
- Halaman CMS terbit dapat dibuka di `/pages/:slug`, `/p/:slug`, atau `/:slug`. Slug sistem dilindungi. `/terms` dan `/privacy` mendukung konten CMS dengan fallback halaman existing.

## Perubahan utama

| Bagian | Hasil |
| --- | --- |
| Event banner | Uploader nyata pada create/edit, preview, ganti/hapus, loading/error, simpan coverKey dan buka kembali; tampil pada event publik. |
| Creator profile | Foto akun terpisah dari logo organisasi dan cover; contact, location, website/social links; foto di topbar/profil dan data organisasi di profil publik. |
| Storage | MIME dan signature harus cocok, decoding Sharp menolak gambar rusak, avatar maksimal2MB, gambar lain8MB, UUID, WebP, metadata MediaAsset dan ownership. |
| Loading/sidebar | Root boundary tidak mengganti shell dashboard saat route berubah. Sidebar/topbar tetap mounted; scroll, collapse dan grup dipertahankan; skeleton konten menyesuaikan halaman. |
| Badges | Unread per kategori/recipient dari server; tidak dibaca otomatis saat membuka tujuan; >99 menjadi99+; inbox, sidebar dan topbar berbagi query/invalidation. Polling `VITE_NOTIFICATION_POLL_INTERVAL_MS`, minimum10detik/default30detik, berhenti saat tab tidak aktif. |
| Featured events | Search event database dengan banner/organizer/category/date/location/status; manual order/remove, automatic upcoming/latest/popular, visibility/title/description/layout/limit. Public memakai konfigurasi published. |
| CMS homepage | Mengelola section existing: hero, promosi operasional, acara, kategori dan kota. Section acara dapat ditambah untuk featured/popular/upcoming dengan sumber nyata. Urutan numerik, visibility dan limit diterapkan ke renderer publik. |
| CMS banners/pages | Upload desktop/mobile, caption/CTA, order/visibility; Markdown disanitasi, slug, judul/meta SEO, draft/publish/unpublish dan preview aktual. |
| Navigation/footer | Link header/footer, label/order/visibility/external; footer logo/description/contact/social/copyright. Tujuan sistem penting tetap tersedia; path internal baru harus cocok route publik atau halaman CMS. |
| Branding/configuration | Nama, logo, favicon, warna dengan teks kontras aman, description/title/OG/canonical, default language/timezone, announcement dan maintenance diterapkan pada publik. |
| Maintenance | Home, katalog, profil publik dan checkout/order menampilkan maintenance; login serta dashboard internal tetap dapat dipakai untuk memulihkan website. |

Section yang belum ada seperti newsletter dan organizer showcase tidak dibuat sebagai kontrol kosong. CMS mengelola section yang benar-benar dirender aplikasi.

## Model dan migrasi

`20261117010000_cms_media_notifications` menambah User.avatarKey; kontak/lokasi/social OrganizerProfile; MediaAsset; Notification.category; WebsiteSetting, CmsSection, CmsBanner, CmsPage, CmsNavigationItem, FeaturedEvent, CmsRevision dan enum CmsStatus. Existing Notification/AuditLog/OrganizerProfile tetap dipakai, tidak diduplikasi.

Setiap entitas CMS memiliki dokumen draft/published dengan skema validasi khusus, status, optimistic version, actor dan waktu. FeaturedEvent memiliki relasi event/section dengan urutan terpisah DRAFT/PUBLISHED. CmsRevision menyimpan snapshot publikasi immutable; AuditLog mencatat perubahan. Ini bukan satu JSON besar berisi seluruh website. Perubahan slug halaman diserialisasi menggunakan transaction advisory lock; update draft dan publish menolak versi yang sudah berubah.

`20261117020000_cms_navigation_defaults` memindahkan tautan footer existing menjadi konfigurasi editable. Kedua migrasi diterapkan pada development dan test tanpa reset data. Seed/default homepage mempertahankan section existing.

Untuk lingkungan lain:

```sh
pnpm install
pnpm db:generate
pnpm --filter @gofest/api db:deploy
pnpm build
```

Storage local memerlukan direktori writable sesuai `STORAGE_DIR`, dan mount persistent untuk deployment. Boundary fungsi storage tetap dapat diimplementasikan ulang dengan object storage.

## Endpoint

Semua path relatif terhadap `/api/v1`.

| Endpoint | Hak akses / fungsi |
| --- | --- |
| `POST /uploads` | Authenticated multipart; folders events/organizers/avatars/cms, batas dan role sesuai jenis. Mengembalikan metadata/key/URL. |
| `PATCH /auth/profile` | Simpan/hapus avatar akun sendiri. |
| `GET/PATCH /organizer/account/profile` | Profil organisasi sendiri termasuk cover/contact/social/location. |
| `GET /admin/cms/overview` | Superadmin; status, counts dan aktivitas CMS. |
| `GET /admin/cms/events?q=&ids=&page=&limit=` | Admin/Superadmin; selector event layak. |
| `GET/POST /admin/cms/:collection` | List/create sections, banners, pages, navigation atau settings. Admin dibatasi key events-for-you pada sections. |
| `PATCH/DELETE /admin/cms/:collection/:id` | Edit draft versi terkini/delete; core sections dan general settings dilindungi dari delete. |
| `POST /admin/cms/:collection/:id/publish` | Publish snapshot atomik; expectedVersion wajib. |
| `POST /admin/cms/:collection/:id/unpublish` | Tarik snapshot publik dengan konfirmasi UI dan pemeriksaan versi. |
| `GET /admin/cms/preview` | Private/no-store draft snapshot. Admin hanya dapat preview draft featured miliknya, global tetap published. |
| `GET /cms/site` | Konfigurasi published terbaru beserta event aktif untuk rendering. |
| `GET /cms/pages/:slug` | Hanya konten halaman published dan visible. |
| `GET /admin|creator/notifications` | Inbox dan unread/category counts milik recipient; alias organizer tetap didukung. |
| `PATCH /admin|creator/notifications/:id/read` | Mark read eksplisit milik akun, idempotent. |

## File penting

- `apps/api/src/modules/cms/`: skema dokumen, repository, publikasi/revisi, selector, renderer data dan routes.
- `apps/api/src/lib/storage.ts`, `modules/uploads/*`, `modules/organizers/organizer.service.ts`, `modules/auth/auth.service.ts`.
- `apps/api/src/modules/notifications/inbox.service.ts`, `modules/workspace/workspace.routes.ts` dan notification callsites.
- `apps/web/src/pages/cms/*`: editor dan event selector dengan komponen shared uploader.
- `apps/web/src/pages/public/cms-home.tsx`, `cms-page.tsx`, `components/common/site-branding.tsx`, `components/layout/public-layout.tsx` dan `checkout-layout.tsx`.
- `apps/web/src/components/layout/workspace-layout.tsx`, `components/common/route-transition.tsx`, `page-skeleton.tsx`, `lib/workspace-notifications.ts`.
- `apps/web/src/components/common/image-uploader.tsx`, `user-avatar.tsx`, event form dan halaman profil existing.

## Verifikasi

- Backend: **19 files /138 tests PASS**, termasuk14 CMS,4 media/profile dan3 notification tests baru. Existing order/checkout, auth/roles, finance, payout/refund dan check-in tests tetap lolos.
- Lint, shared/API/web typecheck dan API/web production build PASS.
- Prisma validate PASS; live schema vs datamodel: no difference.
- Browser CMS:21 halaman/viewport checks ditambah draft/preview/publish/unpublish/upload/public branding/maintenance dan role denial, axe0, console errors kosong.
- Browser shell:3 roles, shell node identity, scroll/group/collapse, unread count dan logo; desktop/mobile.
- Browser media: upload server, preview/loading/save/reload/remove, profil publik, mobile390 dan event-form axe0.
- Lihat `cms-qa.md`, `media-qa.md` dan `progress.md` untuk rincian bukti dan regresi terakhir.

## Batasan operasional

- CMS mendukung urutan numerik; drag-and-drop tidak ditambahkan. Automatic popular memakai jumlah tiket yang pernah diterbitkan; upcoming/latest memakai waktu event/publikasi, tidak acak.
- Event APPROVED boleh dipilih untuk penjadwalan featured; hanya PUBLISHED yang ditampilkan kepada pembeli, sesuai visibility dan checkout existing. Event berakhir/tidak aktif dikeluarkan saat public read.
- Media yang dilepas tidak langsung dihapus karena masih mungkin direferensikan event lain atau revisi published. Garbage collection memerlukan pemeriksaan seluruh referensi.
- Cache publik menggunakan React Query di memori dengan polling; jika fetch berikutnya gagal, data published terakhir di sesi tetap tersedia. Belum ada persistent offline cache/CDN invalidation/push realtime baru.
- CMS SEO diterapkan pada aplikasi client-rendered yang ada. Prerender/server rendering untuk crawler OG yang tidak menjalankan JavaScript belum termasuk.
- Tidak ada gateway transfer, refund eksternal atau payout completion palsu. Provider scope mengikuti implementasi keuangan sebelumnya.
