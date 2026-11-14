# DESIGN.md

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

| Token           | Nilai / HSL              | Peran                                                |
| --------------- | ------------------------ | ---------------------------------------------------- |
| Background      | `#F8FAFC`                | Latar belakang utama halaman discovery               |
| Card / Surface  | `#FFFFFF`                | Kartu event, panel transaksi, form modal             |
| Primary Brand   | `#0052CC` (Royal Blue)   | Brand utama, tombol CTA primer, badge aktif          |
| Secondary Accent| `#FF5A36` (Coral Orange) | Badge promo, countdown, status hot / trending        |
| Foreground / Ink| `#0F172A` (Slate 900)    | Judul teks, heading, harga tebal                     |
| Body Text       | `#334155` (Slate 700)    | Deskripsi, narasi, isi syarat & ketentuan            |
| Muted / Meta    | `#64748B` (Slate 500)    | Tanggal, venue, kota, label sekunder                 |
| Border          | `#E2E8F0` (Slate 200)    | Garis pemisah, border kartu, input field             |
| Muted Fill      | `#F1F5F9` (Slate 100)    | Chip nonaktif, background badge, placeholder preview |

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
