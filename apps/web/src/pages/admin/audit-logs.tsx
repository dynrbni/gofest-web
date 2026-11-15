import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { apiPage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useDebouncedValue, useDocumentTitle } from '@/lib/hooks';
import type { AuditLog } from '@/lib/models';
import { pageMeta } from '@/lib/queries';
import { Pagination } from '@/components/common/pagination';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states';

export function AdminAuditLogsPage() {
  useDocumentTitle('Audit Log · Super Admin');
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const initialAction = searchParams.get('action') ?? '';
  const [actionFilter, setActionFilter] = useState(initialAction);
  const debouncedAction = useDebouncedValue(actionFilter, 400);

  const logsQuery = useQuery({
    queryKey: ['admin-audit-logs', page, debouncedAction],
    queryFn: () =>
      apiPage<AuditLog>('/admin/audit-logs', {
        query: { page, limit: 15, action: debouncedAction.trim() || undefined },
      }),
  });

  const logs = logsQuery.data?.data ?? [];
  const meta = pageMeta(logsQuery.data?.meta);

  function setPage(newPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(newPage));
    setSearchParams(next);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-warm-border pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tightest">Audit Log Sistem</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Riwayat tercatat untuk seluruh aksi administratif dan perubahan sensitif di platform
          </p>
        </div>

        <div className="relative w-full max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              const next = new URLSearchParams(searchParams);
              next.delete('page');
              if (e.target.value.trim()) next.set('action', e.target.value.trim());
              else next.delete('action');
              setSearchParams(next);
            }}
            placeholder="Filter aksi (misal: review, update)..."
            className="h-9 w-full rounded-md border border-ink/20 bg-card pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ink"
          />
        </div>
      </div>

      {logsQuery.isLoading ? (
        <LoadingState rows={5} label="Memuat audit log" />
      ) : logsQuery.isError ? (
        <ErrorState error={logsQuery.error} onRetry={() => void logsQuery.refetch()} />
      ) : logs.length === 0 ? (
        <EmptyState
          title="Belum ada audit log"
          description={
            debouncedAction
              ? 'Tidak ada log yang cocok dengan filter pencarian aksi.'
              : 'Belum ada catatan aksi sensitif yang terekam di sistem.'
          }
        />
      ) : (
        <div className="space-y-4">
          <div
            tabIndex={0}
            role="region"
            aria-label="Log aktivitas platform"
            className="overflow-x-auto rounded-md border border-warm-border bg-card"
          >
            <table className="w-full text-left text-xs">
              <thead className="border-b border-warm-border bg-warm-muted/40 font-semibold text-ink">
                <tr>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Aktor (Admin)</th>
                  <th className="px-4 py-3">Aksi</th>
                  <th className="px-4 py-3">Target Resource</th>
                  <th className="px-4 py-3">Metadata Perubahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-border text-ink">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-warm-muted/20">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {log.actor ? (
                        <div>
                          <p className="font-semibold text-ink">{log.actor.name}</p>
                          <p className="text-[11px] text-muted-foreground">{log.actor.email}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Sistem</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-warm-muted px-2 py-0.5 font-mono text-[11px] font-bold text-ink">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{log.resourceType}</p>
                      {log.resourceId ? (
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {log.resourceId}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate font-mono text-[11px] text-muted-foreground">
                      {log.metadata ? JSON.stringify(log.metadata) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination meta={meta} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
