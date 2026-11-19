# Xendit di GoFest

## Konfigurasi

Isi `apps/api/.env` dengan Secret API Key Xendit yang memiliki izin Money-in dan Money-out, serta Webhook Verification Token dari mode dashboard yang sama.

```dotenv
PAYMENT_PROVIDER=xendit
XENDIT_SECRET_API_KEY=
XENDIT_WEBHOOK_TOKEN=
XENDIT_PAYOUTS_ENABLED=true
```

Jalankan API dan worker dengan konfigurasi yang sama. Xendit mensyaratkan `WEB_URL` memakai HTTPS dan sama dengan origin halaman checkout. GoFest menampilkan QRIS, Virtual Account, dan kartu sesuai channel yang tersedia untuk akun dan nominal transaksi. Xendit Components menangani input kartu dan autentikasi 3DS.

Untuk checkout lokal, gunakan sertifikat localhost yang dipercaya browser. Isi `DEV_HTTPS_CERT` dan `DEV_HTTPS_KEY` di `apps/web/.env` dengan path ke sertifikat dan key lokal. Atur `DEV_HTTPS_PORT` jika port 5173 dipakai aplikasi lain. Isi `WEB_URL` di API dengan URL tersebut, misalnya `https://localhost:5443`, lalu buka aplikasi dari alamat itu.

## Webhook lokal

Jalankan proxy dan ngrok di dua terminal. Proxy hanya meneruskan POST ke dua endpoint Xendit.

```sh
node scripts/xendit-webhook-proxy.mjs
ngrok http http://127.0.0.1:4010 --inspect=false
```

Gunakan URL HTTPS yang ditampilkan ngrok di **Settings → Developers → Webhooks** pada dashboard Xendit.

| Webhook Xendit            | Path GoFest                        |
| ------------------------- | ---------------------------------- |
| Payment Session Completed | `/api/v1/webhooks/payments/xendit` |
| Payment Session Expired   | `/api/v1/webhooks/payments/xendit` |
| Payouts v2                | `/api/v1/webhooks/payouts/xendit`  |

**Test and save** setiap entri. Jika hostname tunnel berubah, perbarui ketiga URL. Untuk deployment, gunakan hostname HTTPS yang stabil.

## Payout

Creator memilih rekening dan mengajukan penarikan. GoFest mereservasi saldo sampai admin memutuskan. Penolakan mengembalikan saldo. Persetujuan ketika Xendit diaktifkan mencatat keputusan admin sebelum mengirim payout domestik IDR. Worker mencoba ulang pengiriman dengan referensi dan idempotency key yang sama. GoFest mengurangi saldo yang direservasi setelah sukses, dan mengembalikan saldo tersedia setelah gagal atau reversal.

Approval internal lama tetap bisa dilihat pada riwayat. Worker hanya mengirim approval yang tercatat untuk Xendit.

## Email tiket

Set `EMAIL_PROVIDER=smtp` beserta konfigurasi SMTP agar worker mengirim email konfirmasi dengan lampiran PDF. PDF berisi satu tiket per halaman dan memakai QR aktif pada saat email diproses.

## Referensi

- [Xendit Components untuk pembayaran sekali](https://docs.xendit.co/docs/components-one-time-payment)
- [SDK Xendit Components Web](https://github.com/xendit/xendit-components-web)
- [Xendit Payouts v2](https://archive.developers.xendit.co/api-reference/#payouts)
- [Xendit Webhook Settings](https://docs.xendit.co/docs/payouts-set-up-webhooks)
