# PRD & Master Prompt — Platform Ticketing Event

> Dokumen ini adalah **master prompt** untuk AI coding agent / tim developer. Gunakan seluruh dokumen sebagai sumber requirement utama, bukan sebagai inspirasi bebas. Bangun aplikasi yang benar-benar berfungsi, bukan sekadar mockup atau landing page.

---

## 0. Instruksi Utama untuk AI Coding Agent

Anda bertindak sebagai **Product Engineer, Solution Architect, UI/UX Designer, dan Full-Stack Developer senior**. Tugas Anda adalah merancang dan membangun platform ticketing event multi-organizer yang siap dikembangkan menuju production.

### Tujuan utama

Bangun website ticketing event yang memungkinkan:

1. Pengunjung menemukan event, melihat detail, memilih tiket, melakukan checkout, dan menerima tiket digital dengan QR Code.
2. Organizer membuat serta mengelola event, mengatur kategori tiket dan kuota, memantau pesanan, dan mengelola check-in.
3. Petugas event memindai QR Code untuk memvalidasi tiket dan mencatat kehadiran.
4. Super Admin mengelola organizer, event, pengguna, transaksi, dan aktivitas platform.

### Aturan kerja yang wajib diikuti

- Baca seluruh PRD ini sebelum membuat struktur proyek atau menulis kode.
- Jangan berhenti setelah membuat desain frontend. Seluruh alur utama harus terhubung ke backend dan PostgreSQL.
- Jangan membuat tombol, menu, tautan, filter, tab, atau form yang hanya terlihat aktif. Setiap kontrol wajib memiliki aksi dan hasil yang nyata.
- Jangan membuat data, statistik, jumlah pengguna, ulasan, testimoni, logo partner, atau klaim keamanan palsu. Data demo harus diberi label jelas sebagai data demo.
- Validasi harga, kuota, diskon, status pesanan, hak akses, dan pembayaran di backend. Jangan mempercayai nilai dari browser.
- Gunakan transaksi database dan mekanisme idempotency untuk operasi yang dapat menghasilkan transaksi ganda.
- Jangan meng-hardcode secret, password, API key, atau credential ke source code.
- Jangan menggunakan Docker sebagai keharusan. Aplikasi harus dapat dijalankan secara lokal dengan instalasi Node.js dan PostgreSQL biasa.
- Dokumentasikan keputusan teknis yang belum ditentukan. Jangan diam-diam mengarang konfigurasi bisnis yang berdampak pada uang atau kebijakan pengguna.
- Jika ada informasi eksternal yang belum tersedia—misalnya payment gateway, SMTP, domain, atau identitas brand—buat adapter/configuration point yang jelas. Jangan mengklaim integrasi production sudah aktif.

### Anti-Slop wajib

Sebelum implementasi UI, pastikan skill Anti-Slop tersedia di project. Jika belum tersedia, jalankan dari root project:

```bash
npx skills add miqdadbadjuber/anti-slop --all
```

Gunakan skill inti dan modul yang relevan untuk pekerjaan ini, terutama:

- `antislop` — aturan inti dan Delivery Gate.
- `antislop-ui` — visual, komposisi layout, warna, komponen, dan motion.
- `antislop-layoutmobile` — responsive behavior dari mobile hingga desktop.
- `antislop-copywriting` — microcopy, headline, CTA, dan konten UI.
- `antislop-human` — aksesibilitas, kontras, keyboard, dan interaksi.
- `antislop-code` — komentar kode bila diperlukan.

Sumber resmi: <https://github.com/miqdadbadjuber/anti-slop>

Ikuti protokol mode `during` / `after` milik skill. Untuk pembangunan dari awal, mode `during` direkomendasikan agar aturan dipakai selama proses desain dan implementasi, bukan hanya setelah selesai. Jangan mengaku sudah menjalankan atau menginstal skill apabila proses instalasinya gagal; laporkan kendalanya dan tetap ikuti aturan yang dapat dibaca.

**Prinsip Anti-Slop yang harus terlihat dalam hasil:**

- Hindari blue-purple gradient generik, glow di semua elemen, glassmorphism berlebihan, dark mode hanya karena terlihat teknis, dan semua elemen berbentuk pill.
- Jangan mengulang pola section yang sama di seluruh halaman. Komposisi harus mengikuti kebutuhan konten.
- Jangan menggunakan bento grid sebagai jawaban default untuk semua bagian.
- Jangan menggunakan fake terminal, dekorasi grid/dot tanpa fungsi, status dot dekoratif, statistik palsu, atau testimoni rekaan.
- Gunakan animasi hanya jika menjelaskan perubahan state atau membantu orientasi. Hormati `prefers-reduced-motion`.
- Setiap halaman yang mengambil data harus mempunyai loading, empty, dan error state yang informatif serta memberi langkah berikutnya.
- Semua kontrol harus bisa digunakan dengan keyboard, memiliki focus state, accessible name, hover/active/disabled state, dan touch target yang nyaman.
- Uji seluruh interaksi dan seluruh rentang responsive sebelum menyatakan pekerjaan selesai.

---

## 1. Ringkasan Produk

### 1.1 Deskripsi

Produk berupa **platform ticketing event berbasis web** yang mendukung banyak organizer dan banyak event dalam satu platform. Pengunjung dapat menemukan event publik dan membeli tiket secara online. Organizer memiliki workspace untuk mengelola event dan penjualan. Admin platform memiliki kendali moderasi serta operasional.

### 1.2 Masalah yang ingin diselesaikan

- Informasi event dan pembelian tiket sering tersebar di beberapa kanal.
- Organizer membutuhkan satu tempat untuk membuat event, mengatur jenis tiket, kuota, penjualan, dan peserta.
- Proses validasi tiket di lokasi perlu cepat, tercatat, dan mencegah QR Code yang sama dipakai berulang kali.
- Pembeli membutuhkan proses checkout yang jelas, bukti pembayaran, serta tiket digital yang mudah ditemukan.

### 1.3 Sasaran produk

- Pembeli dapat menyelesaikan pembelian tanpa harus membuat akun terlebih dahulu.
- Organizer dapat mengelola event tanpa bantuan administrator untuk pekerjaan rutin.
- Setiap tiket mempunyai identitas unik dan status check-in yang dapat divalidasi di server.
- Data transaksi dan kuota konsisten meskipun terjadi beberapa checkout secara bersamaan.
- Antarmuka mudah digunakan melalui ponsel karena pembelian dan check-in berpotensi dilakukan di lapangan.

### 1.4 Asumsi awal

Gunakan asumsi berikut sampai pemilik produk memberikan keputusan berbeda:

- Target awal: pasar Indonesia.
- Bahasa UI utama: Bahasa Indonesia.
- Mata uang: IDR / Rupiah, tanpa angka desimal.
- Zona waktu default event: `Asia/Jakarta`; setiap event tetap menyimpan zona waktu yang dipilih.
- Format tanggal dan angka mengikuti locale Indonesia.
- Pembeli boleh checkout sebagai guest. Akun pembeli bersifat opsional.
- Platform mendukung event online dan offline, tetapi MVP tidak menyediakan streaming event.
- Jenis tiket MVP adalah general admission / tiket tanpa nomor kursi.
- Satu event dapat mempunyai beberapa kategori tiket, misalnya Regular, Presale, VIP, atau kategori lain yang dibuat organizer.
- Satu organizer dapat mempunyai beberapa event.
- Payment gateway belum ditentukan. Gunakan provider adapter dan mock provider hanya untuk development/testing.

