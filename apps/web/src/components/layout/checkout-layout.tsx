import { Check, ChevronRight } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { Logo } from '@/components/common/brand-logo';
import { LanguageMenu } from '@/components/common/language-menu';
import { cn } from '@/lib/utils';

export function CheckoutLayout() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100 bg-white">
        <div className="container flex min-h-20 items-center justify-between gap-4 py-4 sm:min-h-24">
          <Logo />
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
      <ol className="container grid grid-cols-4 gap-2 py-4 lg:max-w-5xl lg:gap-5">
        {steps.map((label, index) => (
          <li
            key={label}
            aria-current={active === index + 1 ? 'step' : undefined}
            className={cn(
              'flex min-w-0 flex-col items-start gap-2 text-[10px] sm:flex-row sm:items-center sm:text-sm',
              index + 1 > active && 'text-blue-100',
            )}
          >
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full border border-current sm:size-7',
                index + 1 <= active && 'border-white bg-white text-blue-800',
              )}
            >
              {index + 1 < active ? <Check className="size-4" aria-label="Selesai" /> : index + 1}
            </span>
            <span className="min-w-0 leading-snug">{label}</span>
            {index < 3 ? (
              <ChevronRight className="ml-auto hidden size-4 shrink-0 sm:block" aria-hidden />
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
