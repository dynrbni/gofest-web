import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/common/brand-logo';
import { LanguageMenu } from '@/components/common/language-menu';
import { useLanguage } from '@/lib/language';
import { LoadingImage } from '@/components/common/loading-image';

export function AuthShell({
  title,
  lede,
  children,
  footer,
  compact = false,
}: {
  title: string;
  lede: string;
  children: ReactNode;
  footer?: ReactNode;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <main className={`auth-page${compact ? ' auth-page-compact' : ''}`}>
      <div className="auth-container">
        <div className="auth-mascot relative hidden md:flex">
          <LoadingImage
            src="/assets/gofest-mascot-friends.png"
            alt={t(
              'Trio maskot Gofest: berang-berang, kelinci, dan penguin biru siap ke konser',
              'Gofest mascot friends: a blue otter, bunny and penguin ready for a concert',
            )}
            width={1536}
            height={1024}
            className="auth-mascot-image"
            fetchPriority="high"
            loading="eager"
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
          <div className="auth-form-header">
            <BrandLogo />
            <LanguageMenu variant="auth" />
          </div>
          <h1 id="auth-heading" className="text-2xl font-semibold tracking-tight sm:text-[28px]">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{lede}</p>
          <div className="auth-form-card">{children}</div>
          {footer ? <div className="auth-switch">{footer}</div> : null}
        </section>
      </div>
    </main>
  );
}