---

## 2. Pengguna, Role, dan Hak Akses

### 2.1 Visitor / calon pembeli

Dapat:

- Melihat homepage dan daftar event publik.
- Mencari dan memfilter event.
- Melihat detail event dan ketersediaan tiket.
- Membuat pesanan sebagai guest.
- Memeriksa status pesanan melalui tautan aman / order access token.
- Melihat dan mengunduh tiket digital setelah pembayaran terkonfirmasi.

Tidak dapat:

- Mengakses dashboard organizer atau admin.
- Mengubah harga, kuota, atau status transaksi.
- Mengakses data pribadi pembeli lain.

### 2.2 Registered User / pembeli terdaftar

Mendapat semua kemampuan visitor, ditambah:

- Mengelola profil.
- Melihat riwayat pesanan miliknya.
- Mengakses tiket yang terhubung ke akun.
- Mengubah data profil yang diizinkan.

### 2.3 Organizer Owner

Dapat:

- Mengelola profil organisasi.
- Membuat, mengubah, menyimpan draft, mengajukan review, menerbitkan, dan membatalkan event sesuai kebijakan platform.
- Mengatur jadwal event, lokasi, deskripsi, poster, kategori tiket, kuota, harga, batas pembelian, serta periode penjualan.
- Membuat dan mengelola kode promo.
- Melihat order dan daftar peserta untuk event miliknya.
- Melihat ringkasan penjualan dan check-in.
- Mengunduh data peserta dalam CSV.
- Menambahkan petugas event dengan hak akses terbatas.

Tidak dapat:

- Mengakses event, transaksi, atau data organizer lain.
- Mengubah status pembayaran secara manual seolah-olah sudah dibayar.
- Mengakses Super Admin.

### 2.4 Event Staff / petugas check-in

Dapat:

- Melihat event yang ditugaskan kepadanya.
- Membuka halaman check-in event tersebut.
- Memindai QR atau memasukkan kode tiket secara manual.
- Melihat hasil validasi dan mencatat check-in.

Tidak dapat:

- Mengubah event, harga, kuota, atau data pembayaran.
- Mengunduh seluruh data pelanggan kecuali memang diberikan permission khusus.
- Melakukan check-in untuk event yang tidak ditugaskan kepadanya.

### 2.5 Super Admin

Dapat:

- Melihat ringkasan operasional platform.
- Mengelola pengguna dan organizer.
- Menyetujui, menolak, menangguhkan, atau mengaktifkan organizer.
- Memoderasi event sebelum publikasi apabila moderation workflow diaktifkan.
- Melihat dan mengelola transaksi untuk kebutuhan support.
- Mengelola kategori event, pengaturan platform, dan konfigurasi biaya.
- Melihat audit log.

Setiap aksi sensitif admin harus tercatat di audit log.

---

## 3. Ruang Lingkup dan Prioritas Fitur

### 3.1 MVP — wajib selesai

1. Authentication dan role-based access control.
2. Public homepage dan event discovery.
3. Pencarian serta filter event.
4. Event detail page.
5. Organizer registration/profile.
6. Organizer dashboard.
7. CRUD event dan ticket type.
8. Pengaturan kuota dan periode penjualan tiket.
9. Checkout guest dan pembuatan order.
10. Reservasi kuota sementara dengan batas waktu pembayaran.
11. Payment provider abstraction, mock provider untuk development, dan webhook handler.
12. Konfirmasi pembayaran dan penerbitan tiket.
13. Digital ticket dengan QR Code unik.
14. Riwayat order dan halaman status order.
15. QR check-in dan manual ticket-code lookup.
16. Admin panel dasar untuk organizer, event, user, dan transaksi.
17. Email notification adapter.
18. Audit log untuk aksi penting.
19. Responsive UI, validasi form, loading/empty/error state.
20. Automated tests untuk alur kritis.

### 3.2 Tahap berikutnya — jangan menghambat MVP

- Seat map dan pemilihan kursi.
- Waiting list untuk event sold out.
- Transfer tiket antar pengguna.
- Refund otomatis melalui payment gateway.
- Affiliate / referral code.
- Event berulang dan recurring schedule.
- Multi-currency.
- Multi-language.
- Native mobile app.
- Integrasi kalender.
- Scanner offline dengan sinkronisasi konflik.
- Membership, loyalty point, dan subscription organizer.

Jangan membangun fitur tahap berikutnya sebelum alur MVP stabil.

---

## 4. Arsitektur dan Teknologi

### 4.1 Struktur repository

Gunakan monorepo sederhana berbasis pnpm workspace:

