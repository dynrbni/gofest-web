import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, Ban, CheckCircle } from 'lucide-react';
import { api, apiPage, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useDebouncedValue, useDocumentTitle } from '@/lib/hooks';
import type { AdminUser } from '@/lib/models';
import { pageMeta } from '@/lib/queries';
import { Pagination } from '@/components/common/pagination';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states';
import { ConfirmDialog } from '@/components/common/confirm-dialog';

export function AdminUsersPage() {
  useDocumentTitle('Kelola Pengguna · Super Admin');
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const initialQ = searchParams.get('q') ?? '';
  const [search, setSearch] = useState(initialQ);
  const debouncedSearch = useDebouncedValue(search, 400);

  const usersQuery = useQuery({
    queryKey: ['admin-users', page, debouncedSearch],
    queryFn: () =>
      apiPage<AdminUser>('/admin/users', {
        query: { page, limit: 10, q: debouncedSearch.trim() || undefined },
      }),
  });

  const users = usersQuery.data?.data ?? [];
  const meta = pageMeta(usersQuery.data?.meta);

  function setPage(newPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(newPage));
    setSearchParams(next);
  }

  async function handleToggleStatus(userId: string, nextStatus: 'ACTIVE' | 'SUSPENDED') {
    try {
      await api(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: { status: nextStatus },
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(`Status pengguna diubah menjadi ${nextStatus}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-warm-border pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tightest">Pengguna Platform</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Cari dan kelola status akun pengguna terdaftar di seluruh Gofest
          </p>
        </div>

        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              const next = new URLSearchParams(searchParams);
              next.delete('page');
              if (e.target.value.trim()) next.set('q', e.target.value.trim());
              else next.delete('q');
              setSearchParams(next);
            }}
            placeholder="Cari nama atau email pengguna..."
            className="h-9 w-full rounded-md border border-ink/20 bg-card pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ink"
          />
        </div>
      </div>

      {usersQuery.isLoading ? (
        <LoadingState rows={4} label="Memuat pengguna" />
      ) : usersQuery.isError ? (
        <ErrorState error={usersQuery.error} onRetry={() => void usersQuery.refetch()} />
      ) : users.length === 0 ? (
        <EmptyState
          title="Tidak ada pengguna ditemukan"
          description={
            debouncedSearch
              ? 'Tidak ada akun yang sesuai dengan kata kunci pencarian.'
              : 'Belum ada akun pengguna terdaftar di sistem.'
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-md border border-warm-border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-warm-border bg-warm-muted/40 font-semibold text-ink">
                <tr>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Peran / Roles</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Tanggal Daftar</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-border text-ink">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-warm-muted/20">
                    <td className="px-4 py-3 font-bold">{user.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <span className="rounded bg-warm-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">
                          {user.role}
                        </span>
                        {user.organizerProfile ? (
                          <span className="rounded bg-olive/15 text-olive px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            ORGANIZER
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          user.status === 'ACTIVE'
                            ? 'bg-olive/15 text-olive'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {user.status === 'ACTIVE' ? (
                        <ConfirmDialog
                          trigger={
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brick hover:underline"
                            >
                              <Ban className="h-3 w-3" aria-hidden />
                              Suspend
                            </button>
                          }
                          title="Suspend Akun Pengguna?"
                          description={`Akun ${user.email} tidak akan dapat login atau melakukan pemesanan tiket baru.`}
                          confirmLabel="Ya, Suspend Akun"
                          destructive
                          onConfirm={() => handleToggleStatus(user.id, 'SUSPENDED')}
                        />
                      ) : (
                        <ConfirmDialog
                          trigger={
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-olive hover:underline"
                            >
                              <CheckCircle className="h-3 w-3" aria-hidden />
                              Aktifkan
                            </button>
                          }
                          title="Aktifkan Kembali Akun?"
                          description={`Buka blokir dan izinkan ${user.email} untuk login kembali.`}
                          confirmLabel="Aktifkan Akun"
                          onConfirm={() => handleToggleStatus(user.id, 'ACTIVE')}
                        />
                      )}
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
