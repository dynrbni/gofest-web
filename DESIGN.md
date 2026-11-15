# DESIGN.md

## Redesign November 2026

Referensi visual yang diimplementasikan ada di `docs/design/marketplace-reference.webp` dan `docs/design/event-detail-reference.webp`. Referensi ini digunakan untuk komposisi dan hierarki; isi acara, harga, kuota, dan organizer tetap berasal dari API.

- Header putih dengan pencarian utama, mega dropdown kategori dari API, pilihan bahasa ID/English, dan akses tiket/creator. Header bawah hanya memuat Jelajah acara dan Acara gratis dengan indikator aktif yang mengikuti query harga.
- Katalog memakai ribbon kategori, filter lokasi/tanggal/harga/status mendatar, reset, urutan hasil, dan grid empat kolom pada desktop. Filter disimpan pada URL dan dapat dikombinasikan.
- Login/register memakai komposisi 940px, foto samping 510px pada desktop, tab akun, dan form tanpa panel bertumpuk. Foto disembunyikan pada mobile supaya form langsung terjangkau.
- Kartu kota memakai diorama 3D Monas, Gedung Sate, Tugu, Sura dan Baya, serta pura Denpasar. Hover dan fokus mengangkat kartu/landmark, memperjelas border biru, dan menambah bayangan; underlay turquoise tetap terlihat.
- Banner berukuran 340px pada desktop supaya navigasi dan kategori tetap terjangkau di laptop. Foto konser editorial hanya dipakai untuk pengenalan GoFest; poster acara memakai aset milik masing-masing acara.
- Kartu acara 16:9 menampilkan tanggal, judul, lokasi, harga, dan organizer. Status gratis, online, dan habis hanya tampil jika sesuai data.
- Detail acara memakai panel pemilihan kategori tiket. Pilihan diteruskan melalui parameter `ticket` dan divalidasi kembali terhadap tiket yang dijual di checkout.
- Panel transaksi memakai garis biru di atas untuk membedakan tindakan beli dari informasi acara. Harga dan kuota tetap dihitung oleh backend.
- Akun dan workspace memakai kanvas slate, panel putih, tab bergaris, serta sidebar dengan indikator biru. Tabel dapat digulir dan difokuskan lewat keyboard.
- Motion: perpindahan halaman 240ms, pergantian sorotan 480ms, feedback kartu 200ms, dan panel mobile 200ms. Transform digunakan untuk menghindari penurunan kontras teks selama animasi. Semua gerak mengikuti `prefers-reduced-motion`.
- Carousel otomatis berhenti saat hover, fokus keyboard, tab browser tidak aktif, reduced motion, atau pengguna menekan jeda.
- Klaim pembayaran dan keamanan harus mencerminkan integrasi yang tersedia. Jangan menampilkan logo bank/wallet yang belum terhubung.

Token utama: biru `#0052CC`, navy `#102447`, putih `#FFFFFF`, slate `#F8FAFC`, border `#E2E8F0`. Manrope tetap menjadi font utama. Radius 8px untuk kontrol, 12px untuk kartu dan panel, 16px untuk banner.

Arah desain ini mengikat seluruh halaman Gofest. Mengadopsi standar komersial industri event ticketing Indonesia seperti **Artatix** dan **Loket.com**.

## 1. Design Philosophy

> Standar platform discovery & ticketing event modern: kanvas putih bersih, tipografi geometric sans-serif modern, kartu event komersial dengan poster tajam, date chip, harga jelas "Mulai dari Rp X", dan alur pemesanan sticky yang cepat dan responsif.

Gofest dirancang untuk kecepatan navigasi dan konversi pembelian tiket, dengan hierarki visual yang jelas, banner promosi heroik, dan interaksi yang solid tanpa elemen retro/kuno.

## 2. Prinsip Utama