```text
project-root/
├── apps/
│   ├── web/                 # Vite + React + Tailwind + shadcn/ui
│   └── api/                 # Express REST API + Prisma
├── packages/
│   └── shared/              # Zod schema, shared types, constants
├── docs/                    # ERD, API notes, setup/deployment notes
├── .env.example
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

Jika workspace menambah kompleksitas yang tidak perlu, struktur frontend/backend terpisah tetap boleh digunakan, tetapi kontrak API dan tipe data harus terdokumentasi.

### 4.2 Frontend

- Vite.
- React.
- TypeScript dengan strict mode.
- Tailwind CSS.
- shadcn/ui sebagai basis komponen, bukan sebagai desain final tanpa kustomisasi.
- React Router untuk routing.
- TanStack Query untuk server state, caching, dan invalidation.
- React Hook Form + Zod untuk form dan validasi.
- `lucide-react` untuk ikon.
- Library QR scanner yang terpelihara dan kompatibel dengan browser modern.
- Gunakan formatter IDR dan date utility yang konsisten.

Frontend wajib memisahkan public pages, buyer account, organizer workspace, staff check-in, dan admin workspace.

### 4.3 Backend

- Node.js LTS aktif saat implementasi.
- Express.js + TypeScript.
- Prisma ORM versi **4.x**, pin `prisma@4.16.2` dan `@prisma/client@4.16.2`.
- PostgreSQL sebagai database utama.
- Zod untuk validasi request dan environment.
- OpenAPI/Swagger untuk dokumentasi REST API.
- Logger terstruktur untuk request dan error.
- Worker/cron process untuk mengakhiri order yang kedaluwarsa dan melepaskan kuota.

**Penting untuk Prisma 4:** gunakan konfigurasi `DATABASE_URL` melalui `.env` dan `schema.prisma` dengan `datasource db`. Jangan menggunakan pola konfigurasi Prisma 7 seperti `prisma.config.ts` atau API konfigurasi Prisma 7.

### 4.4 Database dan integrasi

- PostgreSQL.
- Migration wajib dikelola menggunakan Prisma Migrate.
- Semua timestamp transaksi disimpan sebagai UTC (`timestamptz` pada PostgreSQL) dan dikonversi saat ditampilkan.
- Nominal Rupiah disimpan sebagai integer dalam satuan Rupiah penuh. Jangan menyimpan nominal uang sebagai floating point.
- File poster disimpan melalui storage adapter (local storage untuk development, object storage untuk production). Database hanya menyimpan metadata dan URL/key file.
- Email menggunakan SMTP/email-provider adapter. Development boleh menggunakan logger/mock email.
- Payment menggunakan provider adapter. Jangan pernah menyimpan nomor kartu atau CVV.

### 4.5 Konvensi kode

- Gunakan TypeScript strict mode di frontend dan backend.
- Pisahkan controller, service/use-case, repository/data-access bila diperlukan, middleware, schema, dan routes.
- Controller tidak boleh berisi seluruh business logic.
- Gunakan centralized error handler.
- Hindari `any`; jika terpaksa, beri alasan dan batasi area penggunaannya.
- Jangan menggandakan definisi enum atau schema yang dapat dibagikan.
- Gunakan environment variables dan validasi saat startup.
- Buat seed data khusus development dan beri label sebagai data demo.

---

## 5. Desain Produk dan Art Direction

### 5.1 Arah visual

Buat identitas visual dengan pendekatan **editorial event guide**: terasa seperti media kurasi event dan layanan ticketing yang serius, bukan template SaaS generik. Desain harus punya karakter, tipografi kuat, hierarki informasi jelas, serta poster event menjadi elemen visual utama.

Arah awal yang dapat dijadikan dasar `DESIGN.md`:

- **Canvas:** warm off-white / paper — `#F5F2EA`.
- **Primary ink:** charcoal hampir hitam — `#191B1A`.
- **Accent:** vermilion / burnt orange — `#D9573F`.
- **Secondary tone:** muted olive — `#65735D`.
- **Border:** warm gray — `#D9D4CA`.
- **Typography:** gunakan pasangan sans-serif yang tegas dan mudah dibaca untuk UI, dengan display serif editorial secara terbatas pada heading tertentu. Contoh awal: Manrope untuk UI dan Instrument Serif untuk aksen display. Pastikan font memiliki fallback lokal.
- **Surface:** dominan solid dan matte. Shadow hanya untuk elemen yang benar-benar elevated.
- **Radius:** gunakan skala radius yang terbatas dan konsisten; jangan membuat semua komponen berbentuk kapsul.
- **Theme awal:** light theme yang matang. Dark theme tidak wajib untuk MVP.

Palet di atas adalah arah awal, bukan alasan untuk menerapkan warna secara membabi buta. Buat `DESIGN.md` yang menjelaskan peran warna, type scale, spacing, radius, elevation, motion, dan contoh penerapan pada halaman utama.

### 5.2 Prinsip layout

- Hindari hero template dengan headline generik, gradient besar, dan dua tombol tanpa konteks.
- Homepage harus membantu orang menemukan event. Prioritaskan search, tanggal, kota, kategori, dan event yang benar-benar tersedia.
- Tampilkan event menggunakan poster/cover dengan rasio gambar yang konsisten. Variasikan komposisi secara terukur; jangan membungkus semua informasi dalam kumpulan kartu yang sama.
- Event detail harus memprioritaskan informasi keputusan pembelian: nama event, waktu, venue, penyelenggara, ketersediaan tiket, harga, dan aturan penting.
- Dashboard organizer harus berorientasi pada pekerjaan: status event, penjualan, sisa kuota, pesanan terbaru, dan check-in. Jangan menambahkan chart hanya untuk dekorasi.
- Form pembuatan event sebaiknya berupa alur bertahap atau section yang logis, dengan draft/save state yang jelas.
- Admin panel lebih utilitarian, padat informasi, dan efisien. Jangan menyalin persis tampilan homepage ke dashboard.
- Jangan menggunakan data palsu untuk membuat tampilan terlihat penuh.

### 5.3 Responsive behavior

Rancang ulang komposisi untuk mobile, tablet, laptop, dan desktop. Jangan sekadar mengecilkan layout desktop.

- Mobile: pencarian dan filter mudah dijangkau, event list satu kolom atau layout poster horizontal bila sesuai, checkout satu kolom, CTA pembelian mudah ditemukan, dan navigasi tidak memakan ruang.
- Tablet: gunakan layout dua kolom hanya jika ruang cukup; sidebar dashboard dapat berubah menjadi drawer atau navigasi ringkas.
- Desktop: gunakan ruang horizontal untuk detail event, tabel, dan panel pembelian tanpa membuat baris terlalu lebar.
- Tidak boleh ada horizontal overflow pada viewport sempit.
- Target interaksi sentuh minimal sekitar 44×44 px.
- Sticky purchase bar di mobile tidak boleh menutupi konten atau form.
- Seluruh menu hover harus mempunyai padanan tap.

### 5.4 Motion dan feedback

- Gunakan transisi singkat untuk hover, focus, drawer, dialog, tab, dan perubahan status.
- Jangan gunakan infinite floating, pulsing, atau animasi dekoratif yang terus berjalan.
- Berikan feedback saat form disubmit, kuota berubah, pembayaran berhasil/gagal, dan QR scan diproses.
- Sediakan reduced-motion behavior.

### 5.5 Copywriting

Gunakan Bahasa Indonesia yang ringkas, natural, spesifik, dan membantu pengguna mengambil keputusan.

Hindari frasa kosong seperti “Unlock pengalaman terbaik”, “revolusioner”, “seamless”, “next level”, “masa depan event”, dan klaim tanpa bukti. Jangan menggunakan lorem ipsum untuk halaman yang dianggap selesai. Jika data belum ada, gunakan placeholder yang jujur dan jelas.

---

## 6. Sitemap dan Halaman

### 6.1 Public website

| Route                  | Halaman                | Isi utama                                                                                        |
| ---------------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| `/`                    | Homepage               | Hero pencarian, event pilihan yang benar-benar tersedia, kategori, event terdekat, CTA organizer |
| `/events`              | Event discovery        | Search, filter tanggal/kota/kategori, sorting, pagination                                        |
| `/events/:slug`        | Event detail           | Poster, deskripsi, tanggal, lokasi/tautan online, organizer, jenis tiket, aturan, CTA beli       |
| `/organizers/:slug`    | Organizer profile      | Profil organizer dan daftar event publiknya                                                      |
| `/checkout/:eventSlug` | Checkout               | Pilih jumlah tiket, data pembeli, kode promo, ringkasan biaya, syarat pembelian                  |
| `/order/:orderCode`    | Order status           | Status order, instruksi pembayaran, countdown bila pending, detail tiket bila paid               |
| `/ticket/:ticketCode`  | Digital ticket         | Informasi pemegang tiket, event, QR Code, kode tiket, status                                     |
| `/login`               | Login                  | Form login                                                                                       |
| `/register`            | Register               | Form pendaftaran pembeli                                                                         |
| `/forgot-password`     | Reset password request | Form email                                                                                       |
| `/reset-password`      | Reset password         | Form password baru dengan token valid                                                            |
| `/terms`               | Terms                  | Syarat layanan                                                                                   |
| `/privacy`             | Privacy                | Kebijakan privasi                                                                                |

