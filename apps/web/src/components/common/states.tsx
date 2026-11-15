import { AlertTriangle, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocation } from 'react-router-dom';
import { EventGridSkeleton, PageSkeleton, SiteSkeleton } from './page-skeleton';

export function LoadingState({
  label = 'Memuat data',
  rows = 3,
  className,
  variant = 'list',
}: {
  label?: string;
  rows?: number;
  className?: string;
  variant?: 'list' | 'events' | 'table';
}) {
  return (
    <div className={cn('space-y-4', className)} role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {variant === 'events' ? (
        <EventGridSkeleton count={rows} />
      ) : (
        Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            aria-hidden
            className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-2xs"
          >
            {variant === 'list' ? (
              <Skeleton className="h-20 w-24 shrink-0 rounded-lg bg-slate-100" />
            ) : null}
            <div
              className={cn(
                'w-full',
                variant === 'table' ? 'grid grid-cols-3 items-center gap-4' : 'space-y-2.5',
              )}
            >
              <Skeleton className="h-3.5 w-full max-w-28 bg-slate-100" />
              <Skeleton className="h-5 w-3/4 bg-slate-100" />
              <Skeleton className="h-3.5 w-1/2 bg-slate-100" />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function PageLoading({
  label = 'Memuat halaman',
  fullPage = false,
}: {
  label?: string;
  fullPage?: boolean;
}) {
  const { pathname } = useLocation();
  return (
    <div
      className="min-h-[60vh]"
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-page-loading
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden>
        {fullPage ? <SiteSkeleton pathname={pathname} /> : <PageSkeleton pathname={pathname} />}
      </div>
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  title = 'Data Tidak Dapat Dimuat',
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <div
      className={cn('rounded-2xl border border-rose-200 bg-rose-50/50 p-6', className)}
      role="alert"
    >
      <div className="flex items-start gap-3.5">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden />
        <div>
          <h2 className="text-base font-semibold text-rose-950">{title}</h2>
          <p className="mt-1 max-w-prose text-xs text-rose-800">{errorMessage(error)}</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-medium text-white shadow-xs transition-colors hover:bg-rose-700"
            >
              <RotateCw className="h-3.5 w-3.5" aria-hidden />
              Coba Lagi
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 sm:p-12 text-center',
        className,
      )}
    >
      <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function InlineError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p className="text-xs font-medium text-rose-600" role="alert">
      {errorMessage(error)}
    </p>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="text-[11px] text-slate-500">{hint}</p> : null}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
