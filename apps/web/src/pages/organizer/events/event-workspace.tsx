import { NavLink, Outlet, useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Ticket,
  Tag,
  Users,
  QrCode,
  Send,
  Ban,
  ExternalLink,
  Info,
} from 'lucide-react';
import { useOrganizerEvent } from '@/lib/queries';
import { api, errorMessage } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import { EventStatusBadge } from '@/components/common/status-badge';
import { ErrorState, LoadingState } from '@/components/common/states';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { cn } from '@/lib/utils';

export function EventWorkspaceLayout() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const eventQuery = useOrganizerEvent(id);
  const event = eventQuery.data?.event;

  useDocumentTitle(event ? `Kelola ${event.title}` : 'Kelola Acara');

  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  if (eventQuery.isLoading) {
    return <LoadingState rows={4} label="Memuat data acara" />;
  }

  if (eventQuery.isError || !event) {
    return (
      <ErrorState
        error={eventQuery.error ?? new Error('Acara tidak ditemukan')}
        onRetry={() => void eventQuery.refetch()}
      />
    );
  }

  const navTabs = [
    { to: `/organizer/events/${id}/edit`, label: 'Informasi Acara', icon: Info, end: true },
    { to: `/organizer/events/${id}/tickets`, label: 'Jenis Tiket', icon: Ticket, end: false },
    { to: `/organizer/events/${id}/coupons`, label: 'Kode Kupon', icon: Tag, end: false },
    { to: `/organizer/events/${id}/orders`, label: 'Pesanan & Peserta', icon: Users, end: false },
    { to: `/organizer/events/${id}/staff`, label: 'Petugas Staff', icon: Users, end: false },
    { to: `/organizer/events/${id}/check-in`, label: 'Check-In', icon: QrCode, end: false },
  ];

  async function handleSubmitReview() {
    setSubmitting(true);
    try {
      await api(`/organizer/events/${id}/submit`, { method: 'POST' });
      await queryClient.invalidateQueries({ queryKey: ['organizer-event', id] });
      await queryClient.invalidateQueries({ queryKey: ['organizer-events'] });
      toast.success('Acara berhasil diajukan untuk publikasi!');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelEvent() {
    if (!cancelReason.trim()) {
      toast.error('Alasan pembatalan wajib diisi');
      return;
    }
    setCancelling(true);
    try {
      await api(`/organizer/events/${id}/cancel`, {
        method: 'POST',
        body: { reason: cancelReason.trim() },
      });
      await queryClient.invalidateQueries({ queryKey: ['organizer-event', id] });
      await queryClient.invalidateQueries({ queryKey: ['organizer-events'] });
      toast.success('Acara telah dibatalkan');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/organizer/events"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Kembali ke daftar acara
        </Link>

        <div className="mt-3 flex flex-col justify-between gap-4 border-b border-warm-border pb-6 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <EventStatusBadge status={event.status} />
              <span className="text-xs font-semibold uppercase tracking-wider text-olive">
                {event.category?.name}
              </span>
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tightest sm:text-3xl">
              {event.title}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Slug: /events/{event.slug}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {event.status === 'PUBLISHED' ? (
              <Link
                to={`/events/${event.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-warm-border bg-paper px-3 py-1.5 text-xs font-semibold text-ink hover:bg-warm-muted"
              >
                Lihat Acara
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : null}

            {event.status === 'DRAFT' || event.status === 'REJECTED' ? (
              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-md bg-brick px-3.5 py-1.5 text-xs font-semibold text-paper hover:bg-brick/90 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" aria-hidden />
                {submitting ? 'Mengajukan...' : 'Ajukan Publikasi'}
              </button>
            ) : null}

            {event.status === 'PUBLISHED' ? (
              <ConfirmDialog
                trigger={
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-md border border-brick/40 px-3 py-1.5 text-xs font-semibold text-brick hover:bg-brick/10"
                  >
                    <Ban className="h-3.5 w-3.5" aria-hidden />
                    Batalkan Acara
                  </button>
                }
                title="Batalkan Acara Ini?"
                description={
                  <div className="space-y-3">
                    <p>
                      Acara yang dibatalkan akan ditutup penjualannya. Pembeli yang memegang tiket valid
                      akan diberi tahu untuk proses pengembalian dana (refund).
                    </p>
                    <div>
                      <label htmlFor="cancel-reason-input" className="block text-xs font-semibold text-ink">
                        Alasan pembatalan (wajib diisi):
                      </label>
                      <input
                        id="cancel-reason-input"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Contoh: Kondisi cuaca ekstrem / kendala operasional"
                        className="mt-1 h-9 w-full rounded border border-ink/20 bg-card px-3 text-xs outline-none"
                      />
                    </div>
                  </div>
                }
                confirmLabel={cancelling ? 'Membatalkan...' : 'Ya, Batalkan Acara'}
                destructive
                onConfirm={handleCancelEvent}
              />
            ) : null}
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="mt-4 flex flex-wrap gap-1.5 border-b border-warm-border pb-3" aria-label="Menu kelola acara">
          {navTabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                  isActive
                    ? 'bg-ink text-paper'
                    : 'bg-warm-muted/60 text-ink/75 hover:bg-warm-muted hover:text-ink',
                )
              }
            >
              <tab.icon className="h-3.5 w-3.5" aria-hidden />
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div>
        <Outlet context={{ event }} />
      </div>
    </div>
  );
}