### 6.2 Buyer account

| Route                 | Halaman          | Isi utama                                          |
| --------------------- | ---------------- | -------------------------------------------------- |
| `/account`            | Account overview | Profil singkat dan pesanan terbaru                 |
| `/account/orders`     | My orders        | Riwayat order, status, filter                      |
| `/account/orders/:id` | Order detail     | Detail transaksi dan tiket                         |
| `/account/profile`    | Profile          | Ubah nama, email/phone sesuai kebijakan verifikasi |

### 6.3 Organizer workspace

| Route                            | Halaman               | Isi utama                                                 |
| -------------------------------- | --------------------- | --------------------------------------------------------- |
| `/organizer`                     | Overview              | Ringkasan penjualan, event aktif, order terbaru, check-in |
| `/organizer/events`              | Event list            | Daftar event, status, pencarian, filter                   |
| `/organizer/events/new`          | Create event          | Form pembuatan event                                      |
| `/organizer/events/:id/edit`     | Edit event            | Ubah informasi event                                      |
| `/organizer/events/:id/tickets`  | Ticket management     | Jenis tiket, harga, kuota, masa penjualan                 |
| `/organizer/events/:id/coupons`  | Coupons               | Kode diskon dan batas penggunaan                          |
| `/organizer/events/:id/orders`   | Orders                | Daftar order dan detail peserta                           |
| `/organizer/events/:id/check-in` | Check-in              | Scan QR, manual lookup, ringkasan kehadiran               |
| `/organizer/events/:id/staff`    | Staff                 | Kelola petugas dan akses event                            |
| `/organizer/settings`            | Organization settings | Profil organizer dan pengaturan dasar                     |

### 6.4 Event staff

| Route                        | Halaman         | Isi utama                                                |
| ---------------------------- | --------------- | -------------------------------------------------------- |
| `/staff/events`              | Assigned events | Event yang ditugaskan                                    |
| `/staff/events/:id/check-in` | Scanner         | QR scanner, input manual, hasil validasi, statistik sesi |

### 6.5 Super Admin

| Route               | Halaman    | Isi utama                                          |
| ------------------- | ---------- | -------------------------------------------------- |
| `/admin`            | Overview   | Ringkasan aktivitas platform dari database         |
| `/admin/users`      | Users      | Pencarian dan pengelolaan akun                     |
| `/admin/organizers` | Organizers | Review, approval, suspend, detail                  |
| `/admin/events`     | Events     | Moderasi dan status publikasi                      |
| `/admin/orders`     | Orders     | Pencarian transaksi dan status pembayaran          |
| `/admin/categories` | Categories | Kelola kategori event                              |
| `/admin/settings`   | Settings   | Konfigurasi platform yang memang diimplementasikan |
| `/admin/audit-logs` | Audit logs | Riwayat aksi sensitif                              |

Semua route terlindungi harus memeriksa sesi dan permission di backend. Menyembunyikan menu di frontend tidak cukup sebagai kontrol akses.

---

## 7. Detail Functional Requirements

### 7.1 Authentication dan account

- Register menggunakan nama, email, nomor WhatsApp/telepon opsional, dan password.
- Email harus unik dan dinormalisasi ke lowercase.
- Password disimpan menggunakan hash Argon2id atau algoritma password hashing modern yang sesuai.
- Login, logout, refresh session, forgot password, dan reset password.
- Token reset harus acak, sekali pakai, memiliki masa berlaku, dan disimpan dalam bentuk hash.
- Implementasikan rate limit untuk login, register, dan reset password.
- Gunakan cookie `HttpOnly`, `Secure` pada production, dan konfigurasi `SameSite` yang sesuai. Jika menggunakan cookie auth, implementasikan perlindungan CSRF sesuai pola yang dipilih.
- Refresh token harus dapat dicabut dan dirotasi; jangan menyimpan token permanen dalam `localStorage`.
- Role dan permission diverifikasi oleh backend pada setiap protected route.

### 7.2 Public event discovery

- Hanya event dengan status `PUBLISHED` dan masih memenuhi aturan visibility yang boleh muncul di publik.
- Search mencakup judul, nama organizer, kota, dan kategori.
- Filter minimal: kategori, kota, rentang tanggal, gratis/berbayar, dan status ketersediaan tiket.
- Sorting minimal: tanggal terdekat dan terbaru dipublikasikan.
- Pagination server-side.
- URL filter harus dapat dibagikan dan tetap bekerja saat halaman di-refresh.
- Event sold out tetap dapat tampil dengan status sold out, tetapi tombol pembelian dinonaktifkan dengan penjelasan yang jelas.

### 7.3 Event management

Satu event minimal memiliki:

- Judul dan slug unik.
- Ringkasan singkat dan deskripsi lengkap.
- Kategori.
- Cover/poster image.
- Tipe event: `ONLINE` atau `OFFLINE`.
- Untuk offline: venue name, alamat, kota, dan informasi akses.
- Untuk online: platform/link akses yang tidak ditampilkan publik sebelum kondisi yang ditentukan organizer.
- Start date/time dan end date/time.
- Sales start/end jika berlaku.
- Organizer owner.
- Status event.
- Aturan pembelian dan catatan peserta.

Validasi:

- End time tidak boleh lebih awal dari start time.
- Slug tidak boleh bentrok.
- Event draft tidak boleh muncul di publik.
- Perubahan event yang sudah terjual tiket harus mempertahankan snapshot order/ticket sebelumnya dan dicatat.
- Pembatalan event harus menghasilkan status yang jelas dan memicu pemberitahuan serta proses penanganan order sesuai kebijakan platform.

### 7.4 Ticket type dan inventory

Setiap event dapat memiliki beberapa ticket type dengan field:

- Nama tiket.
- Deskripsi.
- Harga Rupiah.
- Kuota total.
- Kuota terjual.
- Kuota yang sedang direservasi.
- Waktu mulai dan berakhirnya penjualan.
- Minimal/maksimal jumlah per order.
- Status aktif/nonaktif.

Aturan inventory:

- `available = quotaTotal - quantitySold - quantityReserved`.
- Kuota tidak boleh negatif.
- Harga yang digunakan untuk order selalu diambil dari database server.
- Checkout harus membuat temporary reservation dengan expiry, misalnya 15 menit (configurable).
- Reservation harus dibuat secara atomic agar dua pembeli tidak berhasil membeli kuota terakhir secara bersamaan.
- Gunakan transaction dan conditional update / locking yang sesuai. Jangan hanya membaca kuota lalu meng-update tanpa proteksi concurrency.
- Worker harus melepaskan reservation yang kedaluwarsa secara idempotent.
- Jika organizer menurunkan kuota di bawah jumlah terjual + reserved, tolak perubahan dan tampilkan alasannya.

### 7.5 Coupon / promo

Mendukung:

- Kode promo unik per event.
- Diskon persentase atau nominal tetap.
- Masa berlaku.
- Minimum pembelian.
- Maksimum diskon untuk tipe persentase.
- Batas total penggunaan.
- Batas penggunaan per order/user bila diaktifkan.
- Status aktif/nonaktif.

