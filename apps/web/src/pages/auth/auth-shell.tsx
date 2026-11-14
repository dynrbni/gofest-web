import type { ReactNode } from 'react';
import { CheckCircle2, ShieldCheck, Ticket } from 'lucide-react';
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
    <main className="container grid min-h-[calc(100vh-4rem)] items-center gap-10 py-10 lg:grid-cols-[1fr_440px] lg:gap-16 lg:py-16">
      {/* Left Column (Brand Value Props) */}
      <div className="hidden lg:block">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-600">
          <Ticket className="h-3.5 w-3.5" />
          Platform Resmi Event & Konser Indonesia
        </div>
        <h1 className="mt-4 max-w-lg text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl">
          Satu Akun Untuk Semua Tiket Event Favoritmu.
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-slate-500">
          Simpan riwayat tiket secara aman, check-in lebih praktis lewat barcode digital di HP, dan
          nikmati promo eksklusif konser musik & festival.
        </p>

        <div className="mt-8 max-w-md space-y-3.5 border-t border-slate-200 pt-6 text-sm text-slate-600">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span className="font-medium">100% Tiket Terverifikasi & Bebas Calo</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <span className="font-medium">Barcode Dinamis Anti Duplikasi untuk Check-in Cepat</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <span className="font-medium">Dukungan Pembayaran QRIS, Bank Transfer & E-Wallet</span>
          </div>
        </div>

        <Link
          to="/events"
          className="mt-8 inline-block text-sm font-bold text-blue-600 hover:underline"
        >
          Lihat Acara yang Sedang Dijual →
        </Link>
      </div>

      {/* Right Column (Auth Form Card) */}
      <div className="w-full max-w-md justify-self-center lg:justify-self-end">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl sm:p-8">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">{title}</h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">{lede}</p>
          <div className="mt-6">{children}</div>
        </div>
        {footer ? <div className="mt-4 text-center text-xs text-slate-500">{footer}</div> : null}
      </div>
    </main>
  );
}
