import { Check, ChevronRight } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { SiteLogo, PublishedSiteMetadata } from '@/components/common/site-branding';
import { useCmsSite } from '@/lib/cms';
import { PublicLayout } from './public-layout';
import { ErrorState, PageLoading } from '@/components/common/states';
import { LanguageMenu } from '@/components/common/language-menu';
import { cn } from '@/lib/utils';

export function CheckoutLayout() {
  const cms = useCmsSite();
  if (cms.isLoading) return <PageLoading fullPage label="Memuat website" />;
  if (!cms.data)
    return (
      <main className="container py-16">
        <ErrorState error={cms.error} onRetry={() => void cms.refetch()} />
      </main>
    );
  if (cms.data.settings.maintenance) return <PublicLayout />;
  return (
    <div className="checkout-shell min-h-screen bg-white">
      <PublishedSiteMetadata />
      <header className="border-b border-slate-100 bg-white">
        <div className="container flex min-h-16 items-center justify-between gap-4 py-2 sm:min-h-24 sm:py-4">
          <SiteLogo />
          <LanguageMenu variant="auth" />
        </div>
      </header>
      <Outlet />
    </div>
  );
}

export function PurchaseSteps({ active }: { active: 1 | 2 | 3 | 4 }) {
  const steps = ['Pilih Kategori', 'Detail Pesanan', 'Metode Pembayaran', 'Pembayaran'];
  return (
    <nav aria-label="Tahapan pembelian" className="purchase-progress">
      <ol className="purchase-steps container lg:max-w-5xl">
        {steps.map((label, index) => (
          <li
            key={label}
            aria-current={active === index + 1 ? 'step' : undefined}
            className={cn('purchase-step', index + 1 > active && 'text-blue-100')}
          >
            <span
              className={cn(
                'purchase-step-number',
                index + 1 <= active && 'border-white bg-white text-blue-800',
              )}
            >
              {index + 1 < active ? <Check className="size-4" aria-label="Selesai" /> : index + 1}
            </span>
            <span className="purchase-step-label">{label}</span>
            {index < 3 ? <ChevronRight className="purchase-step-arrow" aria-hidden /> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
