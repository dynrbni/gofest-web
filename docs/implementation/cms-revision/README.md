# GOFEST dashboard improvements & Website CMS (Full CMS-Driven Revision)

Revisi ini memperluas repository existing menjadi Full CMS-driven. Authentication, ticketing, checkout, keuangan, ledger, refund dan reservasi payout tetap menggunakan implementasi sebelumnya tanpa perubahan fungsional atau breaking change.

## Penggunaan

- Superadmin: Sidebar grup **Website** berisi 5 menu: **Beranda**, **Banner**, **Halaman**, **Menu & Footer**, **Identitas Web**. Tab bar duplikat dihilangkan. Halaman Ringkasan digantikan oleh baris status website aktif/maintenance dan counter perubahan draft di header Beranda.
- Admin: Sidebar grup **Website → Beranda** (dibatasi hanya mengedit bagian rekomendasi `Event Seru Untukmu`). Menu lama `Content Management → Event Seru Untukmu` dihapus dan digabung ke Beranda.
- Perubahan draft disimpan otomatis (debounced autosave) dengan indikator status jelas ("Tersimpan sebagai draft"). Penanganan konflik versi mendeteksi `expectedVersion` dengan pesan jelas dan refetch otomatis.
- Bar sticky di bawah layar: menampilkan ringkasan draft belum terbit, tombol Preview ke tab baru, dan tombol "Terbitkan ke website" yang membuka dialog konfirmasi daftar perubahan sebelum melakukan publikasi massal atomik.
- Menu opsi per-item (`⋯`): riwayat versi, tarik dari website (unpublish), dan hapus (untuk item non-sistem). Baris yang sedang disunting ditandai dengan latar dan garis aksen biru.
- Halaman CMS terbit dibuka di `/pages/:slug`, `/p/:slug`, atau `/:slug`. Slug sistem tetap dilindungi. `/terms` dan `/privacy` mendukung konten CMS dengan fallback halaman existing.

## Perubahan utama

| Bagian                 | Hasil                                                                                                                                                                                                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Navigasi website       | Sidebar admin grup "Website" berisi 5 menu (Beranda, Banner, Halaman, Menu & Footer, Identitas Web). Tab bar horizontal CMS dan halaman Ringkasan dihapus; status website aktif/pemeliharaan & counter perubahan draft dipindah ke header Beranda.                      |
| Alur simpan & terbit   | Autosave debounced dengan indikator "Tersimpan sebagai draft". Sticky publication bar di bawah halaman dengan konfirmasi rincian perubahan. Endpoint publikasi massal atomik `POST /admin/cms/publish-all`. Aksi unpublish/hapus/riwayat pindah ke menu `⋯`.          |
| Bagian Beranda         | Susunan section sesuai urutan publik (Banner utama, Promosi, Event Seru Untukmu, Kategori Event, Jelajahi Event di Kotamu) dengan toggle visibilitas, tombol naik/turun, dan tombol Ubah yang membuka panel editor kolom kanan tanpa modal panjang.                     |
| Event Seru Untukmu     | Pilihan sumber ramah manusia: "Pilih sendiri" (manual), "Paling laris" (popular), "Event terdekat" (upcoming), "Terbaru" (latest); jumlah maksimal; mode Pilih sendiri menampilkan thumbnail/nama/organizer/jadwal, reorder naik/turun, dan dialog selector event.    |
| Kelola Kota (Baru)     | Data kota publik kini CMS-driven melalui model `CmsCity`. Halaman Bagian Kota menyediakan daftar kota di kiri dan form tambah/ubah di kanan dengan preset 5 warna aksen, unggahan ilustrasi opsional (transparan, persegi >=600px, <=2MB), serta live preview kartu.     |
| Menu & Footer          | Mengelola logo footer, deskripsi, copyright, serta tautan grup "Jelajahi website" dan navigasi header dalam satu halaman dengan tab Header & Footer. Pemilih tautan tujuan mendukung route sistem, halaman CMS terbit, dan tautan eksternal.                             |
| Identitas Web          | Form identitas dipecah menjadi 5 tab: Identitas (nama, logo, favicon, warna, pengumuman, bahasa, timezone), Kontak & Sosmed (email, telp, WA, IG, TikTok, sosmed lain), Footer link, SEO (meta title/desc, OG image, site URL), dan Maintenance.                   |
| Banner & Halaman       | Banner menampilkan kartu dengan thumbnail, jadwal tayang, toggle, dan editor tab (Konten, Gambar desktop & mobile, Tampilan). Halaman website menampilkan tabel dengan status dan editor konten markdown, dengan pembuatan slug otomatis yang ramah SEO.                |

