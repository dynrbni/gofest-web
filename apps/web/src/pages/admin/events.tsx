import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, Calendar, MapPin, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { api, apiPage, errorMessage } from '@/lib/api';
import { formatDateTime, formatEventWhen } from '@/lib/format';
import { useDebouncedValue, useDocumentTitle } from '@/lib/hooks';
import type { EventSummary } from '@/lib/models';
import { pageMeta } from '@/lib/queries';
import { EventStatusBadge } from '@/components/common/status-badge';
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

export function AdminEventsPage() {
  useDocumentTitle('Moderasi Acara · Super Admin');
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const initialQ = searchParams.get('q') ?? '';
  const [search, setSearch] = useState(initialQ);
  const debouncedSearch = useDebouncedValue(search, 400);

  // Review modal state
  const [reviewModal, setReviewModal] = useState<{
    event: EventSummary;
    action: 'PUBLISHED' | 'REJECTED';
  } | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const eventsQuery = useQuery({
    queryKey: ['admin-events', page, debouncedSearch],
    queryFn: () =>
      apiPage<EventSummary>('/admin/events', {
        query: { page, limit: 10, q: debouncedSearch.trim() || undefined },
      }),
  });

  const events = eventsQuery.data?.data ?? [];
  const meta = pageMeta(eventsQuery.data?.meta);

  function setPage(newPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(newPage));
    setSearchParams(next);
  }

  async function handleConfirmReview() {
    if (!reviewModal) return;
    const { event, action } = reviewModal;

    if (action === 'REJECTED' && !reviewNote.trim()) {
      toast.error('Alasan penolakan wajib diisi');
      return;
    }

    setSubmitting(true);
    try {
      await api(`/admin/events/${event.id}/review`, {
        method: 'PATCH',
        body: {
          status: action,
          note: reviewNote.trim() || undefined,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-events'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      toast.success(
        action === 'PUBLISHED'
          ? 'Acara berhasil disetujui & dipublikasikan'
          : 'Acara ditolak',
      );
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
          <h1 className="font-display text-3xl font-bold tracking-tightest">Moderasi Acara</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Tinjau konten dan publikasi acara yang diajukan oleh penyelenggara di Gofest
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
            placeholder="Cari judul acara..."
            className="h-9 w-full rounded-md border border-ink/20 bg-card pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ink"
          />
        </div>
      </div>

      {eventsQuery.isLoading ? (
        <LoadingState rows={4} label="Memuat acara platform" />
      ) : eventsQuery.isError ? (
        <ErrorState error={eventsQuery.error} onRetry={() => void eventsQuery.refetch()} />
      ) : events.length === 0 ? (
        <EmptyState
          title="Tidak ada acara ditemukan"
          description={
            debouncedSearch
              ? 'Tidak ada acara yang cocok dengan kata kunci pencarian.'
              : 'Belum ada acara di platform.'
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-md border border-warm-border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-warm-border bg-warm-muted/40 font-semibold text-ink">
                <tr>
                  <th className="px-4 py-3">Judul Acara</th>
                  <th className="px-4 py-3">Penyelenggara</th>
                  <th className="px-4 py-3">Jadwal</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi Moderasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-border text-ink">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-warm-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-bold text-ink">{event.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {event.category?.name ?? 'Umum'} · /events/{event.slug}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {event.organizer?.organizationName ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatEventWhen(event.startsAt, event.endsAt, event.timezone)}
                    </td>
                    <td className="px-4 py-3">
                      <EventStatusBadge status={event.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {event.status === 'PUBLISHED' ? (
                          <Link
                            to={`/events/${event.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-ink mr-2"
                          >
                            Buka
                            <ExternalLink className="h-3 w-3" aria-hidden />
                          </Link>
                        ) : null}

                        {event.status === 'PENDING_REVIEW' || event.status === 'DRAFT' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setReviewModal({ event, action: 'PUBLISHED' });
                                setReviewNote('');
                              }}
                              className="rounded bg-olive px-2.5 py-1 text-[11px] font-semibold text-paper hover:bg-olive/90"
                            >
                              Publikasikan
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReviewModal({ event, action: 'REJECTED' });
                                setReviewNote('');
                              }}
                              className="rounded border border-brick px-2.5 py-1 text-[11px] font-semibold text-brick hover:bg-brick/10"
                            >
                              Tolak
                            </button>
                          </>
                        ) : null}
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
              {reviewModal?.action === 'PUBLISHED'
                ? 'Setujui & Publikasikan Acara'
                : 'Tolak Pengajuan Acara'}
            </DialogTitle>
            <DialogDescription>
              Acara: <strong>{reviewModal?.event.title}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <Field
              label="Catatan Moderasi"
              htmlFor="eventReviewNote"
              hint={
                reviewModal?.action === 'PUBLISHED'
                  ? 'Opsional, catatan persetujuan untuk audit trail'
                  : 'Wajib diisi, alasan penolakan agar organizer dapat memperbaiki'
              }
              required={reviewModal?.action === 'REJECTED'}
            >
              <Input
                id="eventReviewNote"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Tuliskan catatan..."
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setReviewModal(null)}>
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleConfirmReview}
                disabled={submitting}
                className={reviewModal?.action === 'REJECTED' ? 'bg-brick hover:bg-brick/90' : ''}
              >
                {submitting ? 'Menyimpan...' : 'Konfirmasi'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
