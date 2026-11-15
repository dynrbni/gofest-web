import { ArrowRight, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states';
import { CategoryIcon } from '@/components/discovery/category-icon';
import { categoryName } from '@/lib/categories';
import { useLanguage } from '@/lib/language';
import { useCategories } from '@/lib/queries';

export function EventCategories() {
  const query = useCategories();
  const { t, language } = useLanguage();
  const categories = query.data?.categories ?? [];

  return (
    <section className="py-8 sm:py-10" aria-labelledby="categories-heading">
      <h2 id="categories-heading" className="section-title flex items-center gap-3">
        <Compass className="size-6 shrink-0 text-blue-950" aria-hidden />
        {t('Kategori Event', 'Event categories')}
      </h2>
      <div className="mt-6" aria-busy={query.isFetching}>
        {query.isLoading ? (
          <LoadingState rows={3} label={t('Memuat kategori', 'Loading categories')} />
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
          <nav
            aria-label={t('Pilih kategori', 'Choose a category')}
            className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/events?category=${encodeURIComponent(category.slug)}`}
                className="mega-category-link group"
              >
                <CategoryIcon slug={category.slug} />
                <span className="min-w-0">
                  <span className="block font-medium group-hover:text-blue-700">
                    {categoryName(category, language)}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">
                    {category.description || t('Temukan acara pilihanmu', 'Find your next event')}
                  </span>
                </span>
              </Link>
            ))}
          </nav>
        )}
      </div>
      <div className="mt-6 border-t border-slate-200 pt-5">
        <Link to="/events" className="text-link">
          {t('Jelajah semua acara', 'Explore all events')}{' '}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