Validasi kupon selalu dilakukan di backend. Jangan mempercayai nilai potongan harga yang dihitung frontend. Kuota penggunaan kupon harus konsisten ketika beberapa checkout berlangsung bersamaan.

### 7.6 Checkout dan order

Alur utama:

1. Pembeli memilih ticket type dan quantity.
2. Pembeli mengisi nama, email, dan nomor telepon.
3. Server memeriksa status event, periode penjualan, ticket availability, batas pembelian, dan coupon.
4. Server menghitung seluruh nominal dari data database.
5. Server membuat order dengan status `PENDING_PAYMENT` dan reservation expiry.
6. Pembeli diarahkan ke instruksi / halaman pembayaran dari payment provider.
7. Server menerima webhook, memverifikasi signature, memeriksa amount dan reference, lalu memperbarui pembayaran.
8. Jika pembayaran sah, server mengubah order menjadi `PAID`, mengubah reserved quantity menjadi sold quantity, dan menerbitkan tiket.
9. Pembeli melihat order success dan menerima email konfirmasi.

Ketentuan:

- Tampilkan subtotal, diskon, biaya platform/provider (jika ada), dan total akhir sebelum pembeli mengonfirmasi.
- Semua fee harus dapat dikonfigurasi dan tidak boleh muncul tersembunyi setelah checkout.
- Order menyimpan snapshot nama tiket, harga satuan, quantity, dan nilai transaksi pada saat pembelian.
- Gunakan order code yang sulit ditebak.
- Akses guest order harus memakai token akses yang aman; jangan mengandalkan order code saja untuk membuka data pribadi.
- Jangan membuat tiket hanya berdasarkan redirect sukses dari browser. Pembayaran harus diverifikasi dari webhook/provider API.
- Webhook harus idempotent. Event webhook yang sama tidak boleh membuat tiket atau menambah penjualan dua kali.
- Simpan payment reference dan status provider.
- Jika pembayaran datang setelah reservation kedaluwarsa, jangan otomatis oversell. Tandai untuk rekonsiliasi / `PAYMENT_REVIEW` dan sediakan penanganan admin.
- Mock payment provider hanya untuk development. Production harus menolak startup payment mode mock atau menampilkan warning/blocker yang eksplisit.

### 7.7 Payment provider abstraction

Buat interface kurang lebih seperti berikut:

```ts
interface PaymentProvider {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyWebhook(input: VerifyWebhookInput): Promise<VerifiedPaymentEvent>;
  getPaymentStatus(reference: string): Promise<PaymentStatusResult>;
  refund?(input: RefundInput): Promise<RefundResult>;
}
```

Implementasi:

- `MockPaymentProvider` untuk local/dev/test.
- Provider production ditambahkan setelah pemilik produk menetapkan gateway.
- Credential provider hanya berada di environment server.
- Validasi signature, nominal, mata uang, order reference, dan status akhir pembayaran.
- Catat raw webhook payload secara aman dengan menghapus/masking data sensitif yang tidak diperlukan.
- Sediakan mekanisme replay/retry yang aman untuk webhook gagal.

### 7.8 Digital ticket dan QR Code

Setiap tiket yang diterbitkan minimal mempunyai:

- Ticket code unik yang dapat dibaca manusia.
- QR token acak dan tidak berisi PII.
- Event reference.
- Ticket type snapshot.
- Holder name/email.
- Status tiket.
- Waktu penerbitan dan check-in.

Ketentuan keamanan:

- QR tidak boleh hanya berisi `ticketId` berurutan atau data pribadi.
- Simpan hash token QR di database; token mentah hanya diberikan kepada pemegang tiket.
- QR harus dapat diregenerasi dengan mencabut token lama.
- Halaman tiket hanya dapat dibuka dengan autentikasi atau access token yang aman.
- QR yang sudah digunakan tidak boleh digunakan lagi untuk check-in kedua.
- Tiket cancelled/refunded/invalid tidak boleh lolos scanner.
- Sediakan halaman tiket yang nyaman dibuka dari ponsel dan dapat dicetak / disimpan sebagai PDF.

### 7.9 Check-in

- Petugas memilih event yang ditugaskan.
- Browser meminta izin kamera dengan penjelasan yang jelas.
- Petugas dapat scan QR atau memasukkan ticket code secara manual.
- Server memvalidasi tiket dan melakukan check-in secara atomic.
- Hasil scan memiliki state yang jelas:
  - `VALID — CHECKED IN`: tiket berhasil digunakan.
  - `ALREADY USED`: tiket pernah check-in, tampilkan waktu check-in.
  - `INVALID`: token/kode tidak ditemukan atau tidak sah.
  - `CANCELLED / REFUNDED`: tiket tidak berlaku.
  - `WRONG EVENT`: tiket bukan untuk event yang sedang dibuka.
- Catat staff, waktu, event, gate opsional, dan hasil scan.
- Hindari dua perangkat melakukan check-in pada tiket yang sama secara bersamaan.
- Jangan mengandalkan validasi di browser. Semua keputusan akhir dilakukan backend.
- Berikan feedback visual dan suara singkat opsional; suara harus dapat dimatikan.

### 7.10 Organizer dashboard

Dashboard menampilkan data aktual:

- Event aktif dan draft.
- Total order dan total tiket terjual.
- Gross sales / nilai transaksi sesuai definisi yang jelas.
- Sisa kuota per event.
- Check-in count dan persentase kehadiran.
- Pesanan terbaru.
- Periode filter yang jelas.

Jangan membuat chart jika jumlah data tidak cukup. Empty state harus menjelaskan cara membuat event pertama atau cara mendapatkan data.

### 7.11 Admin dan audit

- Admin dapat mencari berdasarkan nama, email, event title, order code, dan payment reference.
- Moderasi event dan organizer harus mempunyai alasan status.
- Aksi sensitif wajib tercatat: actor, action, resource type/id, timestamp, IP/request context bila tersedia, dan metadata perubahan tanpa menyimpan secret.
- Admin tidak boleh mengubah pembayaran menjadi paid tanpa bukti provider atau prosedur rekonsiliasi yang tercatat.
- Data pelanggan hanya ditampilkan kepada role yang memerlukan.

### 7.12 Notifikasi

Notifikasi minimum:

- Order dibuat.
- Pembayaran berhasil.
- Tiket diterbitkan.
- Event dibatalkan atau mengalami perubahan penting.
- Reset password.

Gunakan template email yang ringkas dan informatif. Simpan status pengiriman bila provider mendukung. Kegagalan email tidak boleh mengubah pembayaran yang sudah sah menjadi gagal.

---

## 8. Database Design — Entitas Minimum

Gunakan Prisma schema dengan relasi, enum, index, unique constraint, dan delete behavior yang sesuai. Nama field boleh disesuaikan, tetapi kebutuhan data berikut harus tercakup.

