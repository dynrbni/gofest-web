import type { ReactNode } from 'react';
import { ErrorState, PageLoading, EmptyState } from '@/components/common/states';
import { cn } from '@/lib/utils';

export function WorkspaceHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Panel({
  title,
  description,
  children,
  action,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('min-w-0 rounded-xl border border-slate-200 bg-white', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
export function Metric({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-3 break-words text-2xl font-semibold tabular-nums tracking-tight text-slate-950">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs leading-5 text-slate-600">{hint}</p> : null}
    </div>
  );
}
export function DataTable({
  headers,
  children,
  caption,
}: {
  headers: string[];
  children: ReactNode;
  caption: string;
}) {
  return (
    <div
      className="relative max-w-full overflow-x-auto rounded-lg border border-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
      tabIndex={0}
      role="region"
      aria-label={caption}
    >
      <table className="w-full whitespace-nowrap text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-slate-50 text-xs text-slate-600">
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col" className="px-4 py-3 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 [&_td]:px-4 [&_td]:py-3">{children}</tbody>
      </table>
    </div>
  );
}
export function Status({ value }: { value: string }) {
  const style = [
    'PAID',
    'APPROVED',
    'COMPLETED',
    'PUBLISHED',
    'ACTIVE',
    'VALID',
    'RESOLVED',
  ].includes(value)
    ? 'bg-emerald-50 text-emerald-800'
    : ['REJECTED', 'FAILED', 'CANCELLED', 'INVALID', 'SUSPENDED'].includes(value)
      ? 'bg-rose-50 text-rose-800'
      : 'bg-slate-100 text-slate-700';
  return (
    <span className={cn('inline-flex rounded-md px-2 py-1 text-xs font-medium', style)}>
      {value.replaceAll('_', ' ')}
    </span>
  );
}
export function QueryState({
  query,
  empty,
  children,
}: {
  query: { isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown };
  empty?: boolean;
  children: ReactNode;
}) {
  if (query.isLoading) return <PageLoading label="Memuat konten halaman" />;
  if (query.isError)
    return (
      <ErrorState
        error={query.error}
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  if (empty)
    return (
      <EmptyState
        title="Belum ada data"
        description="Data akan muncul setelah aktivitas tercatat pada sistem."
      />
    );
  return <>{children}</>;
}
