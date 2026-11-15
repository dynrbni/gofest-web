import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Pause,
  Play,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { assetUrl } from '@/lib/assets';
import { formatDateLong, formatIDR } from '@/lib/format';
import { useReducedMotion } from '@/lib/hooks';
import type { EventSummary } from '@/lib/models';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/language';

export function EventCarousel({ events }: { events: EventSummary[] }) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [pageHidden, setPageHidden] = useState(document.hidden);
  const reducedMotion = useReducedMotion();
  const featured = events.slice(0, 3);
  const count = featured.length + 1;
  const current = index % count;
  const event = current > 0 ? featured[current - 1] : undefined;
  const stop = paused || interacting || reducedMotion || pageHidden;

  useEffect(() => {
    const onVisibility = () => setPageHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
  useEffect(() => {
    if (stop || count < 2) return;
    const timer = window.setInterval(() => setIndex((previous) => (previous + 1) % count), 6500);
    return () => window.clearInterval(timer);
  }, [stop, count, current]);
  function move(direction: number) {
    setIndex((previous) => (previous + direction + count) % count);
  }

  return (
    <section
      aria-label="Sorotan acara"
      aria-roledescription="carousel"
      className="event-carousel"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setInteracting(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          move(e.key === 'ArrowLeft' ? -1 : 1);
        }
      }}
    >
      <div className="hero-frame">
        <div
          key={event?.id ?? 'welcome'}
          className="hero-slide"
          role="group"
          aria-roledescription="slide"
          aria-label={`${current + 1} dari ${count}`}
        >
          <img
            src={
              event
                ? (assetUrl(event.coverKey) ?? '/images/concert-crowd.webp')
                : '/images/concert-crowd.webp'
            }
            alt=""
            className={cn('hero-image', event && 'hero-image-event')}
            fetchPriority="high"
            width={1200}
            height={600}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="hero-shade" />
          <div className="hero-copy">
            <p className="mb-3 text-xs font-semibold text-blue-200 sm:text-sm">
              {event
                ? `${event.category.name} · ${event.type === 'ONLINE' ? 'Online' : (event.city ?? 'Indonesia')}`
                : t(
                    'Konser, festival, dan pengalaman baru',
                    'Concerts, festivals, and new experiences',
                  )}
            </p>
            <h2 className={cn('hero-title', event && 'hero-title-event')}>
              {event
                ? event.title
                : t(
                    'Ada cerita seru di setiap pertemuan.',
                    'Great stories start with getting together.',
                  )}
            </h2>
            {event ? (
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-blue-100 sm:text-sm">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="size-4" aria-hidden />
                  {formatDateLong(event.startsAt, event.timezone)}
                </span>
                {event.venueName ? (
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="size-4" aria-hidden />
                    {event.venueName}
                  </span>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-blue-100 sm:text-base">
                {t('Temukan acara yang kamu suka.', 'Find an event you love.')}
                <br className="hidden sm:block" />{' '}
                {t('Ajak teman, buat momen yang berkesan.', 'Bring your friends. Make a memory.')}
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-5">
              <Link to={event ? `/events/${event.slug}` : '/events'} className="hero-action">
                {event ? t('Lihat acara', 'View event') : t('Jelajah acara', 'Explore events')}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              {event && event.priceFrom !== null ? (
                <span className="text-sm font-bold text-white">
                  {event.priceFrom === 0
                    ? t('Gratis', 'Free')
                    : `${t('Mulai', 'From')} ${formatIDR(event.priceFrom)}`}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      {count > 1 ? (
        <div className="carousel-controls">
          <span className="hidden text-xs text-slate-500 sm:block">
            {t('Pengalaman baru dimulai dari sini.', 'Your next experience starts here.')}
          </span>
          <div className="flex items-center" aria-label="Pilih sorotan">
            {Array.from({ length: count }, (_, item) => (
              <button
                key={item}
                type="button"
                onClick={() => setIndex(item)}
                aria-label={`Lihat sorotan ${item + 1}`}
                aria-pressed={current === item}
                className="carousel-dot"
              >
                <span className={cn(current === item && 'carousel-dot-active')} />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={paused ? 'Putar sorotan otomatis' : 'Jeda sorotan otomatis'}
              aria-pressed={paused}
              onClick={() => setPaused((value) => !value)}
              className="carousel-arrow"
            >
              {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
            </button>
            <button
              type="button"
              aria-label="Sorotan sebelumnya"
              onClick={() => move(-1)}
              className="carousel-arrow"
            >
              <ChevronLeft aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Sorotan berikutnya"
              onClick={() => move(1)}
              className="carousel-arrow"
            >
              <ChevronRight aria-hidden />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