| Entitas              | Field / kebutuhan penting                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `User`               | id, name, email unique, phone nullable, passwordHash, status, emailVerifiedAt, createdAt, updatedAt                                                                |
| `OrganizerProfile`   | id, userId, organizationName, slug unique, description, logoKey, status, review metadata                                                                           |
| `Event`              | id, organizerId, title, slug unique, summary, description, categoryId, coverKey, type, venue fields, startsAt, endsAt, timezone, sales window, status, publishedAt |
| `EventStaff`         | id, eventId, userId, role, assignedAt, unique event/user                                                                                                           |
| `TicketType`         | id, eventId, name, description, price, quotaTotal, quantitySold, quantityReserved, sales window, min/max per order, isActive                                       |
| `Coupon`             | id, eventId, code, discountType, discountValue, maxDiscount, minimumPurchase, maxRedemptions, redeemedCount, validity, isActive                                    |
| `Order`              | id, orderCode unique, accessTokenHash, userId nullable, eventId, buyer fields, subtotal, discount, fees, total, currency, status, expiresAt, paidAt                |
| `OrderItem`          | id, orderId, ticketTypeId, snapshot name, unitPrice, quantity, lineTotal                                                                                           |
| `Payment`            | id, orderId, provider, providerReference, method, amount, status, rawPayload metadata, paidAt, expiresAt, idempotency/reference constraints                        |
| `Ticket`             | id, orderItemId, eventId, ticketTypeId, ticketCode unique, qrTokenHash unique, holder fields, status, issuedAt, checkedInAt, checkedInBy                           |
| `CheckInLog`         | id, ticketId nullable, eventId, staffId, scannedAt, result, gate, requestId/idempotency key                                                                        |
| `EventCategory`      | id, name, slug unique, description, isActive                                                                                                                       |
| `AuditLog`           | id, actorUserId, action, resourceType, resourceId, metadata JSON, createdAt                                                                                        |
| `PasswordResetToken` | id, userId, tokenHash unique, expiresAt, usedAt                                                                                                                    |
| `RefreshSession`     | id, userId, tokenHash unique, expiresAt, revokedAt, createdAt                                                                                                      |

### 8.1 Database constraints dan indexing

- Unique: user email, event slug, organizer slug, event category slug, order code, ticket code, QR token hash, provider reference sesuai cakupan provider.
- Index: event status + start date, organizerId + status, order eventId + status + createdAt, order buyer email, payment provider reference, ticket eventId + status, ticket code, check-in eventId + scannedAt.
- Pastikan setiap tabel transaksi mempunyai relasi dan foreign key yang benar.
- Jangan menghapus event/order/ticket yang sudah mempunyai transaksi. Gunakan status/soft delete atau aturan archival yang aman.
- Tambahkan database check constraint untuk nilai yang harus positif/non-negatif bila diperlukan. Jika Prisma tidak merepresentasikan constraint tertentu secara langsung, kelola melalui migration SQL dan dokumentasikan.

### 8.2 Status enum yang disarankan

**UserStatus:** `ACTIVE`, `PENDING_VERIFICATION`, `SUSPENDED`, `DELETED`

**OrganizerStatus:** `PENDING`, `ACTIVE`, `REJECTED`, `SUSPENDED`

**EventStatus:** `DRAFT`, `PENDING_REVIEW`, `PUBLISHED`, `REJECTED`, `CANCELLED`, `COMPLETED`

**EventType:** `ONLINE`, `OFFLINE`

**OrderStatus:** `PENDING_PAYMENT`, `PAID`, `EXPIRED`, `CANCELLED`, `PAYMENT_REVIEW`, `REFUND_PENDING`, `REFUNDED`, `PARTIALLY_REFUNDED`

**PaymentStatus:** `PENDING`, `PAID`, `FAILED`, `EXPIRED`, `REFUND_PENDING`, `REFUNDED`, `UNKNOWN`

**TicketStatus:** `VALID`, `CHECKED_IN`, `CANCELLED`, `REFUNDED`

**DiscountType:** `PERCENTAGE`, `FIXED_AMOUNT`

Sesuaikan enum jika provider atau kebijakan refund mengharuskannya. Jangan membuat status yang tidak memiliki transition logic.

---

## 9. API Design

Gunakan REST API dengan prefix `/api/v1`. Semua response memakai bentuk konsisten, misalnya:

```json
{
  "success": true,
  "data": {},
  "meta": null,
  "error": null
}
```

Error response harus memiliki kode yang stabil, pesan yang aman untuk pengguna, dan validation details jika relevan. Jangan mengirim stack trace ke client production.

### 9.1 Public dan authentication

| Method | Endpoint                     | Fungsi                           |
| ------ | ---------------------------- | -------------------------------- |
| `POST` | `/auth/register`             | Membuat akun                     |
| `POST` | `/auth/login`                | Login                            |
| `POST` | `/auth/logout`               | Logout/revoke session            |
| `POST` | `/auth/refresh`              | Rotasi refresh session           |
| `GET`  | `/auth/me`                   | Profil dan permission saat ini   |
| `POST` | `/auth/forgot-password`      | Meminta reset password           |
| `POST` | `/auth/reset-password`       | Mengganti password dengan token  |
| `GET`  | `/events`                    | Search, filter, sort, pagination |
| `GET`  | `/events/:slug`              | Detail event publik              |
| `GET`  | `/events/:slug/ticket-types` | Tiket yang dapat dijual          |
| `GET`  | `/organizers/:slug`          | Profil organizer publik          |

### 9.2 Checkout dan order

| Method | Endpoint                       | Fungsi                                      |
| ------ | ------------------------------ | ------------------------------------------- |
| `POST` | `/orders`                      | Membuat order dan reserve kuota             |
| `GET`  | `/orders/:orderCode/status`    | Status order dengan authorization token     |
| `GET`  | `/orders/:orderCode/tickets`   | Daftar tiket milik order setelah authorized |
| `POST` | `/orders/:orderCode/payment`   | Membuat payment session / payment intent    |
| `POST` | `/webhooks/payments/:provider` | Webhook provider                            |
| `GET`  | `/account/orders`              | Riwayat order akun aktif                    |

### 9.3 Organizer

| Method             | Endpoint                                 | Fungsi                                    |
| ------------------ | ---------------------------------------- | ----------------------------------------- |
| `GET`              | `/organizer/dashboard`                   | Ringkasan data organizer                  |
| `GET/POST`         | `/organizer/events`                      | List dan create event                     |
| `GET/PATCH/DELETE` | `/organizer/events/:id`                  | Detail/update/archive event sesuai aturan |
| `POST`             | `/organizer/events/:id/submit`           | Mengajukan review/publikasi               |
| `GET/POST`         | `/organizer/events/:id/ticket-types`     | List/create ticket type                   |
| `PATCH/DELETE`     | `/organizer/ticket-types/:id`            | Update/nonaktifkan ticket type            |
| `GET/POST`         | `/organizer/events/:id/coupons`          | List/create coupon                        |
| `GET`              | `/organizer/events/:id/orders`           | List order event                          |
| `GET`              | `/organizer/events/:id/attendees/export` | Export CSV                                |
| `GET/POST/DELETE`  | `/organizer/events/:id/staff`            | Kelola petugas                            |
| `GET`              | `/organizer/events/:id/check-in/summary` | Ringkasan check-in                        |

### 9.4 Staff check-in

