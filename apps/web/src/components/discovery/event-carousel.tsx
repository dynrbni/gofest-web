import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { assetUrl } from '@/lib/assets';
import { formatEventWhen } from '@/lib/format';
import { useReducedMotion } from '@/lib/hooks';
import type { EventSummary } from '@/lib/models';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/language';

interface BannerItem {
  id: string;
  title?: string;
  imageKey?: string;
  mobileImageKey?: string;
  ctaUrl?: string;
}

type Slide = BannerItem & { kind: 'banner' | 'event'; date?: string };

function SlideImage({
  slide,
  priority = false,
  decorative = false,
}: {
  slide: Slide;
  priority?: boolean;
  decorative?: boolean;
}) {
  const desktop = assetUrl(slide.imageKey) || assetUrl(slide.mobileImageKey);
  const mobile = assetUrl(slide.mobileImageKey);

  return (
    <picture className="contents">
      {mobile && <source media="(max-width: 639px)" srcSet={mobile} />}
      <img
        src={desktop || '/images/concert-crowd.webp'}
        alt={decorative || slide.kind === 'event' ? '' : (slide.title ?? '')}
        className="hero-image"
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        width={1920}
        height={600}
        draggable={false}
      />
    </picture>
  );
}

function SlideArtwork({ slide, priority = false }: { slide: Slide; priority?: boolean }) {
  const { t } = useLanguage();
  if (slide.kind === 'banner') {
    return <SlideImage slide={slide} priority={priority} decorative={Boolean(slide.ctaUrl)} />;
  }

  return (
    <>
      <div className="hero-event-art">
        <SlideImage slide={slide} priority={priority} decorative />
      </div>
      <div className="hero-event-copy">
        {slide.date && (
          <p className="hidden text-sm font-medium text-blue-100 sm:block">{slide.date}</p>
        )}
        <p className="line-clamp-2 text-base font-semibold leading-tight sm:text-2xl lg:text-4xl xl:text-5xl">
          {slide.title ?? t('Cari event seru favoritmu', 'Find your next favourite event')}
        </p>
        <p className="mt-1 hidden items-center gap-1.5 text-sm font-medium sm:flex">
          {slide.title ? t('Lihat event', 'View event') : t('Jelajah event', 'Explore events')}
          <ArrowUpRight className="size-4" aria-hidden />
        </p>
      </div>
    </>
  );
}

