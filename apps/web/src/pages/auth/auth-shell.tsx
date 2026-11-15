import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
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
          className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-blue-700 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t('Kembali ke acara', 'Back to events')}
        </Link>
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
          <h1 id="auth-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{lede}</p>
          <div className="mt-6">{children}</div>
          {footer ? <div className="mt-6 text-center text-sm text-slate-600">{footer}</div> : null}
        </section>
      </div>
    </main>
  );
}
