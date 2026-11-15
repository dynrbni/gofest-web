# DESIGN.md

## Redesign November 2026

Referensi visual yang diimplementasikan ada di `docs/design/marketplace-reference.webp` dan `docs/design/event-detail-reference.webp`. Referensi ini digunakan untuk komposisi dan hierarki; isi acara, harga, kuota, dan organizer tetap berasal dari API.

- Header putih dengan pencarian utama, mega dropdown kategori dari API, pilihan bahasa ID/English, dan tautan Jadi Partner Kami. Tautan tiket langsung dan header bawah dihapus; pesanan tetap tersedia melalui menu akun.
- Katalog memakai ribbon kategori, filter lokasi/tanggal/harga/status mendatar, reset, urutan hasil, dan grid empat kolom pada desktop. Filter disimpan pada URL dan dapat dikombinasikan.
- Login/register serta pemulihan password memakai kanvas biru muda #F2F6FF di desktop, dengan trio maskot biru di kiri dan form putih di kanan. Logo asli dan pilihan bahasa ID/EN berada di baris atas form, mengikuti referensi Artatix pengguna. Judul dan label rata kiri; tautan pindah akun berada di bawah form tanpa tab Masuk/Daftar. Register memiliki tiga langkah: Data diri (nama lengkap, username, HP, email), Password, Verifikasi email. Nama lengkap dan username disimpan terpisah. Password menampilkan meter kekuatan, checklist lima persyaratan dan tombol show/hide. Pada mobile kanvas putih memprioritaskan form; ilustrasi ringkas disembunyikan hanya pada register dengan tinggi layar ≤740px supaya langkah normal tetap muat tanpa scroll. Error, pembesaran teks dan keyboard tetap boleh menambah tinggi halaman tanpa clipping.
- Kartu kota memakai diorama 3D Monas, Gedung Sate, Tugu, Sura dan Baya, serta pura Denpasar. Lima kartu sejajar pada desktop besar, menjadi tiga/dua/satu kolom mengikuti lebar layar. Sel sprite selalu 108 × 180px (rasio 3:5) agar landmark tidak melebar mengikuti kartu. Warna underlay membedakan destinasi; hover/fokus memperjelas pilihan.
- Banner memenuhi lebar viewport tanpa sudut atau gutter; tinggi desktop mengikuti rasio 3.2:1 dengan batas 380–620px, mobile 400px. Saat data tersedia, setiap slide menampilkan event nyata dan seluruh permukaannya menjadi tautan ke detail event tersebut. Foto konser editorial hanya dipakai saat tidak ada data acara. Caption putih menjaga judul terbaca, panah berada di tengah sisi kiri/kanan, dan indikator halaman tetap di bawah.
- Screenshot LOKET dari pengguna menjadi referensi koreksi home: menu kategori lebar dan terpusat di bawah header utama, serta lima kartu kota dalam satu baris desktop. Bentuk kartu acara mengikuti koreksi Artatix terbaru di bawah. GoFest tetap memakai merek dan konten API sendiri.
- Design Read: ENERGY 2 / RHYTHM 2 / MOTION 1. Banner foto menjadi fokus utama, baris poster membantu pemilihan acara, dan landmark mengenali destinasi. Biru mengidentifikasi tindakan; ikon megafon/pin menjelaskan kelompok konten; panah menunjukkan navigasi. Motion hanya pergantian slide dan feedback hover/fokus dengan reduced-motion serta kontrol jeda.
- Kartu acara mengikuti referensi Artatix terbaru: bingkai biru muda dengan radius 24px dan padding 12px, poster lebar 5:2, panel informasi putih, judul maksimal dua baris, tanggal dengan ikon kalender, harga, lalu pemisah putus-putus dan logo/nama kreator. Tautan event dan kreator terpisah. Foto memakai object-fit: cover tanpa distorsi; logo memakai contain. Gratis, online, habis dan selesai mengikuti data API. Home, katalog dan profil kreator memakai komponen yang sama.
- Profil kreator memakai banner lebar 7:2 (maksimal tinggi 320px), logo bulat, nama, total event publik dan bulan/tahun bergabung. Tidak ada deskripsi atau label organizer tambahan. Tab Event Aktif memuat PUBLISHED yang belum berakhir; Event Lalu memuat COMPLETED serta PUBLISHED yang sudah berakhir. Total tidak menghitung draft/review/cancelled. Pagination 12 event per halaman. Logo dan banner dapat diunggah melalui pengaturan organisasi; jika banner belum ada, gunakan cover event publik terbaru atau permukaan biru muda kosong.
- Detail acara mengikuti susunan Artatix pada screenshot: kanvas putih, judul/kategori/penyelenggara dan tab informasi di kiri; poster proporsional, tanggal, jam, lokasi serta harga awal di kanan. CTA **Pesan Sekarang** langsung menuju `/checkout/:eventSlug`; tidak ada pemilihan kategori tiket di halaman detail. Mobile menumpuk informasi dan memakai CTA bawah.
- Checkout terpisah dari navigasi publik dan footer: header hanya logo asli Gofest dan bahasa. Bilah biru menunjukkan Pilih Kategori → Detail Pesanan → Metode Pembayaran → Pembayaran. Kategori/jumlah dipilih sebelum data pemesan; ringkasan kanan memakai harga dan promo dari server. Kembali antar tahap mempertahankan input. Pembayaran mengikuti provider yang tersedia tanpa logo/metode bank rekaan.
- Tahap data checkout menampilkan judul, jadwal dan lokasi acara. Panel biru muda mengelompokkan pemesan dan setiap pemegang tiket; formulir putih menjaga keterbacaan. Pilihan jenis kelamin berbentuk tombol radio, telepon memakai dropdown negara yang dapat dicari, dan usia menentukan pilihan dokumen. Konfirmasi kontak/jumlah/total muncul sebelum order dibuat.
- Akun dan workspace memakai kanvas slate, panel putih, tab bergaris, serta sidebar dengan indikator biru. Tabel dapat digulir dan difokuskan lewat keyboard.
- Motion: perpindahan halaman 240ms, pergantian banner horizontal 720ms dengan slide masuk dan keluar mengikuti arah navigasi, feedback kartu 200ms, dan panel mobile 200ms. Semua gerak mengikuti `prefers-reduced-motion`.
- Sesuai permintaan pengguna, carousel tidak menampilkan tombol stop/jeda. Rotasi 6.5 detik berhenti saat hover, fokus keyboard, tab browser tidak aktif atau reduced motion. Slide keluar memakai `inert` dan `aria-hidden` sehingga hanya banner aktif dapat diklik atau difokuskan.
- Klaim pembayaran dan keamanan harus mencerminkan integrasi yang tersedia. Jangan menampilkan logo bank/wallet yang belum terhubung.

