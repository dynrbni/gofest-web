import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CategoryIcon } from '@/components/discovery/category-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { categoryName } from '@/lib/categories';
import { useLanguage } from '@/lib/language';
import { useCategories } from '@/lib/queries';
import { cn } from '@/lib/utils';

export function CategoryRibbon({
  selected,
  onSelect,
}: {
  selected?: string;
  onSelect: (category: string | undefined) => void;
}) {
  const { t, language } = useLanguage();
  const query = useCategories();
  const ribbon = useRef<HTMLElement>(null);
  const [scroll, setScroll] = useState({ previous: false, next: false });

  function measureScroll() {
    const element = ribbon.current;
    if (!element) return;
    const previous = element.scrollLeft > 1;
    const next = element.scrollLeft + element.clientWidth < element.scrollWidth - 1;
    setScroll((current) =>
      current.previous === previous && current.next === next ? current : { previous, next },
    );
  }

  useEffect(() => {
    const element = ribbon.current;
    if (!element) return;
    const observer = new ResizeObserver(measureScroll);
    observer.observe(element);
    measureScroll();
    return () => observer.disconnect();
  }, [query.data, query.isLoading, language]);

  useEffect(() => {
    const element = ribbon.current;
    const active = element?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    if (!element || !active) return;
    const bounds = element.getBoundingClientRect();
    const item = active.getBoundingClientRect();
    if (item.left < bounds.left || item.right > bounds.right) {
      element.scrollBy({
        left: item.left - bounds.left - (bounds.width - item.width) / 2,
        behavior: 'auto',
      });
    }
  }, [selected, query.data, language]);

  function scrollCategories(direction: number) {
    const element = ribbon.current;
    if (!element) return;
    element.scrollBy({
      left: direction * element.clientWidth * 0.75,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }

  return (
    <div className="catalog-category-section">
      <div className="mb-3 flex min-h-11 items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">
          {t('Pilih kategori', 'Choose a category')}
        </p>
        {scroll.previous || scroll.next ? (
          <div className="hidden gap-2 sm:flex">
            <button
              type="button"
              className="category-scroll"
              onClick={() => scrollCategories(-1)}
              disabled={!scroll.previous}
              aria-label={t('Kategori sebelumnya', 'Previous categories')}
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              className="category-scroll"
              onClick={() => scrollCategories(1)}
              disabled={!scroll.next}
              aria-label={t('Kategori berikutnya', 'Next categories')}
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>
      <nav
        ref={ribbon}
        className="catalog-categories"
        onScroll={measureScroll}
        aria-label={t('Kategori Event', 'Event categories')}
        aria-busy={query.isLoading}
      >
        <button
          type="button"
          className={cn('catalog-category', !selected && 'catalog-category-active')}
          aria-pressed={!selected}
          onClick={() => onSelect(undefined)}
        >
          <CategoryIcon />
          <span>{t('Semua acara', 'All events')}</span>
        </button>
        {query.isLoading ? (
          <>
            <span className="sr-only" role="status">
              {t('Memuat kategori...', 'Loading categories...')}
            </span>
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton
                key={index}
                className="h-[108px] w-[100px] shrink-0 sm:h-[116px] sm:w-[120px]"
              />
            ))}
          </>
        ) : (
          (query.data?.categories ?? []).map((category) => (
            <button
              type="button"
              key={category.id}
              className={cn(
                'catalog-category',
                selected === category.slug && 'catalog-category-active',
              )}
              aria-pressed={selected === category.slug}
              onClick={() => onSelect(category.slug)}
            >
              <CategoryIcon slug={category.slug} />
              <span>{categoryName(category, language)}</span>
            </button>
          ))
        )}
      </nav>
      {query.isError ? (
        <p role="status" className="mt-3 text-sm text-slate-600">
          {t('Kategori belum tersedia.', 'Categories are unavailable.')}{' '}
          <button
            type="button"
            className="text-blue-700 underline"
            onClick={() => void query.refetch()}
          >
            {t('Coba lagi', 'Try again')}
          </button>
        </p>
      ) : null}
    </div>
  );
}
