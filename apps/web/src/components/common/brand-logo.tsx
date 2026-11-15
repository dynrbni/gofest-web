import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/language';
import { cn } from '@/lib/utils';

export function BrandLogo({ className }: { className?: string }) {
  return (
    <img
      src="/assets/gofest-logo.png"
      alt="Gofest"
      width={2192}
      height={690}
      className={cn('block h-9 w-auto max-w-full object-contain sm:h-11', className)}
      draggable={false}
    />
  );
}

export function Logo({ className }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <Link
      to="/"
      className={cn('brand-logo', className)}
      aria-label={t('Gofest, ke beranda', 'Gofest home')}
    >
      <BrandLogo />
    </Link>
  );
}