| Method | Endpoint                            | Fungsi                                 |
| ------ | ----------------------------------- | -------------------------------------- |
| `GET`  | `/staff/events`                     | Event yang ditugaskan                  |
| `POST` | `/check-in/scan`                    | Validasi dan check-in QR / ticket code |
| `GET`  | `/check-in/events/:eventId/summary` | Ringkasan kehadiran                    |

### 9.5 Admin

Sediakan endpoint terlindungi untuk user, organizer, event moderation, order lookup, kategori, konfigurasi, dan audit log. Terapkan permission per aksi, bukan hanya satu middleware `isAdmin` untuk seluruh aktivitas bila granular permission diperlukan.

### 9.6 API requirements

- Pagination dan sorting server-side untuk tabel besar.
- Filter input divalidasi menggunakan Zod.
- Rate limit pada authentication, checkout, dan check-in endpoint.
- CORS hanya mengizinkan origin yang dikonfigurasi.
- Gunakan `helmet` atau konfigurasi security headers yang setara.
- Batasi ukuran request body dan upload file.
- Gunakan idempotency key untuk create order/payment dan endpoint check-in yang sesuai.
- Dokumentasikan status HTTP, error code, payload, dan auth requirement di OpenAPI.

---

## 10. Security, Privacy, dan Reliability

Wajib implementasikan:

- Password hashing yang kuat.
- Session/refresh token yang dapat dicabut dan dirotasi.
- RBAC dan ownership check di server.
- Input validation dan output sanitization sesuai konteks.
- Proteksi SQL injection melalui Prisma parameterized queries; raw SQL hanya boleh parameterized.
- XSS prevention; sanitasi rich text event description sebelum dirender.
- CSRF protection jika memakai cookie-based auth.
- Rate limiting untuk endpoint sensitif.
- Secure headers dan CORS allowlist.
- Validasi MIME type, ukuran, dan ekstensi file upload; jangan percaya nama file dari client.
- Secret management melalui environment variables.
- Redaksi token, password, dan data sensitif di logs.
- Audit trail untuk perubahan sensitif.
- Backup PostgreSQL terjadwal dan prosedur restore yang didokumentasikan sebelum production.
- Health endpoint untuk API dan worker.
- Webhook signature verification dan idempotency.
- Transactional inventory management agar kuota tidak oversold.
- Error monitoring/logging yang tidak membocorkan PII.

Jangan menulis klaim “aman”, “anti fraud”, “99.9% uptime”, atau klaim compliance di halaman marketing tanpa audit dan bukti yang nyata.

---

## 11. Non-Functional Requirements

| Area            | Target implementasi                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| Responsive      | Berfungsi pada mobile kecil, mobile besar, tablet, laptop, dan desktop tanpa horizontal overflow      |
| Accessibility   | Semantic HTML, label form, keyboard navigation, visible focus, contrast memadai, reduced motion       |
| Performance     | Lazy-load media di bawah fold, ukuran gambar sesuai kebutuhan, pagination, hindari request duplikat   |
| Reliability     | Payment webhook idempotent, inventory atomic, expired reservation cleanup, graceful error handling    |
| Maintainability | TypeScript strict, modular backend, shared validation, lint/format, README dan docs                   |
| Localization    | Bahasa Indonesia, IDR formatter, timezone-aware date/time                                             |
| Observability   | Structured logs, health check, error IDs, audit log                                                   |
| SEO             | Title/description unik, Open Graph image, canonical URL untuk event publik, sitemap dan robots policy |

Jangan mencantumkan angka performa yang belum diukur. Jalankan Lighthouse atau alat setara ketika aplikasi dapat diakses, lalu laporkan hasil pengukuran sesungguhnya.

---

## 12. Testing Strategy dan Acceptance Criteria

### 12.1 Automated tests

Gunakan unit, integration, dan end-to-end tests sesuai kebutuhan.

Minimal test cases:

1. User dapat register dan login dengan credential valid.
2. Password salah tidak menghasilkan sesi.
3. User biasa tidak dapat membuka route organizer/admin.
4. Organizer tidak dapat membaca atau mengubah event organizer lain.
5. Draft event tidak muncul di public event list.
6. Event published dengan tiket aktif muncul di public discovery.
7. Checkout menolak event yang belum dibuka atau sudah ditutup.
8. Checkout menolak kuota yang tidak cukup.
9. Dua checkout paralel untuk kuota terakhir tidak boleh sama-sama berhasil.
10. Coupon invalid/expired/limit reached ditolak.
11. Nominal yang diubah melalui browser tidak memengaruhi total server.
12. Webhook valid memperbarui payment dan order tepat satu kali.
13. Webhook duplikat tidak membuat ticket tambahan.
14. Webhook dengan signature atau amount salah ditolak.
15. Order expired melepaskan reserved quota tepat satu kali.
16. Pembayaran terlambat tidak menyebabkan oversell.
17. Tiket berhasil diterbitkan hanya setelah pembayaran sah.
18. QR valid dapat check-in satu kali.
19. QR yang sama pada scan kedua menghasilkan `ALREADY USED`.
20. Tiket cancelled/refunded/wrong-event ditolak.
21. Staff tidak dapat check-in event yang bukan tugasnya.
22. Organizer dapat export attendee event miliknya saja.
23. Audit log tercipta untuk aksi admin penting.
24. Empty/loading/error states muncul saat kondisi terkait terjadi.

### 12.2 Acceptance criteria UI

- Semua route di sitemap memiliki halaman nyata atau secara eksplisit ditandai belum termasuk scope.
- Semua tombol dan link memiliki destination/behavior yang valid.
- Form menunjukkan validasi client dan server, loading saat submit, serta hasil berhasil/gagal.
- Dialog, dropdown, drawer, tabs, filter, pagination, dan mobile navigation berfungsi.
- Tidak ada placeholder link `#` untuk navigasi yang seharusnya berjalan.
- Tidak ada fake testimonial, angka statistik, avatar, atau logo yang terlihat seperti data nyata.
- Semua halaman data memiliki loading, empty, dan error state.
- Semua gambar memiliki ukuran/aspect ratio yang ditetapkan agar layout tidak bergeser.
- Tidak ada horizontal scroll yang tidak disengaja.
- Keyboard focus terlihat dan seluruh action utama bisa dioperasikan dengan keyboard.
- QR scanner menjelaskan permission kamera dan menyediakan manual fallback.

### 12.3 Anti-Slop Delivery Gate

Sebelum menyerahkan pekerjaan:

1. Jalankan lint, typecheck, unit test, integration test, dan production build.
2. Jalankan frontend dan backend dengan database yang benar-benar aktif.
3. Periksa browser console dan server log.
4. Klik dan uji setiap tombol, link, dropdown, form, modal, tab, toggle, dan navigasi satu per satu.
5. Uji semua tema yang dikirim (MVP cukup light theme bila itu satu-satunya tema).
6. Uji mobile, tablet, dan desktop pada lebar di antara breakpoint, bukan hanya satu ukuran ponsel dan satu ukuran desktop.
7. Lakukan smoke test alur: register/login → create event → publish → checkout → mock payment → issue ticket → scan QR → duplicate scan rejected.
8. Catat hasil click-through per elemen atau per alur dengan status PASS/FAIL dan bukti singkat.
9. Jangan menyebut pekerjaan selesai jika ada fitur utama yang sekadar mockup atau test yang gagal tanpa disclosure.

