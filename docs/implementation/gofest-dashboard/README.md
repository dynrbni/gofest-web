# GOFEST dashboard & role management

Implementasi memperluas aplikasi React/Vite, Express/TypeScript, PostgreSQL, dan Prisma **4.16.2** yang sudah ada. Tidak ada integrasi Xendit atau transfer payout eksternal.

## Menjalankan

Dari root repository, gunakan konfigurasi `apps/api/.env` yang sudah tersedia (atau isi dari `.env.example`):

```sh
pnpm install
pnpm db:generate
pnpm --filter @gofest/api db:deploy
pnpm db:seed
pnpm dev
```

Seed demo ditolak di production. Seed menambahkan akun berikut dengan password Argon2, profil organizer terhubung, event dengan beberapa status, customer, order, pembayaran mock, refund, check-in, ledger, rekening, dan payout. Akun demo lama tetap tersedia untuk kompatibilitas.

| Role       | Email                 | Password development | Dashboard            |
| ---------- | --------------------- | -------------------- | -------------------- |
| SUPERADMIN | superadmin@gofest.com | admin123             | `/admin/dashboard`   |
| ADMIN      | admin@gofest.com      | admin123             | `/admin/dashboard`   |
| CREATOR    | organizer@gofest.com  | admin123             | `/creator/dashboard` |

Semua akun masuk melalui `/login`. URL `/organizer/*` tetap tersedia untuk kompatibilitas. Kredensial tidak disimpan di frontend dan seed tidak dijalankan otomatis oleh startup aplikasi.

## Modul

- **RBAC:** role dan status dibaca dari database pada setiap request. Cookie access/refresh tetap memakai mekanisme autentikasi existing. Route frontend dan API sama-sama dilindungi. Akun organizer lama tetap didukung.
- **Admin/Superadmin:** satu `AdminLayout` dan overview operasional, delapan KPI, grafik pendapatan/tiket/transaksi, status pembayaran, performa event, antrean review, transaksi, refund, payout, dan aktivitas admin. Tersedia periode hari ini, 7/30/90 hari, rentang tanggal, dan sepanjang waktu. Periode harian menggunakan Asia/Jakarta.
- **Creator:** `CreatorLayout`, statistik organizer sendiri, acara mendatang, status pengajuan, pesanan, peserta, check-in, pendapatan, saldo, rekening, withdrawal, dan bantuan. Semua query kepemilikan dibatasi oleh organizer dari sesi server.
- **Event:** form existing digunakan bersama untuk informasi, harga/kuota/periode tiket, kode promosi, staff, order, dan check-in. Admin dapat menyetujui, mempublikasikan, menolak, meminta revisi, mengubah, atau membatalkan event. Perubahan informasi utama oleh Creator setelah publikasi masuk review ulang. Riwayat menyimpan actor, waktu, dan alasan.
- **Transaksi:** pencarian order/customer, filter event, organizer, tanggal, status order/pembayaran, detail item/fee, pembayaran, dan riwayat status. Event dan customer yang sudah ada tetap memakai alur checkout, kuota, webhook, QR, dan tiket existing.
- **Check-in:** monitoring, jumlah peserta valid/terpakai, scan invalid/duplikat, riwayat, penugasan/penghapusan staff, dan laporan event. Admin/Superadmin mempunyai akses global; Creator hanya event sendiri.
- **Konten:** CRUD homepage/banner/kampanye, status aktif, urutan, tampilan konten aktif pada beranda publik, kategori existing, dan voucher per event yang digunakan checkout.
- **Dukungan/notifikasi:** tiket bantuan Creator sendiri, balasan/status dari Admin, notifikasi yang dimiliki akun, dan tanda dibaca. Konfigurasi notifikasi memengaruhi pembuatan notifikasi baru.
- **Superadmin:** CRUD akun administrasi, aktivasi/suspensi, reset password, matriks permission Creator, pengaturan platform/fee/minimum withdrawal/kontak/notifikasi, dan audit penuh. Hak operasional Admin/Superadmin dikunci setara; Creator tidak dapat diberi akses global. Admin hanya melihat audit operasional. Superadmin aktif terakhir tidak bisa diturunkan role atau dinonaktifkan, termasuk pada request bersamaan.

## Pencatatan keuangan

- Harga tiket, diskon, nominal service fee, jenis tarif, dan nilai tarif disnapshot saat checkout. Perubahan konfigurasi tidak mengubah transaksi lama. Seed menginisialisasi tarif 5% hanya bila konfigurasi belum ada.
- `Gross Ticket Sales` adalah nilai tiket setelah diskon. `Service Fee Revenue` adalah hak GOFEST. `Net Fee Income` mengurangi refund fee dan biaya gateway yang tercatat; nilainya diberi keterangan sementara ketika biaya gateway belum dikonfigurasi. Tidak ada angka biaya gateway rekaan.
- Ledger memiliki akun debit/kredit, nominal Rupiah integer, referensi unik, serta relasi order/organizer/payout. Satu baris mewakili pasangan pembukuan dengan nominal yang sama, sehingga perubahan saldo dapat ditelusuri.
- Wallet menyimpan saldo tersedia, pending, reserved, dan withdrawn. Akumulasi menggunakan PostgreSQL `BIGINT`; API mengubahnya ke integer JavaScript hanya setelah pemeriksaan rentang aman. Saldo tidak dihitung ulang dari order ketika dashboard dibuka.
- Pembayaran dan posting ledger/wallet berjalan dalam database transaction. Pembayaran yang menunggu review masuk saldo pending; penerbitan tiket oleh Admin melepasnya ke available hanya sekali. Pembayaran biasa membuat proceeds langsung tersedia pada workflow internal saat ini. Kebijakan ini belum mencerminkan settlement provider.
- Laporan event menampilkan penjualan, diskon, fee, refund, proceeds, paid out, dan outstanding. Proceeds **bukan laba bersih EO**, karena biaya produksi event tidak diketahui GOFEST.
- Saldo current, antrean review/payout, jumlah event, dan peserta adalah kondisi saat ini. Grafik, pencatatan keuangan, transaksi, serta pendaftaran pengguna mengikuti periode yang dipilih. UI memberi keterangan untuk metrik tersebut.

