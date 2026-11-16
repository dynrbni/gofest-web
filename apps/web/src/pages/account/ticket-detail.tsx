import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Printer, RefreshCw, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import { useDocumentTitle } from '@/lib/hooks';
import { formatDateTime } from '@/lib/format';
import type { TicketPageRecord } from '@/lib/models';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { BrandLogo } from '@/components/common/brand-logo';
import { ErrorState, LoadingState } from '@/components/common/states';
import { TicketStatusBadge } from '@/components/common/status-badge';
import { AccountEventMeta, AccountHeading } from './account-components';

function TicketQr({ url, code }: { url: string; code: string }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const { t } = useLanguage();
  if (state === 'error')
    return (
      <div role="alert">
        <p>{t('QR belum dapat dimuat.', 'The QR could not be loaded.')}</p>
        <button
          className="account-secondary mt-3"
          onClick={() => {
            setAttempt((value) => value + 1);
            setState('loading');
          }}
        >
          {t('Coba lagi', 'Try again')}
        </button>
      </div>
    );
  return (
    <>
      <div className="relative" aria-busy={state === 'loading'}>
        {state === 'loading' ? (
          <span
            role="status"
            className="absolute inset-0 grid place-content-center bg-white text-xs text-slate-600"
          >
            {t('Memuat QR…', 'Loading QR…')}
          </span>
        ) : null}
        <img
          src={`${url}${url.includes('?') ? '&' : '?'}attempt=${attempt}`}
          alt={`QR ${code}`}
          width={400}
          height={400}
          onLoad={() => setState('ready')}
          onError={() => setState('error')}
        />
      </div>
      <p>
        {t(
          'Tunjukkan QR ini kepada petugas saat masuk. Simpan tiket ini untuk dirimu sendiri.',
          'Show this QR to the entry staff. Keep this ticket private.',
        )}
      </p>
    </>
  );
}