1. **Clean & High Contrast Canvas**: Kanvas putih bersih (`#FFFFFF` dan `#F8FAFC`) dengan border halus (`#E2E8F0`) dan tipografi tajam (`#0F172A`).
2. **Poster Event Menjadi Pusat Perhatian**: Gambar cover poster event dengan rasio tajam (16:9 atau 4:5), sudut membulat modern (`rounded-xl`/`rounded-2xl`), dan efek hover halus (`hover:shadow-lg hover:-translate-y-1`).
3. **Standar Komersial Loket / Artatix**:
   - Hero banner carousel dengan navigation dots & arrows untuk event unggulan / trending.
   - Category chips dengan ikon yang intuitif (Musik, Festival, Olahraga, Pameran, Workshop, Standup Comedy).
   - Event card dengan date pill, city/venue dengan ikon lokasi, dan harga terformat jelas "Mulai dari Rp 150.000" atau "Gratis".
   - Sticky booking widget di event detail dan floating bottom purchase drawer di mobile.
4. **Data Riil dari Database**: Seluruh data acara, kuota tiket, dan organizer terhubung langsung ke backend PostgreSQL.
5. **Aksesibilitas & Standar Antislop**: Focus state yang jelas, kontras warna AA/AAA, ukuran tap target ramah sentuhan, dan transisi motion yang fungsional.

## 3. Palet Warna (Loket & Artatix Modern)

| Token            | Nilai / HSL              | Peran                                                |
| ---------------- | ------------------------ | ---------------------------------------------------- |
| Background       | `#F8FAFC`                | Latar belakang utama halaman discovery               |
| Card / Surface   | `#FFFFFF`                | Kartu event, panel transaksi, form modal             |
| Primary Brand    | `#0052CC` (Royal Blue)   | Brand utama, tombol CTA primer, badge aktif          |
| Secondary Accent | `#FF5A36` (Coral Orange) | Badge promo, countdown, status hot / trending        |
| Foreground / Ink | `#0F172A` (Slate 900)    | Judul teks, heading, harga tebal                     |
| Body Text        | `#334155` (Slate 700)    | Deskripsi, narasi, isi syarat & ketentuan            |
| Muted / Meta     | `#64748B` (Slate 500)    | Tanggal, venue, kota, label sekunder                 |
| Border           | `#E2E8F0` (Slate 200)    | Garis pemisah, border kartu, input field             |
| Muted Fill       | `#F1F5F9` (Slate 100)    | Chip nonaktif, background badge, placeholder preview |

## 4. Tipografi

- **Font Keluarga**: Pure modern sans-serif menggunakan **Manrope Variable** (dan system-ui sans-serif fallback).
- Tidak menggunakan font serif vintage/antik pada headline atau navigasi.
- **Heading**: Manrope 700 / 800 bold dengan letter-spacing tight (`-0.025em`).
- **Body**: Manrope 400 / 500 dengan line-height 1.6.
- **Harga & Angka**: Manrope 700 / 800 dengan `tabular-nums`.

## 5. Komponen Utama

### Header & Navigasi

- Sticky navbar putih dengan border bawah halus dan backdrop blur.
- Logo brand Gofest dengan tiket icon badge royal blue.
- Search input cepat dengan shortcut kota.
- Link: Jelajah Event, Acara Gratis, Tiket Saya, dan tombol CTA "+ Buat Event".
- Menu profil akun dengan dropdown responsif.

### Hero Banner Carousel

- Carousel banner lebar untuk event headline mingguan.
- Overlay gradient, date badge, judul tebal, venue, harga awal, dan tombol "Beli Tiket".
- Navigasi tombol panah kiri-kanan dan indicator dots.

### Event Cards (Loket / Artatix Grid)

- Aspect ratio poster 16:9 atau 4:5 dengan rounded-xl.
- Category badge mengambang di pojok poster.
- Date dengan CalendarDays icon berwarna biru.
- Judul 2 baris `line-clamp-2` dengan hover state warna brand.
- Info lokasi (venue & kota) dengan ikon MapPin.
- Footer kartu: "Mulai dari" dengan teks harga tebal.

### Event Detail

- Large cover visual dengan ambient blur.
- Tab navigasi internal: Deskripsi, Tiket, Syarat & Ketentuan, Lokasi.
- Sticky ticket booking panel di desktop dan fixed bottom action bar di mobile.
- Counter kuota tiket real-time dan validasi status penjualan.
