import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Heart,
  ReceiptText,
  Ticket,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import { useDocumentTitle } from '@/lib/hooks';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states';
import { EventCard } from '@/components/common/event-presentation';
import { TicketStatusBadge } from '@/components/common/status-badge';
import {
  AccountAvatar,
  AccountEventMeta,
  AccountHeading,
  AccountPoster,
  AccountSectionHeading,
} from './account-components';
import { useAccountDashboard, useAccountRecommendations } from './account-data';

export function AccountOverviewPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  useDocumentTitle('Dashboard');
  const query = useAccountDashboard();
  const recommendations = useAccountRecommendations();
  const hour = new Date().getHours();
  const greeting =
    hour < 11
      ? t('Selamat pagi', 'Good morning')
      : hour < 15
        ? t('Selamat siang', 'Good afternoon')
        : hour < 18
          ? t('Selamat sore', 'Good afternoon')
          : t('Selamat malam', 'Good evening');
  const shortcuts = [
    { to: '/account/tickets', label: t('Tiket Saya', 'My Tickets'), icon: Ticket },
    { to: '/account/orders', label: t('Riwayat Pesanan', 'Order History'), icon: ReceiptText },
    { to: '/account/favorites', label: t('Event Favorit', 'Favorite Events'), icon: Heart },
    { to: '/account/profile', label: t('Edit Profil', 'Edit Profile'), icon: UserRound },
  ];
  return (
    <>
      <AccountHeading
        title={`${greeting}, ${user?.name.split(' ')[0] ?? ''}!`}
        description={t(
          'Siap untuk pengalaman event berikutnya?',
          'Ready for your next event experience?',
        )}
        action={<AccountAvatar name={user?.name ?? ''} />}
      />
      {query.isPending ? (
        <LoadingState rows={3} label={t('Memuat aktivitas akun', 'Loading account activity')} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          <section
            className="account-statistics"
            aria-label={t('Ringkasan aktivitas', 'Activity summary')}
          >
            {[
              {
                label: t('Total tiket', 'Total tickets'),
                value: query.data.summary.totalTickets,
                icon: Ticket,
              },
              {
                label: t('Event mendatang', 'Upcoming events'),
                value: query.data.summary.upcomingEvents,
                icon: CalendarDays,
              },
              {
                label: t('Total pesanan', 'Total orders'),
                value: query.data.summary.totalOrders,
                icon: ReceiptText,
              },
            ].map((stat) => (
              <div key={stat.label} className="account-stat">
                <span className="account-stat-icon">
                  <stat.icon size={22} aria-hidden />
                </span>
                <div>
                  <p>{stat.label}</p>
                  <strong>{stat.value.toLocaleString()}</strong>
                </div>
              </div>
            ))}
          </section>
          <section
            className="account-section"
            aria-label={t('Event berikutnya', 'Your next events')}
          >
            <AccountSectionHeading
              title={t('Event berikutnya', 'Your next events')}
              to="/account/tickets"
              linkLabel={t('Semua tiket', 'All tickets')}
            />
            {query.data.upcoming.length ? (
              <div className="account-next-events">
                {query.data.upcoming.map((event) => (
                  <article className="account-next-ticket" key={event.id}>
                    <AccountPoster event={event} />
                    <div className="account-next-info">
                      <h3>
                        <Link to={`/events/${event.slug}`}>{event.title}</Link>
                      </h3>
                      <AccountEventMeta event={event} />
                      <p className="account-ticket-categories">
                        {[...new Set(event.tickets.map((ticket) => ticket.ticketType.name))].join(
                          ' · ',
                        )}
                      </p>
                    </div>
                    <div className="account-ticket-stub">
                      <div>
                        <TicketStatusBadge status="VALID" />
                        <p className="mt-2">
                          {event.tickets.length} {t('tiket', 'tickets')}
                        </p>
                      </div>
                      <Link
                        to={`/account/tickets/${encodeURIComponent(event.tickets[0]!.ticketCode)}`}
                        className="account-primary"
                      >
                        {t('Lihat tiket', 'View ticket')}
                        <ArrowRight size={15} aria-hidden />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                className="account-empty"
                title={t(
                  'Pengalaman berikutnya dimulai di sini',
                  'Your next experience starts here',
                )}
                description={t(
                  'Belum ada event mendatang di akunmu. Temukan event dan simpan tiketmu di satu tempat.',
                  'No upcoming events in your account. Discover an event and keep your tickets together.',
                )}
                action={
                  <Link to="/events" className="account-primary">
                    {t('Jelajahi event', 'Explore events')}
                    <ArrowRight size={16} aria-hidden />
                  </Link>
                }
              />
            )}
          </section>
        </>
      )}
      <section className="account-section">
        <AccountSectionHeading title={t('Akses cepat', 'Quick access')} />
        <div className="account-shortcuts">
          {shortcuts.map((item) => (
            <Link className="account-shortcut" key={item.to} to={item.to}>
              <item.icon size={19} aria-hidden />
              <span>{item.label}</span>
              <ChevronRight size={16} aria-hidden />
            </Link>
          ))}
        </div>
      </section>
      <section className="account-section">
        <AccountSectionHeading
          title={t('Temukan event berikutnya', 'Discover your next event')}
          to="/events"
          linkLabel={t('Jelajahi', 'Explore')}
        />
        {recommendations.isPending ? (
          <LoadingState rows={2} variant="events" />
        ) : recommendations.isError ? (
          <ErrorState
            error={recommendations.error}
            onRetry={() => void recommendations.refetch()}
          />
        ) : recommendations.data.events.length ? (
          <div className="account-recommendations">
            {recommendations.data.events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <p className="account-panel text-sm text-slate-600">
            {t(
              'Belum ada event dengan penjualan tiket aktif. Cek kembali nanti.',
              'No events are currently selling tickets. Check back later.',
            )}
          </p>
        )}
      </section>
    </>
  );
}