export function AccountTicketDetailPage() {
  const { ticketCode } = useParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const client = useQueryClient();
  const [regenerating, setRegenerating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  useDocumentTitle(t('Detail Tiket', 'Ticket Details'));
  const query = useQuery({
    queryKey: ['customer', user?.id, 'ticket', ticketCode],
    enabled: Boolean(user && ticketCode),
    retry: false,
    queryFn: ({ signal }) =>
      api<{ ticket: TicketPageRecord & { qrAvailable: boolean } }>(
        `/account/tickets/${encodeURIComponent(ticketCode!)}`,
        { signal },
      ),
  });
  if (query.isPending) return <LoadingState rows={4} />;
  if (query.isError)
    return (
      <ErrorState
        title={t('Tiket tidak dapat dibuka', 'Ticket unavailable')}
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    );
  const { ticket } = query.data;
  async function regenerate() {
    if (regenerating) return;
    setRegenerating(true);
    setActionError(null);
    try {
      await api(
        `/orders/${encodeURIComponent(ticket.orderCode)}/tickets/${encodeURIComponent(ticket.id)}/qr/regenerate`,
        { method: 'POST' },
      );
      await client.invalidateQueries({ queryKey: ['customer', user?.id] });
      toast.success(
        t(
          'QR baru dibuat. QR lama tidak berlaku.',
          'New QR created. The old QR is no longer valid.',
        ),
      );
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setRegenerating(false);
    }
  }
  return (
    <div className="account-ticket-detail">
      <Link className="account-text-link mb-4 no-print" to="/account/tickets">
        <ArrowLeft size={16} aria-hidden />
        {t('Tiket saya', 'My tickets')}
      </Link>
      <div className="no-print">
        <AccountHeading
          title={t('Detail Tiket', 'Ticket Details')}
          description={t(
            'Tiket digital untuk pengalaman berikutnya.',
            'Your digital event ticket.',
          )}
          action={
            <button className="account-secondary" onClick={() => window.print()}>
              <Printer size={16} aria-hidden />
              {t('Cetak tiket', 'Print ticket')}
            </button>
          }
        />
      </div>
      <article className="account-panel overflow-hidden p-0">
        <header className="border-b border-slate-200 p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <BrandLogo className="h-8" />
            <TicketStatusBadge status={ticket.status} />
          </div>
          <h2>{ticket.event.title}</h2>
          <AccountEventMeta event={ticket.event} />
        </header>
        <div className="account-ticket-detail-body">
          <div className="account-panel">
            <dl className="account-definition">
              <div>
                <dt>{t('Pemilik tiket', 'Ticket holder')}</dt>
                <dd className="text-base font-medium">{ticket.holderName}</dd>
              </div>
              <div>
                <dt>{t('Kategori tiket', 'Ticket category')}</dt>
                <dd>{ticket.ticketType.name}</dd>
              </div>
              <div>
                <dt>{t('Kode unik tiket', 'Unique ticket code')}</dt>
                <dd>
                  <code className="text-base text-[#0052CC]">{ticket.ticketCode}</code>
                </dd>
              </div>
              <div>
                <dt>{t('Nomor pesanan', 'Order number')}</dt>
                <dd>{ticket.orderCode}</dd>
              </div>
              <div>
                <dt>{t('Diterbitkan', 'Issued at')}</dt>
                <dd>{formatDateTime(ticket.issuedAt, ticket.event.timezone)}</dd>
              </div>
            </dl>
            {ticket.checkedInAt ? (
              <p className="account-notice mt-5 flex items-start gap-2">
                <CheckCircle2 size={18} className="mt-1 shrink-0" aria-hidden />
                <span>
                  {t('Sudah check-in', 'Already checked in')}:{' '}
                  {formatDateTime(ticket.checkedInAt, ticket.event.timezone)}.{' '}
                  {t('Tiket tidak dapat digunakan kembali.', 'This ticket cannot be used again.')}
                </span>
              </p>
            ) : null}
            {ticket.event.onlineAccessUrl ? (
              <a
                className="account-text-link mt-5 break-all"
                href={ticket.event.onlineAccessUrl}
                target="_blank"
                rel="noreferrer"
              >
                {t('Buka akses event online', 'Open online event access')}
              </a>
            ) : null}
          </div>
          <div className="account-qr">
            {ticket.qrAvailable ? (
              <TicketQr key={query.dataUpdatedAt} url={ticket.qrUrl} code={ticket.ticketCode} />
            ) : (
              <div className="account-qr-unavailable">
                <ShieldAlert size={30} aria-hidden />
                <p>
                  {ticket.status === 'CHECKED_IN'
                    ? t('Tiket ini sudah digunakan.', 'This ticket has already been used.')
                    : t(
                        'QR masuk tidak tersedia untuk tiket ini. Periksa status dan jadwal event.',
                        'Entry QR is unavailable for this ticket. Check its status and event schedule.',
                      )}
                </p>
              </div>
            )}
          </div>
        </div>
      </article>
      <div className="no-print mt-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          className="account-text-link"
          to={`/account/orders/${encodeURIComponent(ticket.orderCode)}`}
        >
          {t('Detail pesanan', 'Order details')}
        </Link>
        {ticket.qrAvailable ? (
          <ConfirmDialog
            trigger={
              <button className="account-secondary" disabled={regenerating}>
                <RefreshCw size={16} aria-hidden />
                {regenerating
                  ? t('Memperbarui…', 'Updating…')
                  : t('Buat ulang QR', 'Regenerate QR')}
              </button>
            }
            title={t('Buat ulang QR tiket?', 'Regenerate ticket QR?')}
            description={t(
              'QR lama langsung tidak berlaku. Gunakan QR baru saat masuk ke event.',
              'The old QR will stop working immediately. Use the new QR to enter the event.',
            )}
            confirmLabel={t('Buat ulang QR', 'Regenerate QR')}
            cancelLabel={t('Batal', 'Cancel')}
            onConfirm={() => void regenerate()}
          />
        ) : null}
      </div>
      {actionError ? (
        <p className="mt-4 text-sm text-rose-700 no-print" role="alert">
          {actionError}
        </p>
      ) : null}
    </div>
  );
}
