import { Heart, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/language';
import { useDocumentTitle } from '@/lib/hooks';
import { AccountHeading } from './account-components';

export function AccountFavoritesPage() {
  const { t } = useLanguage();
  useDocumentTitle(t('Event Favorit', 'Favorite Events'));
  return (
    <>
      <AccountHeading
        title={t('Event Favorit', 'Favorite Events')}
        description={t(
          'Tempat untuk event yang ingin kamu kunjungi.',
          'A place for events you want to attend.',
        )}
      />
      <section className="account-panel account-availability">
        <Heart size={36} strokeWidth={1.5} aria-hidden />
        <h2>{t('Menyimpan event belum tersedia', 'Saving events is not available yet')}</h2>
        <p>
          {t(
            'Fitur favorit belum tersedia di akun GoFest. Sementara itu, kamu bisa menjelajahi event dan membagikan tautan event yang menarik.',
            'Saved events are not available in GoFest accounts yet. You can explore events and share the links that interest you.',
          )}
        </p>
        <Link to="/events" className="account-primary">
          {t('Jelajahi event', 'Explore events')}
          <ArrowUpRight size={16} aria-hidden />
        </Link>
      </section>
    </>
  );
}
