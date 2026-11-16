import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, QrCode } from 'lucide-react';
import { accountTicketQuerySchema } from '@gofest/shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states';
import { TicketStatusBadge } from '@/components/common/status-badge';
import { pageMeta } from '@/lib/queries';
import { useDocumentTitle } from '@/lib/hooks';
import { useLanguage } from '@/lib/language';
import {
  AccountEventMeta,
  AccountHeading,
  AccountPagination,
  AccountPoster,
} from './account-components';
import { AccountFilters } from './account-filters';
import { useAccountTickets } from './account-data';

export function AccountTicketsPage() {
  const { t } = useLanguage();
  useDocumentTitle(t('Tiket Saya', 'My Tickets'));
  const [params, setParams] = useSearchParams();
  const parsed = accountTicketQuerySchema.safeParse({ ...Object.fromEntries(params), limit: 8 });
  const filters = parsed.success ? parsed.data : accountTicketQuerySchema.parse({ limit: 8 });
  const query = useAccountTickets(filters);
  const changePage = (page: number) => {
    const next = new URLSearchParams(params);
    next.set('page', String(page));
    setParams(next);
  };
  const periods = [
    { value: 'upcoming', label: t('Mendatang', 'Upcoming') },
    { value: 'past', label: t('Selesai', 'Past events') },
    { value: 'invalid', label: t('Tidak berlaku', 'Invalid') },
  ];
  return (
    <section aria-busy={query.isFetching}>
      <AccountHeading
        title={t('Tiket Saya', 'My Tickets')}
        description={t(
          'Semua tiket dan pengalaman event kamu, dalam satu tempat.',
          'Your tickets and event experiences, all in one place.',
        )}
      />
      <nav className="account-tabs" aria-label={t('Periode tiket', 'Ticket period')}>
        {periods.map((period) => {
          const next = new URLSearchParams(params);
          next.delete('page');
          next.set('period', period.value);
          return (
            <Link
              to={`?${next}`}
              key={period.value}
              aria-current={filters.period === period.value ? 'page' : undefined}
            >
              {period.label}
            </Link>
          );
        })}
      </nav>
      <AccountFilters searchLabel={t('Nama event', 'Event name')} />
      {!parsed.success ? (
        <p className="account-notice mb-5" role="alert">
          {t(
            'Filter pada tautan tidak valid. Terapkan ulang filter untuk melanjutkan.',
            'The link contains invalid filters. Apply your filters again to continue.',
          )}
        </p>
      ) : null}
      {query.isPending ? (
        <LoadingState rows={3} label={t('Memuat tiket', 'Loading tickets')} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.data.length === 0 ? (
        <EmptyState
          className="account-empty"
          title={t('Belum ada tiket di sini', 'No tickets here yet')}
          description={t(
            'Tiket terbit setelah pembayaran dikonfirmasi. Jika memakai filter, coba ubah pencarian atau tanggal.',
            'Tickets are issued after payment is confirmed. Try changing your search or dates if you have filters applied.',
          )}
          action={
            <Link to="/events" className="account-primary">
              {t('Jelajahi event', 'Explore events')}
              <ArrowRight size={16} aria-hidden />
            </Link>
          }
        />
      ) : (
        <>
          <div className="account-wallet">
            {query.data.data.map((ticket) => (
              <article className="account-wallet-card" key={ticket.id}>
                <AccountPoster event={ticket.event} />
                <div className="account-wallet-content">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <TicketStatusBadge status={ticket.status} />
                    {ticket.event.status === 'CANCELLED' ? (
                      <span className="text-xs text-rose-700">
                        {t('Event dibatalkan', 'Event cancelled')}
                      </span>
                    ) : null}
                  </div>
                  <h2>{ticket.event.title}</h2>
                  <AccountEventMeta event={ticket.event} />
                  <dl className="account-ticket-holder">
                    <div>
                      <dt>{t('Pemilik', 'Holder')}</dt>
                      <dd>{ticket.holderName}</dd>
                    </div>
                    <div>
                      <dt>{t('Kategori', 'Category')}</dt>
                      <dd>{ticket.ticketType.name}</dd>
                    </div>
                    <div>
                      <dt>{t('Kode tiket', 'Ticket code')}</dt>
                      <dd>
                        <code>{ticket.ticketCode}</code>
                      </dd>
                    </div>
                  </dl>
                  <Link
                    to={`/account/tickets/${encodeURIComponent(ticket.ticketCode)}`}
                    className="account-primary"
                  >
                    <QrCode size={17} aria-hidden />
                    {t('Lihat detail tiket', 'View ticket details')}
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <AccountPagination meta={pageMeta(query.data.meta)} onPageChange={changePage} />
        </>
      )}
    </section>
  );
}