---

## 13. Development Setup dan Environment

Buat `.env.example` tanpa nilai secret asli. Minimal:

```env
NODE_ENV=development
PORT=4000
WEB_URL=http://localhost:5173
API_URL=http://localhost:4000
DATABASE_URL=postgresql://postgres:password@localhost:5432/event_ticketing?schema=public

AUTH_ACCESS_TOKEN_SECRET=replace-with-long-random-secret
AUTH_REFRESH_TOKEN_SECRET=replace-with-long-random-secret
AUTH_ACCESS_TOKEN_TTL=15m
AUTH_REFRESH_TOKEN_TTL=7d

PAYMENT_PROVIDER=mock
PAYMENT_WEBHOOK_SECRET=development-only-secret

EMAIL_PROVIDER=console
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=

STORAGE_PROVIDER=local
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=5

ORDER_RESERVATION_MINUTES=15
PLATFORM_FEE_TYPE=none
PLATFORM_FEE_VALUE=0
```

Nama variabel boleh disesuaikan, tetapi dokumentasikan seluruh variabel yang dipakai. Jangan gunakan default credential ini di production.

### 13.1 Script minimum

Sediakan script yang konsisten, setidaknya:

- `dev` — menjalankan web dan API untuk development.
- `dev:web` — frontend saja.
- `dev:api` — backend saja.
- `build` — production build.
- `lint` — lint semua workspace.
- `typecheck` — TypeScript validation.
- `test` — automated tests.
- `db:migrate` — menjalankan Prisma migrations.
- `db:generate` — Prisma Client generation.
- `db:seed` — seed data development.

### 13.2 README wajib menjelaskan

- Prasyarat Node.js dan PostgreSQL.
- Cara install dependency.
- Cara membuat database.
- Cara mengisi `.env`.
- Cara menjalankan migration dan seed.
- Cara menjalankan web, API, dan worker.
- Akun demo yang dibuat melalui seed (ditandai hanya untuk development).
- Cara menjalankan tests.
- Cara menambahkan payment provider baru.
- Cara konfigurasi email dan storage.
- Catatan deployment dan backup.

---

## 14. Urutan Implementasi yang Disarankan

Kerjakan secara bertahap. Setiap tahap harus dapat dijalankan sebelum masuk ke tahap berikutnya.

### Phase 1 — Foundation

- Inisialisasi monorepo dan TypeScript.
- Setup Vite, React, Tailwind, shadcn/ui, Express, Prisma 4, dan PostgreSQL.
- Setup linting, formatting, shared Zod schemas, environment validation, logger, dan error handler.
- Buat `DESIGN.md` dan token visual dasar.
- Jalankan migration awal.

### Phase 2 — Authentication dan permission

- Implementasikan user, session, password hashing, login/register/reset.
- Buat middleware auth dan RBAC.
- Buat tests permission dan ownership isolation.

### Phase 3 — Event dan organizer

- Implementasikan organizer profile dan event CRUD.
- Implementasikan ticket type, coupon, media upload adapter.
- Buat organizer dashboard dan event management UI.
- Implementasikan public event listing dan detail page.

### Phase 4 — Order, inventory, dan payment

- Implementasikan atomic reservation dan expiration worker.
- Implementasikan order, payment adapter, mock provider, webhook verification, idempotency.
- Buat checkout dan halaman order status.
- Uji concurrency serta webhook replay.

### Phase 5 — Ticket dan check-in

- Implementasikan ticket issuance dan QR token.
- Buat digital ticket page dan PDF/print view.
- Implementasikan QR scanner, manual lookup, check-in transaction, dan check-in logs.

### Phase 6 — Admin, notification, dan hardening

- Buat admin panel dan audit log.
- Implementasikan email adapter dan notification templates.
- Lengkapi rate limiting, security headers, upload validation, dan operational health check.

### Phase 7 — QA dan delivery

- Jalankan seluruh tests dan build.
- Audit responsive dan accessibility.
- Lakukan click-through seluruh kontrol.
- Dokumentasikan hasil Delivery Gate dan semua blocker production.

---

## 15. Definisi Selesai (Definition of Done)

Proyek dapat dianggap memenuhi MVP jika:

- Frontend Vite, Tailwind, React, TypeScript, dan shadcn/ui berjalan.
- Backend Express + TypeScript berjalan dan terhubung ke PostgreSQL menggunakan Prisma 4.x.
- Migration dan seed berjalan dari README.
- Authentication, role, dan ownership restriction bekerja.
- Organizer dapat membuat event dan jenis tiket.
- Event yang dipublikasikan tampil di website publik.
- Pembeli dapat checkout sebagai guest.
- Kuota direservasi secara aman dan dilepaskan ketika order kedaluwarsa.
- Mock payment dapat menjalankan alur development secara end-to-end.
- Webhook tervalidasi dan idempotent.
- Tiket digital dengan QR unik diterbitkan setelah pembayaran tervalidasi.
- Petugas dapat memindai QR dan sistem mencegah check-in ganda.
- Organizer dan admin dapat mengakses fungsi sesuai permission.
- Tampilan responsive dan tidak menunjukkan pola visual AI-slop.
- Tests kritis lulus dan click-through report tersedia.
- README, `.env.example`, API docs, dan catatan deployment lengkap.
- Semua keterbatasan production—terutama payment provider, email provider, storage, domain, dan kebijakan refund—ditulis jelas.

---

## 16. Instruksi Output Akhir dari AI Coding Agent

Setelah implementasi, berikan laporan akhir dengan format berikut:

1. **Ringkasan implementasi** — fitur yang benar-benar selesai.
2. **Arsitektur** — struktur folder, stack, dan keputusan teknis utama.
3. **Database** — daftar model dan migration yang dibuat.
4. **API** — endpoint utama dan lokasi dokumentasi OpenAPI.
5. **Cara menjalankan** — perintah setup, migrate, seed, dan dev.
6. **Akun demo** — hanya jika seed membuat akun demo; tandai development-only.
7. **Testing report** — lint, typecheck, automated tests, build, dan smoke test.
8. **Anti-Slop Delivery Gate** — checklist UI, responsive, accessibility, serta click-through report PASS/FAIL.
9. **Production blockers** — daftar integrasi atau keputusan yang masih perlu credential/konfirmasi pemilik produk.
10. **Known limitations** — kekurangan yang belum diselesaikan dan alasannya.

Jangan mengklaim fitur selesai jika baru berupa UI statis, data hardcoded, mock API, atau tombol tanpa aksi. Jelaskan bagian yang masih mock dengan tegas.

---

**Mulai dari Phase 1. Baca PRD secara menyeluruh, buat rencana implementasi singkat, siapkan `DESIGN.md`, lalu bangun setiap phase sampai seluruh acceptance criteria MVP terpenuhi. Jangan mengorbankan konsistensi data, keamanan transaksi, atau kualitas responsive demi mengejar jumlah halaman.**
