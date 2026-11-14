import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '@gofest/shared';
import { cn } from '@/lib/utils';

export function Pagination({
  meta,
  onPageChange,
  className,
}: {
  meta: PaginationMeta | null | undefined;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (!meta || meta.totalPages <= 1) return null;
  const pages: number[] = [];
  const start = Math.max(1, meta.page - 1);
  const end = Math.min(meta.totalPages, meta.page + 1);
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (!pages.includes(1)) pages.unshift(1);
  if (!pages.includes(meta.totalPages)) pages.push(meta.totalPages);

  return (
    <nav className={cn('flex flex-wrap items-center justify-between gap-3', className)} aria-label="Navigasi halaman">
      <p className="text-xs text-muted-foreground tabular-nums">
        Halaman {meta.page} dari {meta.totalPages} · {meta.total} data
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(meta.page - 1)}
          disabled={meta.page <= 1}
          className="inline-flex h-8 items-center gap-1 rounded-sm border border-warm-border px-2 text-sm font-semibold disabled:opacity-40"
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Sebelumnya
        </button>
        {pages.map((page, index) => {
          const previous = pages[index - 1];
          const gap = previous !== undefined && page - previous > 1;
          return (
            <span key={page} className="flex items-center gap-1">
              {gap ? <span className="px-1 text-xs text-muted-foreground">…</span> : null}
              <button
                type="button"
                onClick={() => onPageChange(page)}
                aria-current={page === meta.page ? 'page' : undefined}
                className={cn(
                  'h-8 min-w-8 rounded-sm border px-2 text-sm font-semibold tabular-nums',
                  page === meta.page
                    ? 'border-ink bg-ink text-paper'
                    : 'border-warm-border hover:bg-warm-muted',
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
          className="inline-flex h-8 items-center gap-1 rounded-sm border border-warm-border px-2 text-sm font-semibold disabled:opacity-40"
          aria-label="Halaman berikutnya"
        >
          Berikutnya
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </nav>
  );
}