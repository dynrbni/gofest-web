import { CalendarDays, MapPin, QrCode } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states';
import { Pagination } from '@/components/common/pagination';
import { TicketStatusBadge } from '@/components/common/status-badge';
import { formatEventWhen } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { useLanguage } from '@/lib/language';
import { pageMeta, useAccountOrders } from '@/lib/queries';

export function AccountTicketsPage() {
  const { t } = useLanguage();
  useDocumentTitle(t('Tiket Saya', 'My Tickets'));
  const [params, setParams] = useSearchParams();
  const requestedPage = Number(params.get('page') ?? 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const query = useAccountOrders(page, 10, 'PAID');
  const orders = query.data?.data ?? [];

  return (
    <section
      aria-labelledby="my-tickets-heading"
      className="space-y-6"
      aria-busy={query.isFetching}
    >
      <div>
        <h2 id="my-tickets-heading" className="text-xl font-semibold tracking-tight">
          {t('Tiket Saya', 'My Tickets')}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {t(
            'Tiket digital dari transaksi yang sudah lunas.',
            'Digital tickets from your paid transactions.',
          )}
        </p>
      </div>
      {query.isLoading ? (
        <LoadingState rows={3} label={t('Memuat tiket', 'Loading tickets')} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : orders.length === 0 ? (
        <EmptyState
          title={t('Belum ada tiket', 'No tickets yet')}
          description={t(
            'Tiket akan muncul di sini setelah pembayaran transaksimu dikonfirmasi.',
            'Your tickets will appear here once payment is confirmed.',
          )}
          action={
            <Link to={page > 1 ? '/account/tickets' : '/account/orders'} className="text-link">
              {page > 1
                ? t('Kembali ke halaman pertama', 'Back to the first page')
                : t('Lihat Transaksi Saya', 'View My Transactions')}
            </Link>
          }
        />
      ) : (
        <>
          {orders.map((order) => (
            <article
              key={order.id}
              className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
            >
              <h3 className="break-words text-lg font-semibold">
                <Link
                  to={`/events/${order.event.slug}`}
                  className="hover:text-blue-700 hover:underline"
                >
                  {order.event.title}
                </Link>
              </h3>
              <p className="mt-3 flex items-start gap-2 text-sm text-slate-600">
                <CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden />
                {formatEventWhen(order.event.startsAt, order.event.endsAt, order.event.timezone)}
              </p>
              <p className="mt-2 flex items-start gap-2 text-sm text-slate-600">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                {order.event.type === 'ONLINE'
                  ? t('Acara online', 'Online event')
                  : [order.event.venueName, order.event.city].filter(Boolean).join(', ')}
              </p>
              {order.tickets.length === 0 ? (
                <p role="status" className="mt-5 text-sm text-slate-600">
                  {t('Tiket sedang diproses.', 'Your tickets are being prepared.')}
                </p>
              ) : (
                <ul className="mt-5 divide-y divide-slate-100 border-t border-slate-100">
                  {order.tickets.map((ticket) => (
                    <li
                      key={ticket.id}
                      className="flex flex-wrap items-center justify-between gap-4 py-4"
                    >
                      <div className="min-w-0 space-y-2">
                        <p className="break-words text-sm font-medium">{ticket.holderName}</p>
                        <p className="break-all font-mono text-xs text-slate-600">
                          {ticket.ticketCode}
                        </p>
                        <TicketStatusBadge status={ticket.status} />
                      </div>
                      <Link
                        to={`/ticket/${encodeURIComponent(ticket.ticketCode)}`}
                        className="text-link min-h-11"
                      >
                        <QrCode className="size-4" aria-hidden /> {t('Buka tiket', 'Open ticket')}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link to={`/account/orders/${order.id}`} className="text-link mt-3 min-h-11 text-sm">
                {t('Detail transaksi', 'Transaction details')}
              </Link>
            </article>
          ))}
          <Pagination
            meta={pageMeta(query.data?.meta)}
            onPageChange={(nextPage) => setParams(nextPage > 1 ? { page: String(nextPage) } : {})}
          />
        </>
      )}
    </section>
  );
}
