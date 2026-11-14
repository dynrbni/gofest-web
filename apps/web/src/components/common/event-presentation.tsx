import type { EventSummary } from '@/lib/models';
import { assetUrl } from '@/lib/assets';
import { dateParts, formatIDR } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export function EventPoster({
  title,
  coverKey,
  category,
  startsAt,
  city,
  timezone = 'Asia/Jakarta',
  className,
  imageClassName,
  sizes = '(min-width: 1024px) 320px, 40vw',
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
  const src = assetUrl(coverKey);
  const date = dateParts(startsAt, timezone);

  return (
    <div
      className={cn(
        'relative aspect-[4/5] overflow-hidden bg-warm-muted',
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={`Poster ${title}`}
          width={800}
          height={1000}
          loading="lazy"
          sizes={sizes}
          className={cn('h-full w-full object-cover', imageClassName)}
        />
      ) : (
        <div className="flex h-full flex-col justify-between border border-vermilion/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-olive">
              {category}
            </span>
            <span className="text-[10px] font-semibold tabular-nums text-olive">{date.year}</span>
          </div>
          <div>
            <p className="font-display text-2xl leading-[0.98] tracking-tightest text-ink">
              {title}
            </p>
            <p className="mt-3 border-t border-ink/20 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-olive">
              {date.day} {date.month}
              {city ? ` · ${city}` : ''}
            </p>
          </div>
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
      <span className="font-display text-3xl leading-none tracking-tightest">{date.day}</span>
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-olive">
        {date.month} {date.year}
      </span>
    </div>
  );
}

export function EventCard({ event, compact = false }: { event: EventSummary; compact?: boolean }) {
  return (
    <article className="group border-b border-warm-border last:border-b-0">
      <Link
        to={`/events/${event.slug}`}
        className="grid grid-cols-[92px_1fr] gap-4 py-5 transition-colors hover:bg-warm-muted/40 sm:grid-cols-[132px_1fr] sm:gap-6 sm:py-6"
      >
        <EventPoster
          title={event.title}
          coverKey={event.coverKey}
          category={event.category.name}
          startsAt={event.startsAt}
          city={event.city}
          timezone={event.timezone}
          className={compact ? 'w-[92px] sm:w-[132px]' : 'w-[92px] rounded-sm sm:w-[132px]'}
          sizes="(min-width: 640px) 132px, 92px"
        />
        <div className="flex min-w-0 flex-col justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <DateBlock startsAt={event.startsAt} timezone={event.timezone} />
              <span aria-hidden>·</span>
              <span className="truncate">{event.category.name}</span>
              {event.isSoldOut ? (
                <span className="rounded-sm border border-brick/30 bg-brick/10 px-1.5 py-0.5 font-semibold text-brick">
                  Tiket habis
                </span>
              ) : null}
            </div>
            <h3 className="mt-2 text-lg font-bold leading-snug tracking-tight group-hover:underline group-hover:decoration-vermilion group-hover:decoration-2 group-hover:underline-offset-4 sm:text-xl">
              {event.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {event.summary}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-semibold text-ink">
              {event.priceFrom === 0
                ? 'Gratis'
                : event.priceFrom !== null
                  ? `Mulai ${formatIDR(event.priceFrom)}`
                  : 'Harga belum tersedia'}
            </span>
            <span aria-hidden>·</span>
            <span>{event.type === 'ONLINE' ? 'Online' : event.venueName ?? 'Venue menyusul'}</span>
            {event.city ? (
              <>
                <span aria-hidden>·</span>
                <span>{event.city}</span>
              </>
            ) : null}
            <span aria-hidden>·</span>
            <span className="truncate">{event.organizer.organizationName}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}

export function ShareLink({ url, label = 'Salin tautan' }: { url: string; label?: string }) {
  return (
    <button
      type="button"
      className="text-sm font-semibold text-olive underline decoration-warm-border underline-offset-4 hover:text-ink"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          window.prompt('Salin tautan ini', url);
        }
      }}
    >
      {label}
    </button>
  );
}