import { useDocumentTitle } from '@/lib/hooks';
import { useLanguage } from '@/lib/language';
import { PublishedHome } from './cms-home';
import { useCmsSite } from '@/lib/cms';

export function HomePage() {
  const { t } = useLanguage();
  const { data } = useCmsSite();
  useDocumentTitle(
    data?.settings.seoTitle ||
      t('Temukan Konser, Festival & Pengalaman Seru', 'Discover concerts, festivals & experiences'),
    { exact: Boolean(data?.settings.seoTitle) },
  );
  return <PublishedHome />;
}
