# CMS verification

Pengujian dilakukan pada 17 November 2026 (Asia/Jakarta), menggunakan API development dan web lokal di `http://localhost:5173`. Browser memakai session terpisah; tab pengguna tidak digunakan.

## Hasil

| Pemeriksaan      | Bukti                                                                                      | Status                       |
| ---------------- | ------------------------------------------------------------------------------------------ | ---------------------------- |
| CMS API          | `LOG_LEVEL=silent pnpm --filter @gofest/api exec vitest run tests/integration/cms.test.ts` | PASS, 14 test (gate backend final)                |
| Browser CMS      | `node e2e/tests/cms.mjs`                                                                   | PASS                         |
| Responsif        | 7 halaman × lebar 1440, 820, 390 px; tidak ada horizontal overflow atau error data         | PASS, 21 pemeriksaan halaman |
| Editor responsif | Dialog halaman dibuka pada tiga lebar, setelah animasi selesai; screenshot diperiksa       | PASS                         |
| Aksesibilitas    | Axe `wcag2a,wcag2aa` pada overview CMS                                                     | PASS, 0 pelanggaran          |
| Runtime browser  | `agent-browser errors` setelah alur Superadmin                                             | PASS, daftar error kosong    |
| Kualitas kode    | ESLint untuk CMS/editor/browser script; API dan web typecheck                              | PASS                         |

## Alur yang dicoba

- Membuat halaman melalui form: judul, slug, Markdown, judul SEO; menyimpan draft ke backend.
- Memastikan halaman draft belum dapat diakses publik; membuka preview aktual yang merender Markdown draft.
- Menekan Publish, menyetujui confirmation dialog, membuka halaman publik dan memeriksa konten serta `document.title` sesuai metadata halaman.
- Melakukan Unpublish melalui dialog; endpoint publik halaman kembali 404.
- Mengubah judul draft Event Seru Untukmu lewat editor; publik tetap memakai judul published, sedangkan preview homepage memakai judul draft.
- Mengunggah PNG asli melalui file input banner; preview gambar berhasil dimuat. Setelah draft disimpan dan editor dibuka kembali, image key tetap tersimpan. Banner published tampil sebagai gambar nyata di homepage.
- Memublikasikan pengaturan uji melalui API lalu memeriksa hasil di browser: nama website, judul SEO homepage, meta description, canonical URL, primary/secondary CSS variables, zona waktu, pengumuman, footer, copyright, dan tautan Instagram.
- Mengaktifkan maintenance published; homepage, katalog, dan checkout menampilkan halaman pemeliharaan. Dashboard CMS, endpoint autentikasi, dan route login tetap tersedia.
- Admin dapat membuka Featured Events dan endpoint section miliknya, tetapi ditolak dari pengaturan global. Creator ditolak dari Featured Events maupun Website CMS. Form global tidak ditampilkan kepada kedua role tersebut.

Pengujian pertama menemukan judul SEO homepage ditambah suffix merek oleh hook halaman. Root memperbaiki hook agar judul SEO yang dikonfigurasi dipakai persis; pengujian lengkap berikutnya lulus.

## API coverage

`apps/api/tests/integration/cms.test.ts` mencakup pembatasan role, isolasi draft/published, unpublish, optimistic concurrency (termasuk dua publish bersamaan menghasilkan satu 200 dan satu 409), URL tidak aman, slug sistem/duplikat, referensi media, event tidak layak tayang, urutan FeaturedEvent terpisah untuk DRAFT/PUBLISHED, isolasi preview Admin dari draft global, maintenance yang tidak memutus login/dashboard, upload gambar, navigasi, audit log, dan revisi publikasi.

## Pemulihan data development

Browser script memakai halaman dan banner dengan nama unik. Keduanya dihapus sesudah pengujian; file upload serta baris MediaAsset uji juga dihapus. Konfigurasi Featured Events dan settings dikembalikan ke draft/published/status sebelumnya melalui API. Perbandingan settings memakai skema backend agar JSON seed yang belum menyertakan field default dianggap setara dengan hasil normalisasi API.

Versi publikasi dan audit log tidak dimundurkan; aktivitas pengujian tetap tercatat. Tidak ada konfigurasi maintenance, branding, atau konten uji yang tertinggal aktif. Script dibatasi ke server localhost dan memakai storage backend development untuk membersihkan hanya image key yang diunggah oleh run tersebut.

Log browser tersedia di `/tmp/gofest-cms-browser.log`. Screenshot editor tersedia di `/tmp/gofest-cms-qa/editor-1440.png`, `/tmp/gofest-cms-qa/editor-820.png`, dan `/tmp/gofest-cms-qa/editor-390.png`.
