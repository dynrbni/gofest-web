import { AlertTriangle, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export function LoadingState({
  label = 'Memuat data',
  rows = 3,
  className,
}: {
  label?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', className)} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-2xs"
        >
          <Skeleton className="h-20 w-24 shrink-0 rounded-lg bg-slate-100" />
          <div className="w-full space-y-2.5">
            <Skeleton className="h-3.5 w-28 bg-slate-100" />
            <Skeleton className="h-5 w-3/4 bg-slate-100" />
            <Skeleton className="h-3.5 w-1/2 bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageLoading({ label = 'Memuat halaman' }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4" role="status">
      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" />
      <p className="text-sm font-semibold text-slate-500">{label}</p>
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
          <h2 className="text-base font-bold text-rose-950">{title}</h2>
          <p className="mt-1 max-w-prose text-xs text-rose-800">{errorMessage(error)}</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-rose-700"
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
      <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function InlineError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p className="text-xs font-bold text-rose-600" role="alert">
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
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-700">
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="text-[11px] text-slate-500">{hint}</p> : null}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs font-semibold text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
