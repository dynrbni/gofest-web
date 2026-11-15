import { CalendarDays, Pause, Play, Ticket } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import type { EventSummary } from '@/lib/models';
import { assetUrl } from '@/lib/assets';
import { dateParts, formatIDR } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/language';
import { OverflowMarquee } from './overflow-marquee';

export function EventPoster({
  title,
  coverKey,
  category,
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
        <div className="flex h-full flex-col justify-between bg-blue-950 p-4 text-white">
          <span className="flex items-center gap-2 text-xs font-medium text-blue-200">
            <Ticket className="size-4" aria-hidden />
            {category}
          </span>
          <p className="line-clamp-2 text-xl font-semibold leading-tight">{title}</p>
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
      <span className="text-2xl font-semibold text-blue-700">{date.day}</span>
      <span className="text-xs font-medium text-slate-600">
        {date.month} {date.year}
      </span>
    </div>
  );
}

export function OrganizerAvatar({
  name,
  logoKey,
  className,
}: {
  name: string;
  logoKey?: string | null;
  className?: string;
}) {
  const source = assetUrl(logoKey);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return (
    <span
      className={cn(
        'flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-base font-medium text-blue-800',
        className,
      )}
      aria-hidden
    >
      {source && source !== failedSource ? (
        <img
          src={source}
          alt=""
          width={128}
          height={128}
          loading="lazy"
          onError={() => setFailedSource(source)}
          className="h-full w-full object-contain"
        />
      ) : (
        name.charAt(0).toLocaleUpperCase()
      )}
    </span>
  );
}

export function EventCard({ event }: { event: EventSummary }) {
  const { t } = useLanguage();
  const [titleOverflows, setTitleOverflows] = useState(false);
  const [creatorOverflows, setCreatorOverflows] = useState(false);
  const [textPaused, setTextPaused] = useState(false);
  const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: event.timezone,
  });
  const eventDate = dateFormatter.formatRange(new Date(event.startsAt), new Date(event.endsAt));
  const price =
    event.priceFrom === 0
      ? t('Gratis', 'Free')
      : event.priceFrom !== null
        ? formatIDR(event.priceFrom)
        : t('Belum dijual', 'Not on sale');
  const ended = event.status === 'COMPLETED' || new Date(event.endsAt).getTime() <= Date.now();
  return (
    <article className="event-card group relative flex flex-col">
      <Link to={`/events/${event.slug}`} className="flex min-w-0 flex-1 flex-col">
        <div className="relative shrink-0">
          <EventPoster
            title={event.title}
            coverKey={event.coverKey}
            category={event.category.name}
            startsAt={event.startsAt}
            city={event.city}
            timezone={event.timezone}
            className="aspect-[5/2] rounded-xl"
          />
          {ended ? (
            <span className="poster-label bg-slate-900 text-white">{t('Selesai', 'Ended')}</span>
          ) : event.isSoldOut ? (
            <span className="poster-label bg-slate-900 text-white">
              {t('Tiket habis', 'Sold out')}
            </span>
          ) : event.priceFrom === 0 ? (
            <span className="poster-label bg-emerald-700 text-white">{t('Gratis', 'Free')}</span>
          ) : event.type === 'ONLINE' ? (
            <span className="poster-label bg-white text-blue-800">Online</span>
          ) : null}
        </div>
        <div className="event-card-information mt-3 flex min-w-0 flex-1 flex-col rounded-t-2xl bg-white px-4 pt-4">
          <h3 className="min-w-0 text-base font-semibold leading-6 transition-colors group-hover:text-blue-700">
            <OverflowMarquee
              text={event.title}
              paused={textPaused}
              onOverflowChange={setTitleOverflows}
            />
          </h3>
          <p className="mt-3 flex min-h-10 items-start gap-2 text-sm leading-6 text-slate-600">
            <CalendarDays className="mt-0.5 size-5 shrink-0 text-blue-600" aria-hidden />
            <span>{eventDate}</span>
          </p>
          <p className="sr-only">
            {event.type === 'ONLINE'
              ? t('Acara online', 'Online event')
              : [event.venueName, event.city].filter(Boolean).join(', ') ||
                t('Lokasi menyusul', 'Location to be announced')}
          </p>
          <p className="mb-5 mt-3 text-lg font-semibold tabular-nums">
            <span className="sr-only">{t('Mulai dari', 'From')} </span>
            {price}
          </p>
        </div>
      </Link>
      <div className="rounded-b-2xl bg-white px-4 pb-4">
        <Link
          to={`/organizers/${event.organizer.slug}`}
          className="flex min-h-14 items-center gap-3 border-t border-dashed border-slate-200 pt-3 text-sm text-slate-600 hover:text-blue-700"
          aria-label={t(
            `Lihat kreator ${event.organizer.organizationName}`,
            `View creator ${event.organizer.organizationName}`,
          )}
        >
          <OrganizerAvatar
            name={event.organizer.organizationName}
            logoKey={event.organizer.logoKey}
          />
          <OverflowMarquee
            text={event.organizer.organizationName}
            paused={textPaused}
            onOverflowChange={setCreatorOverflows}
            className="flex-1"
          />
        </Link>
      </div>
      {titleOverflows || creatorOverflows ? (
        <button
          type="button"
          className="event-marquee-control absolute right-5 top-5 z-10 flex size-11 items-center justify-center rounded-full bg-white text-blue-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          aria-label={
            textPaused
              ? t('Lanjutkan teks bergerak', 'Resume scrolling text')
              : t('Jeda teks bergerak', 'Pause scrolling text')
          }
          title={
            textPaused
              ? t('Lanjutkan teks bergerak', 'Resume scrolling text')
              : t('Jeda teks bergerak', 'Pause scrolling text')
          }
          onClick={() => setTextPaused((value) => !value)}
        >
          {textPaused ? (
            <Play className="size-4" aria-hidden />
          ) : (
            <Pause className="size-4" aria-hidden />
          )}
        </button>
      ) : null}
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
