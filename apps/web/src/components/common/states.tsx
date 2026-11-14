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
    <div className={cn('space-y-3', className)} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 border-b border-warm-border py-4">
          <Skeleton className="h-20 w-16 shrink-0 rounded-sm bg-warm-muted" />
          <div className="w-full space-y-2">
            <Skeleton className="h-3 w-24 bg-warm-muted" />
            <Skeleton className="h-5 w-3/4 bg-warm-muted" />
            <Skeleton className="h-3 w-1/2 bg-warm-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageLoading({ label = 'Memuat halaman' }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4" role="status">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-warm-border border-t-vermilion" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  title = 'Data tidak dapat dimuat',
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <div
      className={cn('border border-warm-border bg-card px-5 py-6', className)}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-brick" aria-hidden />
        <div>
          <h2 className="text-base font-bold">{title}</h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">{errorMessage(error)}</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 inline-flex items-center gap-2 rounded-md border border-ink px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-ink hover:text-paper"
            >
              <RotateCw className="h-4 w-4" aria-hidden />
              Coba lagi
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
        'border border-dashed border-warm-border bg-card/60 px-6 py-10 text-center',
        className,
      )}
    >
      <h2 className="font-display text-2xl tracking-tightest">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function InlineError({ error }: { error: unknown }) {
  return (
    <p className="text-sm font-medium text-brick" role="alert">
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
      <label htmlFor={htmlFor} className="block text-sm font-semibold">
        {label}
        {required ? <span className="text-brick"> *</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs font-semibold text-brick">
          {error}
        </p>
      ) : null}
    </div>
  );
}