## Withdrawal & refund

1. Creator menyimpan rekening. API selalu mengembalikan nomor rekening dalam bentuk masked.
2. Pengajuan withdrawal divalidasi terhadap rekening sendiri, minimum tersimpan, dan saldo server. Nominal dari frontend tidak dipercaya sebagai saldo.
3. Insert idempotency key, reservasi saldo bersyarat, ledger, riwayat status, notifikasi, dan audit berada dalam satu transaksi. Retry tidak membuat request/reservasi kedua; request bersamaan tidak dapat memakai saldo yang sama.
4. Penolakan mengembalikan reserved ke available satu kali. Persetujuan tetap **APPROVED**, saldo tetap reserved, dan menunggu provider. Tidak ada endpoint simulasi yang menyatakan payout **COMPLETED**.
5. Refund memisahkan komponen harga tiket dan fee. Persetujuan mereservasi dana organizer. Tombol **Simulasikan refund** hanya tersedia di development; simulasi memperbarui ledger, saldo, order, dan status tiket untuk refund penuh tanpa transfer eksternal. Backend menolak simulasi di production.

`PayoutProvider` dan `PayoutInstruction` menyediakan batas integrasi, idempotency, rekening tujuan, currency, dan hasil provider. Provider saat ini `INTERNAL`, dengan `supportsTransfers=false`.

## Migrasi

- `20261116120000_dashboard_roles_finance`: role/status baru, snapshot tarif, wallet, ledger, rekening, payout/riwayat, refund, notifikasi, konten, dukungan, permission; constraint nominal dan saldo; baseline saldo dari order terbayar existing.
- `20261116140000_review_payment_ledger`: baseline pembayaran existing yang masih menunggu review ke saldo pending.
- `20261116150000_wallet_capacity_and_legacy_holds`: kapasitas saldo `BIGINT`; proceeds refund parsial lama yang belum memiliki rincian refund ditahan untuk rekonsiliasi, tidak disediakan untuk withdrawal.

Representasi `Admin` memakai `User.role`; organizer memakai `OrganizerProfile`; penugasan check-in memakai `EventStaff`; scan memakai `CheckInLog`; email existing memakai `EmailNotification`. Model ini tidak diduplikasi.

## File utama

- `apps/api/prisma/schema.prisma`, `prisma/dashboard.seed.ts`, `prisma/migrations/*`.
- `apps/api/src/modules/finance/*`: ledger, analytics/report, rekening/payout, refund, validasi, representasi Rupiah, provider boundary.
- `apps/api/src/modules/admin/admin-management.service.ts`, `admin-event.routes.ts`, `middleware/auth.ts`.
- `apps/api/src/modules/workspace/*`, `modules/notifications/inbox.service.ts`.
- `apps/web/src/pages/workspace/*`, `pages/admin/admin-shell.tsx`, `pages/organizer/organizer-shell.tsx`, `components/layout/workspace-layout.tsx`, `app/router.tsx`.
- Komponen event/ticket/coupon/staff existing dikembangkan, bukan dibuat ulang untuk setiap role.
- `apps/api/tests/integration/dashboard-finance.test.ts`, `workspace-management.test.ts`, dan `e2e/tests/dashboard-roles.mjs`.

## Verifikasi

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
node e2e/tests/dashboard-roles.mjs
```

Test integrasi memakai `DATABASE_URL_TEST`; database test perlu menerima migrasi yang sama. Browser test membutuhkan API/frontend aktif dan seed demo. Screenshot hasil browser test disimpan di `/tmp/gofest-dashboard-qa`.

Lihat `progress.md` di direktori ini untuk hasil verifikasi terakhir.

## Saat Xendit tersedia

- Implementasikan provider dari kontrak `PayoutProvider`, simpan credential hanya di backend, dan petakan organizer ke akun XenPlatform.
- Tambahkan submission payout ber-idempotency, verifikasi signature callback/webhook, lookup status provider, serta retry/reconciliation. Kegagalan harus melepas atau mempertahankan reservasi sesuai hasil yang terverifikasi.
- Status `PROCESSING/COMPLETED/FAILED` baru boleh berasal dari provider yang terverifikasi. Pada completion, pindahkan reserved ke withdrawn tepat sekali dan catat ledger; alokasikan paid out ke order/event agar laporan event tetap dapat direkonsiliasi.
- Integrasikan refund aktual dan konfirmasi nominal tiket/fee yang benar-benar dikembalikan. Simulasi development tidak boleh dianggap sebagai refund eksternal.
- Catat biaya gateway, pihak penanggung, settlement, kebijakan dana pending/available, serta rekonsiliasi saldo provider. Jangan mengganti snapshot fee transaksi lama.
