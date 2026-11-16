import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/language';
import { cn } from '@/lib/utils';

const brandAssets = {
  default: { src: '/assets/gofest-logo.png', alt: 'Gofest', width: 2192, height: 690 },
  admin: { src: '/assets/gofest-admin-logo.png', alt: 'Gofest Admin', width: 1139, height: 404 },
  creator: {
    src: '/assets/gofest-creator-logo-transparent.png',
    alt: 'Gofest Creator',
    width: 1032,
    height: 360,
  },
};

interface LogoProps {
  className?: string;
  variant?: keyof typeof brandAssets;
}

export function BrandLogo({ className, variant = 'default' }: LogoProps) {
  return (
    <img
      {...brandAssets[variant]}
      className={cn('block h-9 w-auto max-w-full object-contain sm:h-11', className)}
      draggable={false}
    />
  );
}

export function Logo({ className, variant = 'default' }: LogoProps) {
  const { t } = useLanguage();
  return (
    <Link
      to="/"
      className={cn('brand-logo', className)}
      aria-label={t(`${brandAssets[variant].alt}, ke beranda`, `${brandAssets[variant].alt} home`)}
    >
      <BrandLogo variant={variant} />
    </Link>
  );
}