function SlideContent({ slide, priority }: { slide: Slide; priority: boolean }) {
  const { t } = useLanguage();
  const label =
    slide.kind === 'event'
      ? slide.title
        ? t(`Lihat acara ${slide.title}`, `View event ${slide.title}`)
        : t('Jelajah acara', 'Explore events')
      : slide.title || t('Lihat informasi banner', 'View banner details');
  const artwork = <SlideArtwork slide={slide} priority={priority} />;
  if (!slide.ctaUrl) return <div className="hero-banner-link">{artwork}</div>;
  if (slide.ctaUrl.startsWith('/') || slide.ctaUrl.startsWith('#')) {
    return (
      <Link to={slide.ctaUrl} className="hero-banner-link" aria-label={label} draggable={false}>
        {artwork}
      </Link>
    );
  }
  return (
    <a
      href={slide.ctaUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="hero-banner-link"
      aria-label={label}
      draggable={false}
    >
      {artwork}
    </a>
  );
}

function HeroCarousel({ slides, editorBanners }: { slides: Slide[]; editorBanners: boolean }) {
  const { t } = useLanguage();
  const [slide, setSlide] = useState({ index: 0, previous: -1, direction: 1, sequence: 0 });
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pageHidden, setPageHidden] = useState(document.hidden);
  const reducedMotion = useReducedMotion();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const count = slides.length;
  const current = slide.index % count;
  const hasControls = count > 1;

  useEffect(() => {
    const onVisibility = () => setPageHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (hovered || focused || reducedMotion || pageHidden || !hasControls) return;
    const timer = window.setTimeout(() => {
      setSlide((previous) => ({
        index: (previous.index + 1) % count,
        previous: previous.index % count,
        direction: 1,
        sequence: previous.sequence + 1,
      }));
    }, 6500);
    return () => window.clearTimeout(timer);
  }, [hovered, focused, reducedMotion, pageHidden, hasControls, count, slide.sequence]);

  function select(index: number, direction: number) {
    setSlide((previous) => {
      const next = (index + count) % count;
      if (next === previous.index % count) return previous;
      return {
        index: next,
        previous: previous.index % count,
        direction,
        sequence: previous.sequence + 1,
      };
    });
  }

  const activeSlide = slides[current];
  if (!activeSlide) return null;

  return (
    <section
      aria-label={
        editorBanners
          ? t('Banner beranda', 'Homepage banners')
          : t('Sorotan acara', 'Featured events')
      }
      aria-roledescription={hasControls ? 'carousel' : undefined}
      className="event-carousel"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      onKeyDown={(event) => {
        if (!hasControls || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
        event.preventDefault();
        const direction = event.key === 'ArrowLeft' ? -1 : 1;
        if (event.target instanceof Element && event.target.closest('.hero-slide-current')) {
          event.currentTarget
            .querySelector<HTMLButtonElement>(
              direction < 0 ? '.carousel-arrow-left' : '.carousel-arrow-right',
            )
            ?.focus();
        }
        select(current + direction, direction);
      }}
    >
      <div
        className="carousel-stage"
        onTouchStart={(event) => {
          const touch = event.touches[0];
          touchStart.current =
            event.touches.length === 1 && touch ? { x: touch.clientX, y: touch.clientY } : null;
        }}
        onTouchCancel={() => {
          touchStart.current = null;
        }}
        onTouchEnd={(event) => {
          const start = touchStart.current;
          touchStart.current = null;
          const touch = event.changedTouches[0];
          if (!hasControls || !start || !touch) return;
          const distance = touch.clientX - start.x;
          if (Math.abs(distance) < 40 || Math.abs(distance) <= Math.abs(touch.clientY - start.y))
            return;
          const direction = distance < 0 ? 1 : -1;
          select(current + direction, direction);
        }}
      >
        {hasControls ? (
          <>
            <div className="hero-preview hero-preview-left" aria-hidden>
              <SlideImage slide={slides[(current - 1 + count) % count] ?? activeSlide} decorative />
            </div>
            <div className="hero-preview hero-preview-right" aria-hidden>
              <SlideImage slide={slides[(current + 1) % count] ?? activeSlide} decorative />
            </div>
          </>
        ) : null}
        <div
          className="hero-frame"
          style={{ '--slide-direction': slide.direction } as CSSProperties}
        >
          {hasControls && slide.previous >= 0 && !reducedMotion ? (
            <div
              key={`out-${slide.sequence}`}
              className="hero-slide hero-slide-outgoing"
              aria-hidden
              inert
            >
              <SlideArtwork slide={slides[slide.previous % count] ?? activeSlide} />
            </div>
          ) : null}
          <div
            key={`in-${slide.sequence}`}
            className={cn(
              'hero-slide hero-slide-current',
              slide.sequence > 0 && 'hero-slide-incoming',
            )}
            role={hasControls ? 'group' : undefined}
            aria-roledescription={hasControls ? 'slide' : undefined}
            aria-label={hasControls ? `${current + 1} ${t('dari', 'of')} ${count}` : undefined}
          >
            <SlideContent slide={activeSlide} priority={slide.sequence === 0} />
          </div>
        </div>
        {hasControls ? (
          <>
            <button
              type="button"
              aria-label={
                editorBanners
                  ? t('Banner sebelumnya', 'Previous banner')
                  : t('Sorotan sebelumnya', 'Previous highlight')
              }
              onClick={() => select(current - 1, -1)}
              className="carousel-arrow carousel-arrow-left"
            >
              <ChevronLeft aria-hidden />
            </button>
            <button
              type="button"
              aria-label={
                editorBanners
                  ? t('Banner berikutnya', 'Next banner')
                  : t('Sorotan berikutnya', 'Next highlight')
              }
              onClick={() => select(current + 1, 1)}
              className="carousel-arrow carousel-arrow-right"
            >
              <ChevronRight aria-hidden />
            </button>
          </>
        ) : null}
      </div>
      {hasControls ? (
        <div
          className="carousel-controls"
          role="group"
          aria-label={
            editorBanners
              ? t('Pilih banner', 'Choose a banner')
              : t('Pilih sorotan', 'Choose a highlight')
          }
        >
          {slides.map((item, index) => (
            <button
              key={`${item.kind}-${item.id}`}
              type="button"
              onClick={() => select(index, index > current ? 1 : -1)}
              aria-label={
                editorBanners
                  ? t(`Lihat banner ${index + 1}`, `View banner ${index + 1}`)
                  : t(`Lihat sorotan ${index + 1}`, `View highlight ${index + 1}`)
              }
              aria-pressed={current === index}
              className="carousel-dot"
            >
              <span />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function EventCarousel({
  events,
  banners,
}: {
  events: EventSummary[];
  banners: BannerItem[];
}) {
  const slides: Slide[] = banners.map((banner) => ({ ...banner, kind: 'banner' }));
  if (banners.length < 2) {
    const bannerLinks = new Set(banners.map((banner) => banner.ctaUrl));
    const featured = events
      .filter((event) => !bannerLinks.has(`/events/${event.slug}`))
      .slice(0, 5 - banners.length);
    for (const event of featured) {
      slides.push({
        id: event.id,
        title: event.title,
        imageKey: event.coverKey ?? undefined,
        date: formatEventWhen(event.startsAt, event.endsAt, event.timezone),
        ctaUrl: `/events/${event.slug}`,
        kind: 'event',
      });
    }
  }
  if (!slides.length) slides.push({ id: 'fallback', kind: 'event', ctaUrl: '/events' });
  return <HeroCarousel slides={slides} editorBanners={banners.length > 0} />;
}