Token utama: primary `#0052CC`, highlight `#2A73D6`, deep blue `#003D97`, teks navy `#111827`, putih `#FFFFFF`, border `#E8E6EF`, latar biru ringan `#F2F6FF`. Navy `#102447` tetap digunakan pada permukaan gelap yang sudah ada. DM Sans menjadi font antarmuka; wordmark tetap bagian PNG asli. Radius 8px untuk kontrol, 12px untuk kartu dan panel, 16px untuk banner.

## Brand identity terbaru

- Gunakan `apps/web/public/assets/gofest-logo.png`, salinan byte-identik dari PNG transparan pengguna. Jangan menggambar ulang ikon atau wordmark, menambahkan teks merek di samping gambar, atau memberi gambar background/border/shadow/glow/transform dekoratif.
- Komponen bersama `BrandLogo` menampilkan PNG dengan `object-fit: contain`, tinggi 44px desktop dan 36px mobile, width otomatis. `Logo` menambahkan tautan ke beranda; gambar tanpa tautan dipakai pada form akun, loading, error dan tiket cetak.
- Navbar/footer publik, form autentikasi, sidebar admin/organizer, navigasi workspace mobile, halaman akun melalui layout publik, loading, error, tiket digital dan email memakai identitas yang sama.
- Favicon ICO/PNG, Apple touch icon dan app icon 192/512 diambil dari piksel ikon G pada aset asli. Gradient asli dipertahankan; canvas ikon transparan.
- DM Sans variable di-host lokal, menggantikan Poppins tanpa kembali ke Manrope. Bukaan huruf yang jelas dan bentuk yang lebih netral mendukung pemindaian acara, form dan tabel tanpa kesan terlalu geometris. Bobot 400 untuk isi; 500 untuk navigasi, tombol, label, badge dan angka pendukung; 600 untuk heading dan harga utama. Bobot 700–900 tidak dipakai pada antarmuka. Wordmark tidak direkonstruksi dengan font tersebut.
- Maskot pendamping autentikasi adalah trio orisinal: berang-berang dengan headphone dan tiket, kelinci bertopi festival, serta penguin dengan tamborin. Aset transparan `public/assets/gofest-mascot-friends.png` terpisah dari logo; tidak menggantikan atau memodifikasi ikon G dan wordmark. Aset berang-berang pertama tetap disimpan. Latar biru muda mengikat ilustrasi dan form; satu panel putih mengelompokkan input tanpa dekorasi gerak tambahan.