## Model dan migrasi

1. `20261117010000_cms_media_notifications`: Fondasi awal CMS (User.avatarKey, OrganizerProfile kontak/sosmed, MediaAsset, Notification.category, WebsiteSetting, CmsSection, CmsBanner, CmsPage, CmsNavigationItem, FeaturedEvent, CmsRevision, CmsStatus).
2. `20261117020000_cms_navigation_defaults`: Memindahkan tautan default footer ke dalam tabel konfigurasi CMS.
3. `20261117030000_cms_cities_publication`: Menambahkan model dan tabel `cms_cities` dengan skema versioned CMS (draft/published JSON, optimistic version, status, audit user, slug unik) dan migrasi data awal untuk lima kota bawaan (Jakarta, Bandung, Yogyakarta, Surabaya, Denpasar) dengan status PUBLISHED, urutan 0–4, dan sprite ilustrasi bawaan GOFEST.

Untuk deploy:

```sh
pnpm install
pnpm db:generate
pnpm --filter @gofest/api db:deploy
pnpm build
```

## Endpoint

Semua path relatif terhadap `/api/v1`.

| Endpoint                                     | Hak akses / fungsi                                                                                                           |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `POST /uploads`                              | Authenticated multipart; folder `events`, `organizers`, `avatars`, `cms`, dan `cms-cities` (khusus ilustrasi kota persegi transparan). |
| `GET /admin/cms/overview`                    | Superadmin; ringkasan metadata CMS (dialihkan ke `/admin/cms/sections` di web UI).                                           |
| `GET /admin/cms/changes`                     | Admin/Superadmin; mendeteksi seluruh draft yang berbeda dari published snapshot, disaring sesuai hak akses.                  |
| `POST /admin/cms/publish-all`                | Admin/Superadmin; publikasi massal atomik dalam 1 transaksi database dengan validasi `expectedVersion` per item.            |
| `GET /admin/cms/:collection/:id/revisions`   | Admin/Superadmin; riwayat revisi dan status publikasi suatu record (hingga 50 revisi terbaru).                                |
| `GET/POST /admin/cms/:collection`            | List/create sections, banners, pages, navigation, settings, atau cities. Admin hanya diizinkan untuk `events-for-you`.       |
| `PATCH/DELETE /admin/cms/:collection/:id`    | Simpan draft dengan `expectedVersion`/hapus record non-sistem.                                                                |
| `POST /admin/cms/:collection/:id/publish`    | Publish atomik per item dengan pemeriksaan versi.                                                                            |
| `POST /admin/cms/:collection/:id/unpublish`  | Tarik publikasi per item dengan konfirmasi dan pemeriksaan versi.                                                            |
| `GET /admin/cms/preview`                     | Snapshot draft privat untuk pratinjau website tanpa memengaruhi data publik.                                                |
| `GET /cms/site`                              | Konfigurasi website terbit terbaru beserta banner aktif, section berurutan, event aktif, dan daftar kota publik.             |
| `GET /cms/pages/:slug`                       | Konten halaman CMS yang sudah diterbitkan dan visible.                                                                       |

## Verifikasi

- Backend test suite: **20 files / 147 tests PASS**, mencakup pengujian menyeluruh integrasi CMS UX (`cms-ux.test.ts`), model/endpoint CmsCity, publikasi massal atomik, migrasi lima kota, proteksi role Admin vs Superadmin, validasi unggahan ilustrasi kota (MIME, dimensi >=600px, alpha transparency), dan isolasi draft.
- Lint (`eslint .`), TypeScript typecheck (`@gofest/shared`, `@gofest/api`, `@gofest/web`), dan production build (`@gofest/api`, `@gofest/web`) **PASS** tanpa error atau warning.
