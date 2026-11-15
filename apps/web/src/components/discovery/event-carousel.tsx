import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { assetUrl } from '@/lib/assets';
import { useReducedMotion } from '@/lib/hooks';
import type { EventSummary } from '@/lib/models';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/language';

function BannerSlide({ event }: { event?: EventSummary }) {
  const { t } = useLanguage();
  return (
    <Link
      to={event ? `/events/${event.slug}` : '/events'}
      className="hero-banner-link"
      aria-label={
        event
          ? t(`Lihat acara ${event.title}`, `View event ${event.title}`)
          : t('Jelajah acara', 'Explore events')
      }
      draggable={false}
    >
      <img
        src={assetUrl(event?.coverKey) ?? '/images/concert-crowd.webp'}
        alt=""
        className="hero-image"
        fetchPriority="high"
        width={1920}
        height={600}
        draggable={false}
        onError={(e) => {
          e.currentTarget.style.visibility = 'hidden';
        }}
      />
      <div className="hero-shade" />
      <div className="hero-copy">
        <p className="hero-caption-meta">
          {event
            ? `${event.category.name} · ${event.type === 'ONLINE' ? 'Online' : (event.city ?? 'Indonesia')}`
            : t(
                'Konser, festival, dan pengalaman baru',
                'Concerts, festivals, and new experiences',
              )}
        </p>
        <h2 className="hero-title">
          {event?.title ??
            t('Ada cerita seru di setiap pertemuan.', 'Great stories start with getting together.')}
        </h2>
        <span className="hero-action">
          {event ? t('Lihat acara', 'View event') : t('Jelajah acara', 'Explore events')}
          <ArrowRight className="size-4" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

export function EventCarousel({ events }: { events: EventSummary[] }) {
  const { t } = useLanguage();
  const [slide, setSlide] = useState({ index: 0, previous: -1, direction: 1, sequence: 0 });
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pageHidden, setPageHidden] = useState(document.hidden);
  const reducedMotion = useReducedMotion();
  const featured = events.slice(0, 5);
  const count = Math.max(featured.length, 1);
  const current = slide.index % count;

  useEffect(() => {
    const onVisibility = () => setPageHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
  useEffect(() => {
    if (hovered || focused || reducedMotion || pageHidden || count < 2) return;
    const timer = window.setTimeout(() => {
      setSlide((previous) => ({
        index: (previous.index + 1) % count,
        previous: previous.index % count,
        direction: 1,
        sequence: previous.sequence + 1,
      }));
    }, 6500);
    return () => window.clearTimeout(timer);
  }, [hovered, focused, reducedMotion, pageHidden, count, slide.sequence]);

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

  return (
    <section
      aria-label={t('Sorotan acara', 'Featured events')}
      aria-roledescription="carousel"
      className="event-carousel"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          const direction = e.key === 'ArrowLeft' ? -1 : 1;
          select(current + direction, direction);
        }
      }}
    >
      <div className="hero-frame" style={{ '--slide-direction': slide.direction } as CSSProperties}>
        {slide.previous >= 0 && !reducedMotion ? (
          <div
            key={`out-${slide.sequence}`}
            className="hero-slide hero-slide-outgoing"
            aria-hidden
            inert
          >
            <BannerSlide event={featured[slide.previous % count]} />
          </div>
        ) : null}
        <div
          key={`in-${slide.sequence}`}
          className={cn(
            'hero-slide hero-slide-current',
            slide.sequence > 0 && 'hero-slide-incoming',
          )}
          role="group"
          aria-roledescription="slide"
          aria-label={`${current + 1} ${t('dari', 'of')} ${count}`}
        >
          <BannerSlide event={featured[current]} />
        </div>
      </div>
      {count > 1 ? (
        <>
          <button
            type="button"
            aria-label={t('Sorotan sebelumnya', 'Previous highlight')}
            onClick={() => select(current - 1, -1)}
            className="carousel-arrow carousel-arrow-left"
          >
            <ChevronLeft aria-hidden />
          </button>
          <button
            type="button"
            aria-label={t('Sorotan berikutnya', 'Next highlight')}
            onClick={() => select(current + 1, 1)}
            className="carousel-arrow carousel-arrow-right"
          >
            <ChevronRight aria-hidden />
          </button>
          <div
            className="carousel-controls"
            role="group"
            aria-label={t('Pilih sorotan', 'Choose a highlight')}
          >
            {Array.from({ length: count }, (_, item) => (
              <button
                key={item}
                type="button"
                onClick={() => select(item, item > current ? 1 : -1)}
                aria-label={t(`Lihat sorotan ${item + 1}`, `View highlight ${item + 1}`)}
                aria-pressed={current === item}
                className="carousel-dot"
              >
                <span className={cn(current === item && 'carousel-dot-active')} />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
