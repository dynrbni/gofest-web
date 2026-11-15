import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/common/brand-logo';
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
  return (
    <main className="auth-page">
      <BrandLogo className="mx-auto shrink-0" />
      <div className="auth-container">
        <div className="auth-mascot">
          <img
            src="/assets/gofest-mascot.png"
            alt={t(
              'Maskot Gofest, berang-berang biru dengan headphone dan tiket konser',
              'Gofest mascot, a blue otter wearing headphones and holding a concert ticket',
            )}
            width={1254}
            height={1254}
            className="auth-mascot-image"
            fetchPriority="high"
            draggable={false}
          />
          <div className="hidden md:block">
            <p className="text-2xl font-semibold leading-snug text-blue-800">
              {t('Ada acara seru yang menunggumu.', 'Your next great event is waiting.')}
            </p>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600">
              {t(
                'Dari konser sampai festival, mulai rencanamu di Gofest.',
                'From concerts to festivals, make your plans with Gofest.',
              )}
            </p>
          </div>
        </div>
        <section className="auth-form-panel" aria-labelledby="auth-heading">
          <h1
            id="auth-heading"
            className="text-center text-2xl font-semibold tracking-tight sm:text-[28px]"
          >
            {title}
          </h1>
          <p className="mt-3 text-center text-sm leading-6 text-slate-600">{lede}</p>
          {footer ? <div className="auth-switch">{footer}</div> : null}
          <div className="auth-form-card">{children}</div>
        </section>
      </div>
    </main>
  );
}
