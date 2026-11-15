# Gofest

[![CI](https://github.com/dynrbni/gofest-web/actions/workflows/ci.yml/badge.svg)](https://github.com/dynrbni/gofest-web/actions/workflows/ci.yml)

Platform ticketing event multi-organizer untuk pasar Indonesia. Pembeli dapat menemukan event, checkout sebagai guest, dan menerima tiket digital dengan QR. Organizer mengelola event, tiket, promo, order, dan check-in. Admin memoderasi platform.

> Status: sedang dibangun mengikuti PRD di `docs/PRD-Platform-Ticketing-Event.md`. Jangan menganggap fitur selesai sebelum laporan QA dan Delivery Gate tersedia.

## Stack

- Frontend: Vite, React, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Express, TypeScript, Prisma 4.16.2
- Database: PostgreSQL
- Monorepo: pnpm workspace

## Struktur

```text
apps/
  web/       Vite + React + Tailwind + shadcn/ui
  api/       Express REST API + Prisma + worker
packages/
  shared/    Zod schemas, enums, constants, shared types
docs/        Arsitektur, ERD, API, delivery gate
```

## Prasyarat

- Node.js 22 (lihat `.nvmrc`)
- pnpm 10
- PostgreSQL 18 atau versi yang kompatibel
- Tidak wajib Docker

## Setup lokal

```bash
nvm use
pnpm install
createdb gofest_ticketing
createdb gofest_ticketing_test
cp .env.example apps/api/.env
# sesuaikan DATABASE_URL dan secret
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Web berjalan di `http://localhost:5173`, API di `http://localhost:4000`, worker health di `http://localhost:4001/health`.

## Script

| Script            | Fungsi                               |
| ----------------- | ------------------------------------ |
| `pnpm dev`        | Web, API, dan worker                 |
| `pnpm dev:web`    | Frontend saja                        |
| `pnpm dev:api`    | API saja                             |
| `pnpm dev:worker` | Worker saja                          |
| `pnpm build`      | Build API dan web                    |
| `pnpm lint`       | ESLint seluruh workspace             |
| `pnpm typecheck`  | TypeScript strict check              |
| `pnpm test`       | Test API                             |
| `pnpm db:migrate` | Prisma migration                     |
| `pnpm db:seed`    | Seed data demo                       |
| `pnpm db:check`   | Periksa koneksi database sebelum dev |
| `pnpm check`      | Lint, typecheck, test, build         |

### Browser QA

`pnpm test:browser` menjalankan pemeriksaan halaman publik dan aksesibilitas di lebar 390px dan 1440px. Jalankan API dan web terlebih dahulu, seed minimal satu acara publik, dan pastikan CLI `agent-browser` tersedia.

Jika port lokal bertabrakan dengan proyek lain, jalankan web dan API pada port terpisah dan isi `VITE_API_URL` pada proses web. Contoh perintah QA:

```bash
QA_BASE_URL=http://localhost:5180 QA_API_URL=http://localhost:4180/api/v1 pnpm test:browser
```

Untuk proxy API pada dev server atau `vite preview`, isi `API_PROXY_TARGET` (default `http://localhost:4000`). `WEB_URL` pada API harus sama dengan origin web yang dipakai agar login dan checkout diizinkan.

Untuk halaman yang memerlukan login, masuk melalui sesi `agent-browser` terlebih dahulu lalu tambahkan `QA_SESSION=<nama-sesi>` dan `QA_ROLE=admin`, `organizer`, `buyer`, atau `staff`. Pemeriksaan organizer menggunakan acara publik pertama dari seed yang dimiliki organizer tersebut. Skrip tidak membuat pesanan atau mengubah data.

Catatan validasi redesign dan batas pengujiannya ada di `docs/qa/2026-11-15-marketplace-redesign.md`.

`pnpm test:discovery` memeriksa dropdown kategori, kombinasi filter kota/harga/tanggal, reset, navigasi acara gratis, penyimpanan bahasa ID/English, validasi form akun, tombol lihat password, dan tautan kota. Skrip memakai data API sebenarnya dan tidak membuat akun atau pesanan.

### Troubleshooting database

`pnpm dev` memeriksa koneksi database sebelum menjalankan tiga proses. Jika gagal, pastikan PostgreSQL aktif dan `DATABASE_URL` sesuai dengan database lokal. Di macOS dengan Homebrew:

```bash
brew services list
brew services start postgresql@18
pnpm db:check
```

Jika log PostgreSQL menyebut `postmaster.pid already exists`, periksa PID yang tercantum dan proses PostgreSQL terlebih dahulu. File tersebut adalah pengaman terhadap dua server pada direktori data yang sama; jangan hapus saat PostgreSQL masih berjalan. Pada insiden lokal 15 November, PID lama sudah dipakai proses audio macOS, sehingga service dihentikan, file PID lama dipindahkan sebagai cadangan, lalu service dijalankan kembali. Data dan migrasi tidak direset. Lihat [panduan startup PostgreSQL](https://www.postgresql.org/docs/current/server-start.html).

Gangguan koneksi saat aplikasi sedang berjalan menghasilkan `503 SERVICE_UNAVAILABLE` dengan `Retry-After: 30`. API health `/api/v1/health` dan worker `/health` memeriksa database, dan worker mencoba antrean lagi setiap 30 detik dengan log error yang memuat penyebab koneksi.

### Bahasa dan kategori

Pilihan ID/English di navbar tersimpan pada browser dan berlaku pada navigasi, beranda, katalog, kartu acara, serta login/register. Konten acara dan kategori buatan organizer/admin tetap mengikuti teks yang disimpan; halaman transaksi, legal, dan workspace masih berbahasa Indonesia. Pada mobile, pilihan bahasa dan kategori tersedia lewat tombol menu.

Admin dapat menambah, mengedit, dan mengaktifkan/nonaktifkan kategori melalui `/admin/categories`. Kategori aktif berasal dari API yang sama untuk dropdown navbar, ribbon katalog, beranda, dan form acara; kategori tambahan mendapatkan ikon tiket bawaan.

## Desain

Arah visual dan aturan implementasi ada di `DESIGN.md`. Aturan Anti-Slop dipakai dalam mode `during`: setiap halaman harus melewati loading, empty, error, responsive, keyboard, dan kontras sebelum dianggap selesai.

## Integrasi eksternal

Payment gateway, SMTP production, object storage, dan domain belum ditentukan. Development memakai `MockPaymentProvider`, email console, dan local storage. Integrasi production harus ditambahkan melalui adapter, bukan dengan mengubah alur inti.

## Lisensi

Belum ditentukan.