Arah desain ini mengikat seluruh halaman Gofest. Mengadopsi standar komersial industri event ticketing Indonesia seperti **Artatix** dan **Loket.com**.

## 1. Design Philosophy

> Standar platform discovery & ticketing event modern: kanvas putih bersih, tipografi geometric sans-serif modern, kartu event dengan poster lebar, tanggal dan harga jelas, dan alur pemesanan sticky yang cepat dan responsif.

Gofest dirancang untuk kecepatan navigasi dan konversi pembelian tiket, dengan hierarki visual yang jelas, banner promosi heroik, dan interaksi yang solid tanpa elemen retro/kuno.

## 2. Prinsip Utama

1. **Clean & High Contrast Canvas**: Kanvas putih bersih (`#FFFFFF` dan `#F8FAFC`) dengan border halus (`#E2E8F0`) dan tipografi tajam (`#0F172A`).
2. **Poster Event Menjadi Pusat Perhatian**: Gambar cover kartu 5:2 dengan sudut membulat dan hover border/shadow ringan tanpa perpindahan posisi. Halaman detail mempertahankan rasio poster aslinya.
3. **Standar Komersial Loket / Artatix**:
   - Hero banner carousel dengan navigation dots & arrows untuk event unggulan / trending.
   - Category chips dengan ikon yang intuitif (Musik, Festival, Olahraga, Pameran, Workshop, Standup Comedy).
   - Event card dengan tanggal berikon kalender, harga terformat jelas, serta logo dan tautan kreator di footer.
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

- **Font Keluarga**: DM Sans variable yang di-host lokal (dan system-ui sans-serif fallback), termasuk italic asli untuk konten deskripsi.
- Tidak menggunakan font serif vintage/antik pada headline atau navigasi.
- **Heading**: DM Sans 600; ukuran dan jarak membangun hierarki, bukan bobot berlebihan. `tracking-tightest` dibatasi `-0.025em`.
- **Body**: DM Sans 400; label dan kontrol 500. Teks panjang tetap memakai line-height yang lapang.
- **Harga & Angka**: DM Sans 500–600 dengan `tabular-nums`.

## 5. Komponen Utama

### Header & Navigasi

- Sticky navbar putih dengan border bawah halus dan backdrop blur.
- Logo Gofest dari PNG transparan pengguna, tanpa badge tambahan atau rekonstruksi HTML.
- Search input cepat dengan shortcut kota.
- Tautan utama: Jadi Partner Kami, Masuk dan Daftar. Jelajah acara tersedia melalui pencarian/kategori; tiket dan pesanan tersedia melalui menu akun.
- Menu profil akun dengan dropdown responsif.

### Hero Banner Carousel

- Carousel banner lebar untuk event headline mingguan.
- Overlay gradient, date badge, judul tebal, venue, harga awal, dan tombol "Beli Tiket".
- Navigasi tombol panah kiri-kanan dan indicator dots.

### Event Cards (Artatix Grid)

- Bingkai biru muda 24px, poster 5:2 dengan rounded-xl, dan panel informasi putih.
- Badge status hanya jika online, gratis, habis atau selesai.
- Tanggal dengan CalendarDays biru; event beberapa hari menampilkan rentang tanggal.
- Judul dua baris `line-clamp-2`, harga semibold 600, dan separator putus-putus.
- Footer berisi avatar bulat dan nama kreator dengan tautan sendiri.
- Grid empat kolom desktop, dua tablet, satu pada ponsel sempit; tinggi kartu dalam baris sejajar.

### Event Detail

- Dua kolom putih: informasi/penyelenggara/deskripsi di kiri; poster, jadwal, lokasi, dan CTA pemesanan di kanan.
- Tab informasi: Deskripsi, Syarat & Ketentuan, Lokasi. Kategori tiket dipilih hanya di checkout.
- Ringkasan acara sticky di desktop dan CTA bawah di mobile.
- Checkout bertahap dengan kuota dan harga divalidasi oleh server.
