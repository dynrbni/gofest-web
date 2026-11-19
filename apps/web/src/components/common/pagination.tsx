import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '@gofest/shared';
import { cn } from '@/lib/utils';

export function Pagination({
  meta,
  onPageChange,
  className,
  itemLabel = 'entri',
}: {
  meta: PaginationMeta | null | undefined;
  onPageChange: (page: number) => void;
  className?: string;
  itemLabel?: string;
}) {
  if (!meta || meta.totalPages <= 1) return null;
  const pages: number[] = [];
  const start = Math.max(1, meta.page - 1);
  const end = Math.min(meta.totalPages, meta.page + 1);
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (!pages.includes(1)) pages.unshift(1);
  if (!pages.includes(meta.totalPages)) pages.push(meta.totalPages);

  return (
    <nav
      className={cn('flex flex-wrap items-center justify-between gap-3', className)}
      aria-label="Navigasi halaman"
    >
      <p className="text-xs font-medium text-slate-500 tabular-nums">
        Halaman {meta.page} dari {meta.totalPages} · Total {meta.total} {itemLabel}
      </p>
      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(meta.page - 1)}
          disabled={meta.page <= 1}
          className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 px-2 sm:px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-40"
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Sebelumnya</span>
        </button>
        {pages.map((page, index) => {
          const previous = pages[index - 1];
          const gap = previous !== undefined && page - previous > 1;
          return (
            <span key={page} className="flex items-center gap-1">
              {gap ? <span className="px-1 text-xs text-slate-400">…</span> : null}
              <button
                type="button"
                onClick={() => onPageChange(page)}
                aria-current={page === meta.page ? 'page' : undefined}
                className={cn(
                  'h-9 min-w-9 rounded-xl border px-2 sm:px-3 text-xs font-medium tabular-nums transition-colors',
                  page === meta.page
                    ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100',
                )}
              >
                {page}
              </button>
            </span>
          );
        })}
        <button
          type="button"
          onClick={() => onPageChange(meta.page + 1)}
          disabled={meta.page >= meta.totalPages}
          className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 px-2 sm:px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-40"
          aria-label="Halaman berikutnya"
        >
          <span className="hidden sm:inline">Berikutnya</span>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </nav>
  );
}
