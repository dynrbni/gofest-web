# GOFEST – REVISI UX WEBSITE CMS (FULL CMS-DRIVEN)

## Konteks
Ini TASK REVISI di repository yang sudah ada, bukan bikin ulang. CMS yang ada secara fitur sudah lengkap (draft/publish, versi, audit, upload, preview) tapi sangat sulit dipakai. Revisi ini mengubah UX dan melengkapi bagian yang masih hardcode, supaya SEMUA section website publik benar-benar bisa diatur dari CMS oleh orang non-teknis.

JANGAN ubah: authentication/role, ticketing, checkout, keuangan, payout, refund, check-in, notifikasi. Jangan hapus tabel/endpoint existing. Migrasi harus additive. Semua test yang sekarang lolos harus tetap lolos.

Referensi: docs/implementation/cms-revision/ (README.md, spec.md). Lampiran: 3 screenshot desain target (Beranda, Bagian Kota, Footer). Jika desain dan teks ini berbeda, ikuti desain untuk tampilan dan teks ini untuk perilaku.

## LANGKAH 0 – Inspeksi dulu, jangan langsung coding
Baca: apps/web/src/pages/cms/*, apps/web/src/pages/admin/admin-shell.tsx, apps/web/src/components/discovery/city-destinations.tsx, pages/public/cms-home.tsx, components/common/site-branding.tsx, public-layout.tsx, apps/api/src/modules/cms/*, prisma/schema.prisma, apps/api/src/modules/uploads/*.
Lalu tulis rencana singkat (file yang diubah, model baru, risiko), baru kerjakan bertahap. Setelah tiap fase jalankan lint, typecheck, test, dan build.

## 1. Navigasi sidebar
Group "Website" di sidebar admin berisi 5 menu saja: Beranda, Banner, Halaman, Menu & Footer, Identitas Web.
- Hapus tab bar horizontal di dalam halaman CMS (duplikat sidebar).
- Hapus halaman "Ringkasan". Info statusnya (website aktif/maintenance, jumlah perubahan belum terbit) pindah ke header Beranda sebagai baris kecil.
- Ikon Homepage jangan kalender. Nama grup dan item jangan sama ("Website CMS" dobel).
- Menu lama "Content Management → Event Seru Untukmu" dihapus, digabung ke Beranda. Role Admin tetap hanya boleh mengedit section events-for-you (pertahankan aturan hak akses existing); Superadmin boleh semua.
- Semua teks UI bahasa Indonesia konsisten: Terbitkan, Draft, Tarik dari website, Banner utama. Jangan ada istilah teknis (key, kind, layout, source, slug mentah) di UI.

## 2. Alur simpan dan terbit (ganti pola kartu + tombol Publish/Unpublish)
- Pertahankan mekanisme backend draft/published/versi/revisi. Yang diubah hanya UX.
- Perubahan tersimpan otomatis sebagai draft (debounce) dengan indikator "Tersimpan sebagai draft". Tangani konflik versi (expectedVersion) dengan pesan jelas dan refetch, jangan error mentah.
- Satu bar sticky di bawah halaman: "N perubahan belum diterbitkan" + tombol Preview + tombol "Terbitkan ke website". Terbitkan membuka dialog konfirmasi yang menyebut apa saja yang berubah.
- Buat endpoint publish massal yang atomik untuk semua draft yang berbeda dari published (atau pakai transaksi yang setara). Hak akses per koleksi tetap berlaku.
- Tarik dari website (unpublish), hapus, dan riwayat versi dipindah ke menu "⋯" per item, bukan tombol utama.
- Hapus tombol per-kartu "Edit draft / Preview / Publish / Unpublish / Hapus". Baris yang sedang diedit cukup ditandai dengan latar dan garis biru di kiri; JANGAN tampilkan tombol status "Sedang diubah" (sudah diputuskan jelek).

## 3. Halaman Beranda
Daftar section berurutan seperti urutan di website publik: baris berisi nama, ringkasan satu baris, tombol naik/turun (tanpa drag-and-drop), toggle tampil/sembunyi, tombol "Ubah". Klik "Ubah" membuka panel edit di kolom kanan, bukan dialog modal panjang.
- Section yang ada: Banner utama, Promosi, Event Seru Untukmu, Kategori Event, Jelajahi Event di Kotamu. Jangan sediakan kontrol untuk section yang belum dirender aplikasi.
- Banner utama: tombol "Ubah" mengarah ke menu Banner.
- Kategori: judul, tampil/sembunyi, jumlah maksimal. Isi diambil otomatis dari data kategori existing.
- Promosi: pertahankan perilaku existing, hanya rapikan form.
- Event Seru Untukmu (panel kanan): judul bagian; pilihan sumber berupa kartu pilihan berbahasa manusia, petakan ke nilai existing: "Pilih sendiri" = manual, "Paling laris" = popular, "Event terdekat" = upcoming, "Terbaru" = latest; jumlah maksimal; untuk mode "Pilih sendiri" tampilkan daftar event terpilih (thumbnail, nama, organizer, tanggal) dengan tombol Hapus, naik/turun, dan tombol "Tambah event" yang membuka selector event dengan pencarian (komponen selector existing dipakai ulang; aturan APPROVED/PUBLISHED existing tetap).
- Jelajahi Event di Kotamu: "Ubah" membuka halaman khusus (bagian 4).

## 4. Bagian Kota – kelola kota dan ilustrasinya (BARU, saat ini hardcode)
Sekarang kota dan ilustrasinya (Jakarta, Bandung, Yogyakarta, Surabaya, Denpasar) di-hardcode di frontend. Jadikan data CMS.
- Model baru CmsCity (ikuti pola draft/published/versi/audit entitas CMS lain): nama, slug otomatis dari nama (unik), imageKey (opsional), warna aksen (dari 5 preset, bukan color picker bebas), urutan, tampil/sembunyi.
- Halaman: kiri daftar kota (thumbnail, nama, status ilustrasi "Ilustrasi terpasang" / "Belum ada ilustrasi, kartu tampil polos", naik/turun, toggle, Ubah). Kanan form "Tambah kota": nama kota, dropzone ilustrasi, pilihan warna, pratinjau kartu langsung, tombol Batal/Tambah kota.
- Ilustrasi OPSIONAL. Tanpa ilustrasi, kartu publik tampil polos dengan ikon lokasi, jadi kota baru bisa langsung terbit tanpa asset. Syarat file tampil di form: PNG/WebP transparan, persegi, minimal 600 px, maks 2 MB. Pakai upload service existing (validasi MIME + signature, Sharp, ownership); tambahkan batas 2 MB dan minimal dimensi untuk folder ini.
- Tautan kartu otomatis ke /events?city=<slug>. Admin tidak mengetik URL.
- MIGRASI DATA: pindahkan lima kota existing beserta ilustrasinya ke tabel baru lewat migrasi/seed, supaya tampilan publik identik sebelum dan sesudah. Renderer publik membaca data CMS terbit, dengan fallback aman jika kosong.

## 5. Footer, Logo, dan Menu (Menu & Footer)
- Halaman Footer: ganti logo footer (upload, pratinjau), deskripsi singkat, daftar tautan grup "Jelajahi website" (label, tujuan, toggle, naik/turun, Ubah, Tambah tautan). Pratinjau footer di kanan berubah langsung saat form diubah.
- Tujuan tautan DIPILIH dari daftar (halaman sistem yang valid + halaman CMS terbit), ditambah opsi "Tautan eksternal" untuk URL. Pakai validasi existing (path internal harus cocok route publik atau halaman CMS).
- Menu header ada di halaman yang sama (tab "Header" dan "Footer"), dengan pola daftar yang sama.
- Logo header/favicon/warna/kontak/SEO/maintenance ada di "Identitas Web". Pecah form panjang jadi tab: Identitas, Kontak & Sosmed, Footer link, SEO, Maintenance.

## 6. Banner dan Halaman
- Banner: tampilan grid/baris dengan thumbnail gambar, judul, periode tayang, toggle, menu ⋯. Form tab: Konten, Gambar (desktop dan mobile), Tampilan.
- Halaman: tabel (judul, alamat halaman, status, diperbarui) + editor konten. Slug otomatis dari judul, bisa diubah, slug sistem tetap terlindungi.

## Aturan umum
- Reuse komponen existing (uploader, event selector, ConfirmDialog, Panel); jangan bikin duplikat.
- Aksesibilitas: target sentuh minimal 44 px, label pada semua input, toggle pakai aria-pressed, tombol ikon pakai aria-label, kontras teks 4.5:1.
- Tidak ada section kosong/placeholder yang tidak berfungsi. Semua kontrol harus benar-benar memengaruhi website publik setelah diterbitkan.
- Tambahkan test integrasi untuk: model/endpoint CmsCity, publish massal, aturan hak akses Admin vs Superadmin, dan migrasi lima kota awal.
- Update docs/implementation/cms-revision/README.md sesuai perubahan.
- Setelah selesai, laporkan: file yang diubah, migrasi baru, hasil lint/typecheck/test/build, dan hal yang sengaja tidak dikerjakan.