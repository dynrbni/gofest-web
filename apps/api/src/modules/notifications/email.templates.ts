import type { EmailTemplate } from '@prisma/client';
import { env } from '../../config/env';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatIdr(value: unknown): string {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(number) ? number : 0);
}

function layout(title: string, body: string): string {
  const logoUrl = new URL('/assets/gofest-logo.png', env.WEB_URL).href;
  return `<!doctype html>
<html lang="id">
  <body style="margin:0;padding:24px;background:#F2F6FF;color:#111827;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border:1px solid #E8E6EF;border-radius:8px;overflow:hidden;">
      <div style="padding:24px 28px;border-bottom:1px solid #E8E6EF;">
        <img src="${escapeHtml(logoUrl)}" alt="Gofest" width="140" height="44" style="display:block;width:140px;max-width:100%;height:auto;" />
        <h1 style="margin:8px 0 0;font-size:26px;line-height:1.2;font-weight:700;">${escapeHtml(title)}</h1>
      </div>
      <div style="padding:28px;font-size:15px;line-height:1.65;">
        ${body}
      </div>
      <div style="padding:18px 28px;border-top:1px solid #E8E6EF;color:#475569;font-size:12px;">
        Email ini dikirim otomatis oleh Gofest. Jangan balas email ini.
      </div>
    </div>
  </body>
</html>`;
}

function button(label: string, url: string): string {
  return `<p style="margin:24px 0;"><a href="${escapeHtml(url)}" style="display:inline-block;background:#0052CC;color:#FFFFFF;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:700;">${escapeHtml(label)}</a></p>
  <p style="margin:0;color:#475569;font-size:13px;word-break:break-all;">${escapeHtml(url)}</p>`;
}

export function renderEmail(
  template: EmailTemplate,
  payload: Record<string, unknown>,
): { html: string; text: string } {
  switch (template) {
    case 'PASSWORD_RESET': {
      const name = escapeHtml(payload.name ?? 'Pengguna Gofest');
      const resetUrl = String(payload.resetUrl ?? '');
      const minutes = escapeHtml(payload.expiresMinutes ?? 30);
      const html = layout(
        'Atur ulang password',
        `<p>Halo ${name},</p>
         <p>Kami menerima permintaan untuk mengatur ulang password akun Gofest kamu. Tautan ini berlaku selama ${minutes} menit dan hanya dapat dipakai satu kali.</p>
         ${button('Atur password baru', resetUrl)}
         <p style="margin-top:24px;">Jika kamu tidak meminta perubahan password, abaikan email ini. Password lama tetap berlaku.</p>`,
      );
      return {
        html,
        text: `Halo ${payload.name ?? 'Pengguna Gofest'}, buka tautan berikut untuk mengatur ulang password: ${resetUrl}. Tautan berlaku ${minutes} menit.`,
      };
    }
    case 'ORDER_CREATED': {
      const html = layout(
        'Pesanan menunggu pembayaran',
        `<p>Halo ${escapeHtml(payload.buyerName)},</p>
         <p>Pesanan <strong>${escapeHtml(payload.orderCode)}</strong> untuk <strong>${escapeHtml(payload.eventTitle)}</strong> sudah dibuat.</p>
         <p>Total: <strong>${formatIdr(payload.total)}</strong><br />Selesaikan pembayaran sebelum ${escapeHtml(payload.expiresAtFormatted)}.</p>
         ${button('Buka halaman pembayaran', String(payload.paymentUrl ?? ''))}
         <p>Status pesanan dapat dicek dari halaman yang sama.</p>`,
      );
      return {
        html,
        text: `Pesanan ${payload.orderCode} untuk ${payload.eventTitle} menunggu pembayaran. Total ${formatIdr(payload.total)}. Buka ${payload.paymentUrl}.`,
      };
    }
    case 'PAYMENT_SUCCESS': {
      const html = layout(
        'Pembayaran diterima',
        `<p>Halo ${escapeHtml(payload.buyerName)},</p>
         <p>Pembayaran untuk pesanan <strong>${escapeHtml(payload.orderCode)}</strong> sudah kami terima. ${escapeHtml(payload.ticketCount)} tiket untuk <strong>${escapeHtml(payload.eventTitle)}</strong> sudah diterbitkan.</p>
         ${button('Buka tiket digital', String(payload.ticketUrl ?? ''))}
         <p>Simpan halaman tiket atau cetak sebelum datang ke venue. Setiap QR hanya dapat dipakai satu kali.</p>`,
      );
      return {
        html,
        text: `Pembayaran diterima. ${payload.ticketCount} tiket untuk ${payload.eventTitle} sudah terbit. Buka ${payload.ticketUrl}.`,
      };
    }
    case 'EVENT_CANCELLED': {
      const html = layout(
        'Event dibatalkan',
        `<p>Halo ${escapeHtml(payload.buyerName)},</p>
         <p>Event <strong>${escapeHtml(payload.eventTitle)}</strong> dibatalkan oleh organizer.</p>
         <p>Pesanan <strong>${escapeHtml(payload.orderCode)}</strong> akan ditinjau untuk proses pengembalian dana. Tim Gofest akan menghubungi kamu melalui email terdaftar.</p>
         <p>Alasan: ${escapeHtml(payload.reason ?? 'Tidak disebutkan')}</p>`,
      );
      return {
        html,
        text: `Event ${payload.eventTitle} dibatalkan. Pesanan ${payload.orderCode} akan ditinjau untuk pengembalian dana. Alasan: ${payload.reason ?? 'Tidak disebutkan'}.`,
      };
    }
    default: {
      const html = layout(
        'Informasi Gofest',
        '<p>Ada informasi baru terkait akun Gofest kamu.</p>',
      );
      return { html, text: 'Ada informasi baru terkait akun Gofest kamu.' };
    }
  }
}
