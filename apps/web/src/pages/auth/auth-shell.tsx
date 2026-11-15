import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/common/brand-logo';
import { LanguageMenu } from '@/components/common/language-menu';

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
    <div className="auth-form-content">
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
    </div>
  );
}
