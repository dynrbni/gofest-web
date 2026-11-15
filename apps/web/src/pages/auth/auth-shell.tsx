import type { ReactNode } from 'react';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { BrandLogo } from '@/components/common/brand-logo';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/lib/language';

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
  const { t } = useLanguage();
  const location = useLocation();
  return (
    <main className="auth-page">
      <div className="auth-container">
        <Link
          to="/events"
          className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t('Kembali ke acara', 'Back to events')}
        </Link>
        <div className="auth-grid">
          <section
            className="auth-visual"
            aria-label={t('Pengalaman Gofest', 'The Gofest experience')}
          >
            <img
              src="/images/concert-crowd.webp"
              alt=""
              className="absolute inset-0 size-full object-cover"
              width={720}
              height={800}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-950 via-blue-950/20 to-transparent" />
            <div className="relative mt-auto p-8">
              <h2 className="max-w-xs text-3xl font-extrabold leading-tight text-white">
                {t('Satu akun, banyak cerita.', 'One account. So many stories.')}
              </h2>
              <p className="mt-4 max-w-xs text-sm leading-6 text-blue-100">
                {t(
                  'Dari konser pertama sampai acara favorit berikutnya. Simpan semua tiketmu di sini.',
                  'From your first concert to your next favourite event. Keep every ticket here.',
                )}
              </p>
              <Link
                to="/events"
                className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-white hover:underline"
              >
                {t('Temukan acaramu', 'Find your next event')}
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </div>
          </section>
          <section className="auth-form-panel" aria-labelledby="auth-heading">
            <BrandLogo className="mb-6" />
            <nav aria-label={t('Akun', 'Account')} className="mb-7 flex border-b border-slate-200">
              <Link
                to="/login"
                aria-current={location.pathname === '/login' ? 'page' : undefined}
                className="auth-tab"
              >
                {t('Masuk', 'Log in')}
              </Link>
              <Link
                to="/register"
                aria-current={location.pathname === '/register' ? 'page' : undefined}
                className="auth-tab"
              >
                {t('Daftar', 'Sign up')}
              </Link>
            </nav>
            <h1 id="auth-heading" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">{lede}</p>
            <div className="mt-6">{children}</div>
            {footer ? (
              <div className="mt-6 text-center text-sm text-slate-600">{footer}</div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
