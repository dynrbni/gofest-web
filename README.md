# Gofest

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

| Script            | Fungsi                       |
| ----------------- | ---------------------------- |
| `pnpm dev`        | Web, API, dan worker         |
| `pnpm dev:web`    | Frontend saja                |
| `pnpm dev:api`    | API saja                     |
| `pnpm dev:worker` | Worker saja                  |
| `pnpm build`      | Build API dan web            |
| `pnpm lint`       | ESLint seluruh workspace     |
| `pnpm typecheck`  | TypeScript strict check      |
| `pnpm test`       | Test API                     |
| `pnpm db:migrate` | Prisma migration             |
| `pnpm db:seed`    | Seed data demo               |
| `pnpm check`      | Lint, typecheck, test, build |

## Desain

Arah visual dan aturan implementasi ada di `DESIGN.md`. Aturan Anti-Slop dipakai dalam mode `during`: setiap halaman harus melewati loading, empty, error, responsive, keyboard, dan kontras sebelum dianggap selesai.

## Integrasi eksternal

Payment gateway, SMTP production, object storage, dan domain belum ditentukan. Development memakai `MockPaymentProvider`, email console, dan local storage. Integrasi production harus ditambahkan melalui adapter, bukan dengan mengubah alur inti.

## Lisensi

Belum ditentukan.
