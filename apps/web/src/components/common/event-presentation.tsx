import { CalendarDays, CheckCircle2, MapPin, Ticket } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import type { EventSummary } from '@/lib/models';
import { assetUrl } from '@/lib/assets';
import { dateParts, formatIDR } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/language';

export function EventPoster({
  title,
  coverKey,
  category,
  startsAt,
  city,
  timezone = 'Asia/Jakarta',
  className,
  imageClassName,
  sizes = '(min-width: 1024px) 320px, 90vw',
}: {
  title: string;
  coverKey: string | null;
  category: string;
  startsAt: string;
  city: string | null;
  timezone?: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = assetUrl(coverKey);
  const date = dateParts(startsAt, timezone);
  return (
    <div
      className={cn('event-poster relative aspect-[16/9] overflow-hidden bg-blue-950', className)}
    >
      {src && failedSrc !== src ? (
        <img
          src={src}
          alt={`Poster ${title}`}
          width={800}
          height={450}
          loading="lazy"
          sizes={sizes}
          onError={() => setFailedSrc(src)}
          className={cn(
            'h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]',
            imageClassName,
          )}
        />
      ) : (
        <div className="flex h-full flex-col justify-between bg-blue-950 p-5 text-white">
          <span className="flex items-center gap-2 text-xs font-semibold text-blue-200">
            <Ticket className="size-4" aria-hidden />
            {category}
          </span>
          <p className="line-clamp-2 text-xl font-extrabold leading-tight">{title}</p>
          <span className="text-xs text-blue-200">
            {date.day} {date.month} {date.year}
            {city ? ` · ${city}` : ''}
          </span>
        </div>
      )}
    </div>
  );
}

export function DateBlock({
  startsAt,
  timezone = 'Asia/Jakarta',
  className,
}: {
  startsAt: string;
  timezone?: string;
  className?: string;
}) {
  const date = dateParts(startsAt, timezone);
  return (
    <div className={cn('flex items-baseline gap-2', className)}>
      <span className="text-2xl font-extrabold text-blue-700">{date.day}</span>
      <span className="text-xs font-semibold text-slate-600">
        {date.month} {date.year}
      </span>
    </div>
  );
}

export function EventCard({
  event,
  layout = 'grid',
  compact = false,
}: {
  event: EventSummary;
  layout?: 'grid' | 'row' | 'discovery';
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const date = dateParts(event.startsAt, event.timezone);
  const price =
    event.priceFrom === 0
      ? t('Gratis', 'Free')
      : event.priceFrom !== null
        ? formatIDR(event.priceFrom)
        : t('Belum dijual', 'Not on sale');
  return (
    <article
      className={cn(
        'event-card group',
        layout === 'row' && 'event-card-row',
        layout === 'discovery' && 'event-card-discovery',
        compact && 'event-card-compact',
      )}
    >
      <Link
        to={`/events/${event.slug}`}
        className={cn('flex h-full flex-col', layout === 'row' && 'sm:flex-row')}
      >
        <div className={cn('relative shrink-0', layout === 'row' && 'sm:w-56')}>
          <EventPoster
            title={event.title}
            coverKey={event.coverKey}
            category={event.category.name}
            startsAt={event.startsAt}
            city={event.city}
            timezone={event.timezone}
          />
          {event.isSoldOut ? (
            <span className="poster-label bg-slate-900 text-white">
              {t('Tiket habis', 'Sold out')}
            </span>
          ) : event.priceFrom === 0 ? (
            <span className="poster-label bg-emerald-700 text-white">{t('Gratis', 'Free')}</span>
          ) : event.type === 'ONLINE' ? (
            <span className="poster-label bg-white text-blue-800">Online</span>
          ) : null}
        </div>
        {layout === 'discovery' ? (
          <div className="flex min-w-0 flex-1 flex-col pt-3">
            <p className="text-sm text-slate-600">
              {event.type === 'ONLINE'
                ? t('Acara online', 'Online event')
                : event.city || t('Lokasi menyusul', 'Location to be announced')}
            </p>
            <h3 className="mt-2 truncate text-base font-extrabold leading-6 group-hover:text-blue-700">
              {event.title}
            </h3>
            <p className="mt-2 truncate text-sm text-slate-600">
              {t('Oleh', 'By')} {event.organizer.organizationName}
            </p>
            <div className="mt-3 border-t border-dashed border-slate-200 pt-3">
              <span className="text-xs text-slate-500">{t('Mulai dari', 'From')}</span>
              <p className="mt-1 text-base font-extrabold tabular-nums text-slate-900">{price}</p>
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <CalendarDays className="size-3.5 shrink-0" aria-hidden />
              {date.day} {date.month} {date.year}
            </p>
            <h3 className="mt-2 line-clamp-2 min-h-[2.75rem] text-sm font-extrabold leading-snug transition-colors group-hover:text-blue-700">
              {event.title}
            </h3>
            <p className="mt-2 flex min-w-0 items-center gap-1 text-xs text-slate-500">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">
                {event.type === 'ONLINE'
                  ? t('Acara online', 'Online event')
                  : [event.venueName, event.city].filter(Boolean).join(', ') ||
                    t('Lokasi menyusul', 'Location to be announced')}
              </span>
            </p>
            <div className="mb-4 mt-4">
              <span className="text-xs text-slate-500">
                {event.priceFrom !== null && event.priceFrom > 0
                  ? t('Mulai dari', 'From')
                  : t('Tiket acara', 'Event tickets')}
              </span>
              <p className="mt-0.5 text-base font-extrabold tabular-nums text-slate-900">{price}</p>
            </div>
            <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                {event.organizer.organizationName.charAt(0).toUpperCase()}
              </span>
              <span className="truncate text-xs text-slate-600">
                {event.organizer.organizationName}
              </span>
              {event.organizer.status === 'ACTIVE' ? (
                <CheckCircle2
                  className="ml-auto size-3.5 shrink-0 text-blue-700"
                  aria-label="Organizer aktif"
                />
              ) : null}
            </div>
          </div>
        )}
      </Link>
    </article>
  );
}

export function ShareLink({ url, label = 'Salin tautan' }: { url: string; label?: string }) {
  return (
    <button
      type="button"
      className="text-link"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          toast.success('Tautan disalin');
        } catch {
          toast.error('Tautan belum bisa disalin. Salin alamat dari browser.');
        }
      }}
    >
      {label}
    </button>
  );
}
