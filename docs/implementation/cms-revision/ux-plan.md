# Revisi UX Website CMS implementation plan

> **For agentic workers:** use executing-plans and delegated implementation for independent tasks, with review and integration by the primary agent.

**Goal:** Terapkan instruksi revisi UX 17 November 2026 pada CMS existing, lalu verifikasi dan push ke GitHub.

**Architecture:** Pertahankan tabel dan endpoint existing. Tambahkan CmsCity dengan pola snapshot draft/published, publikasi massal atomik dengan optimistic concurrency, serta editor halaman berbasis autosave yang memakai koleksi existing. Renderer publik membaca snapshot kota yang terbit.

**Stack:** React 19/Vite, Express/TypeScript, Prisma 4.16.2/PostgreSQL.

**Spec:** Lampiran `c32df87b-b1d9-4aca-a69c-ff9933c1eee8/Pasted text.txt`, disalin ke `ux-spec.md`.

## Batasan dan arah desain

- Authentication/role, ticketing, checkout, finance, payout/refund, check-in, notifikasi tidak diubah. Aturan Admin hanya events-for-you dipertahankan.
- Migrasi additive; lima kota lama tetap memiliki ilustrasi dan urutan yang sama.
- Tidak ada tiga screenshot target yang dilampirkan pada pesan ini. Ikuti struktur teks dan bahasa visual GOFEST existing.
- ENERGY 1 / RHYTHM 2 / MOTION 1. Aksen biru menandai baris terpilih dan tindakan utama; daftar kiri/editor kanan menjelaskan konteks tanpa modal panjang. Tipografi dan komponen existing dipertahankan untuk kesinambungan dashboard.
- Publikasi menunggu autosave/upload selesai; konflik versi refetch dengan pesan jelas. Jangan mengganti draft dari tab lain diam-diam.

## Tahapan

- [ ] 1. Backend (`cms.*`, Prisma schema/migration/seed, uploads): CmsCity, validasi ilustrasi, migrasi lima kota, publish-all atomik dengan daftar expectedVersion, changes/history endpoints, periode banner, integrasi RBAC/konflik/rollback/migrasi. Jalankan lint/types/tests/build backend.
- [ ] 2. Form dan navigasi (`cms-fields`, `cms-events`, sidebar/router): lima menu Website, field manusiawi, tab banner/identitas, pilihan tujuan tautan, selector event. Tidak ada kunci/jenis/sumber/layout teknis.
- [ ] 3. Kota publik dan editor (`city-destinations`, `cms-home`, `lib/cms`, new cms-cities): daftar/form/pratinjau, uploader existing, warna preset, fallback polos, tautan otomatis.
- [ ] 4. Alur editor (`cms-page`, new autosave/publication primitives): autosave serial dengan debounce, indikator, sticky publication bar, konfirmasi daftar perubahan, menu lainnya/riwayat, Beranda dua kolom, Banner, Halaman tabel, Menu & Footer dan live preview.
- [ ] 5. Integrasi dan verifikasi: lint/types/full API tests/build, browser desktop/tablet/mobile, save/draft isolation/preview/publish-all/city/footer/roles/conflict/accessibility. Perbarui README/hasil QA, commit kelompok logis dan push origin/main.

## Risiko dan mitigasi

- Autosave beruntun dapat memakai versi lama: serialkan per record, gunakan versi respons terbaru, blok publish saat pending.
- Publish lintas koleksi harus all-or-nothing: satu transaksi; validasi referensi/versi sebelum commit, audit/revisi di transaksi yang sama.
- Kota existing memakai sprite: simpan referensi ilustrasi bawaan secara eksplisit di dokumen migrasi, gambar baru tetap melalui media uploader.
- Hasil pencarian kota: URL query memakai slug; resolver existing harus mengenali nama kota CMS juga.
- Perubahan editor dapat membuat tes UI lama usang: pertahankan assertion perilaku API dan sesuaikan tes dengan alur baru; jangan mengurangi coverage.
