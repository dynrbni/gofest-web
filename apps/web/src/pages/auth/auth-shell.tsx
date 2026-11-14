import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function AuthShell({
  title,
  lede,
  children,
  footer,
}: {
  title: string;
  lede: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="container grid min-h-[calc(100vh-4rem)] gap-10 py-10 lg:grid-cols-[1fr_420px] lg:items-center lg:gap-16 lg:py-16">
      <div className="hidden lg:block">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-olive">Gofest</p>
        <h1 className="mt-4 max-w-xl font-display text-6xl leading-[0.95] tracking-tightest">
          Tiket yang jelas, dari pilihan sampai pintu masuk.
        </h1>
        <div className="mt-8 max-w-md space-y-4 border-t border-warm-border pt-6 text-sm leading-relaxed text-muted-foreground">
          <p>
            Sesi disimpan sebagai cookie HttpOnly dan diperbarui otomatis. Tidak ada token yang disimpan
            di localStorage.
          </p>
          <p>
            Pesanan tamu tetap bisa dibuka lewat tautan bertoken yang dikirim setelah checkout. Akun
            memudahkan kamu menemukan tiket lama.
          </p>
        </div>
        <Link to="/events" className="mt-6 inline-block text-sm font-semibold underline underline-offset-4">
          Lihat acara yang sedang dijual
        </Link>
      </div>

      <div className="w-full max-w-md justify-self-center lg:justify-self-end">
        <div className="border border-warm-border bg-card p-6 shadow-sm sm:p-8">
          <h2 className="font-display text-4xl leading-none tracking-tightest">{title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{lede}</p>
          <div className="mt-6">{children}</div>
        </div>
        {footer ? <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div> : null}
      </div>
    </main>
  );
}