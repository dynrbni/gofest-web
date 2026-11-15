import { Link } from 'react-router-dom';
import { EmptyState, ErrorState } from '@/components/common/states';
import { CategoryIcon } from '@/components/discovery/category-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { categoryName } from '@/lib/categories';
import { useLanguage } from '@/lib/language';
import { useCategories } from '@/lib/queries';

export function EventCategories() {
  const query = useCategories();
  const { t, language } = useLanguage();
  const categories = query.data?.categories ?? [];

  return (
    <section className="py-8 sm:py-10" aria-labelledby="categories-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="categories-heading" className="section-title">
          {t('Kategori Event', 'Event categories')}
        </h2>
        <Link to="/events" className="text-link">
          {t('Lihat semua', 'View all')}
        </Link>
      </div>
      <div className="mt-6 sm:mt-8" aria-busy={query.isFetching}>
        {query.isLoading ? (
          <div className="home-category-grid" role="status">
            <span className="sr-only">{t('Memuat kategori', 'Loading categories')}</span>
            {Array.from({ length: 12 }, (_, index) => (
              <div key={index} className="flex flex-col items-center gap-3" aria-hidden>
                <Skeleton className="size-16 rounded-full sm:size-20" />
                <Skeleton className="h-11 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : categories.length === 0 ? (
          <EmptyState
            title={t('Kategori belum tersedia', 'No categories yet')}
            description={t(
              'Kamu tetap bisa menjelajahi semua acara yang tersedia.',
              'You can still browse all available events.',
            )}
          />
        ) : (
          <nav aria-label={t('Pilih kategori', 'Choose a category')} className="home-category-grid">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/events?category=${encodeURIComponent(category.slug)}`}
                className="home-category-link group"
              >
                <CategoryIcon slug={category.slug} />
                <span className="home-category-label">{categoryName(category, language)}</span>
              </Link>
            ))}
          </nav>
        )}
      </div>
    </section>
  );
}
