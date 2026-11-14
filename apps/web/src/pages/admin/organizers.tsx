import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { api, apiPage, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useDebouncedValue, useDocumentTitle } from '@/lib/hooks';
import type { AdminOrganizer } from '@/lib/models';
import { pageMeta } from '@/lib/queries';
import { Pagination } from '@/components/common/pagination';
import { EmptyState, ErrorState, Field, LoadingState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export function AdminOrganizersPage() {
  useDocumentTitle('Moderasi Organizer · Super Admin');
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const initialQ = searchParams.get('q') ?? '';
  const [search, setSearch] = useState(initialQ);
  const debouncedSearch = useDebouncedValue(search, 400);

  // Review modal state
  const [reviewModal, setReviewModal] = useState<{
    organizer: AdminOrganizer;
    action: 'ACTIVE' | 'REJECTED' | 'SUSPENDED';
  } | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const organizersQuery = useQuery({
    queryKey: ['admin-organizers', page, debouncedSearch],
    queryFn: () =>
      apiPage<AdminOrganizer>('/admin/organizers', {
        query: { page, limit: 10, q: debouncedSearch.trim() || undefined },
      }),
  });

  const organizers = organizersQuery.data?.data ?? [];
  const meta = pageMeta(organizersQuery.data?.meta);

  function setPage(newPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(newPage));
    setSearchParams(next);
  }

  async function handleSubmitReview() {
    if (!reviewModal) return;
    const { organizer, action } = reviewModal;

    if ((action === 'REJECTED' || action === 'SUSPENDED') && !reviewNote.trim()) {
      toast.error('Alasan wajib diisi untuk penolakan atau penangguhan');
      return;
    }

    setSubmitting(true);
    try {
      await api(`/admin/organizers/${organizer.id}/status`, {
        method: 'PATCH',
        body: {
          status: action,
          note: reviewNote.trim() || undefined,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-organizers'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      toast.success(`Status organizer diperbarui menjadi ${action}`);
      setReviewModal(null);
      setReviewNote('');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-warm-border pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tightest">Moderasi Penyelenggara (Organizer)</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Verifikasi dan review profil organizer sebelum mereka dapat menerbitkan acara ke publik
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
            placeholder="Cari nama organisasi atau slug..."
            className="h-9 w-full rounded-md border border-ink/20 bg-card pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ink"
          />
        </div>
      </div>

      {organizersQuery.isLoading ? (
        <LoadingState rows={4} label="Memuat organizer" />
      ) : organizersQuery.isError ? (
        <ErrorState error={organizersQuery.error} onRetry={() => void organizersQuery.refetch()} />
      ) : organizers.length === 0 ? (
        <EmptyState
          title="Tidak ada organizer ditemukan"
          description={
            debouncedSearch
              ? 'Tidak ada organizer yang sesuai dengan kata kunci pencarian.'
              : 'Belum ada organizer yang mendaftar di platform.'
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-md border border-warm-border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-warm-border bg-warm-muted/40 font-semibold text-ink">
                <tr>
                  <th className="px-4 py-3">Organisasi</th>
                  <th className="px-4 py-3">Pemilik / Akun</th>
                  <th className="px-4 py-3 text-center">Acara</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Tanggal Daftar</th>
                  <th className="px-4 py-3 text-right">Moderasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-border text-ink">
                {organizers.map((org) => (
                  <tr key={org.id} className="hover:bg-warm-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-bold text-ink">{org.organizationName}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">/organizers/{org.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{org.user?.name ?? '-'}</p>
                      <p className="text-[11px] text-muted-foreground">{org.user?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-center font-bold tabular-nums">
                      {org._count?.events ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          org.status === 'ACTIVE'
                            ? 'bg-olive/15 text-olive'
                            : org.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-red-100 text-red-900'
                        }`}
                      >
                        {org.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(org.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {org.status === 'PENDING' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setReviewModal({ organizer: org, action: 'ACTIVE' });
                                setReviewNote('');
                              }}
                              className="rounded bg-olive px-2 py-1 text-[11px] font-semibold text-paper hover:bg-olive/90"
                            >
                              Setujui
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReviewModal({ organizer: org, action: 'REJECTED' });
                                setReviewNote('');
                              }}
                              className="rounded border border-brick px-2 py-1 text-[11px] font-semibold text-brick hover:bg-brick/10"
                            >
                              Tolak
                            </button>
                          </>
                        ) : org.status === 'ACTIVE' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setReviewModal({ organizer: org, action: 'SUSPENDED' });
                              setReviewNote('');
                            }}
                            className="text-[11px] font-semibold text-brick hover:underline"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setReviewModal({ organizer: org, action: 'ACTIVE' });
                              setReviewNote('');
                            }}
                            className="text-[11px] font-semibold text-olive hover:underline"
                          >
                            Aktifkan Kembali
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination meta={meta} onPageChange={setPage} />
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={Boolean(reviewModal)} onOpenChange={(open) => !open && setReviewModal(null)}>
        <DialogContent className="max-w-md bg-paper border-warm-border">
          <DialogHeader>
            <DialogTitle>
              {reviewModal?.action === 'ACTIVE'
                ? 'Setujui Organizer'
                : reviewModal?.action === 'REJECTED'
                ? 'Tolak Pengajuan Organizer'
                : 'Suspend Akun Organizer'}
            </DialogTitle>
            <DialogDescription>
              Organisasi: <strong>{reviewModal?.organizer.organizationName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <Field
              label="Catatan / Alasan Moderasi"
              htmlFor="reviewNote"
              hint={
                reviewModal?.action === 'ACTIVE'
                  ? 'Opsional, catatan persetujuan untuk audit log'
                  : 'Wajib diisi, alasan penolakan/penangguhan akan dikirim dan dicatat'
              }
              required={reviewModal?.action !== 'ACTIVE'}
            >
              <Input
                id="reviewNote"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Tuliskan alasan..."
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setReviewModal(null)}>
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleSubmitReview}
                disabled={submitting}
                className={reviewModal?.action !== 'ACTIVE' ? 'bg-brick hover:bg-brick/90' : ''}
              >
                {submitting ? 'Menyimpan...' : 'Konfirmasi Status'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
