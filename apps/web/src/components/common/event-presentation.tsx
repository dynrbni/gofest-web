import type { EventSummary } from '@/lib/models';
import { assetUrl } from '@/lib/assets';
import { dateParts, formatIDR } from '@/lib/format';
import { cn } from '@/lib/utils';
import { CalendarDays, ChevronRight, MapPin, Sparkles } from 'lucide-react';
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
        'relative aspect-[4/5] overflow-hidden rounded-xl bg-slate-100 shadow-sm transition-all duration-300',
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
          className={cn('h-full w-full object-cover transition-transform duration-300 group-hover:scale-105', imageClassName)}
        />
      ) : (
        <div className="flex h-full flex-col justify-between bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 p-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-md">
              {category}
            </span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold tabular-nums">
              {date.year}
            </span>
          </div>
          <div>
            <p className="line-clamp-3 text-xl font-extrabold leading-tight tracking-tight">
              {title}
            </p>
            <div className="mt-4 flex items-center gap-1.5 border-t border-white/20 pt-3 text-xs font-medium text-white/80">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-blue-300" aria-hidden />
              <span>
                {date.day} {date.month}
                {city ? ` · ${city}` : ''}
              </span>
            </div>
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
      <span className="text-2xl font-extrabold leading-none tracking-tight text-blue-600">{date.day}</span>
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {date.month} {date.year}
      </span>
    </div>
  );
}

export function EventCard({
  event,
  layout = 'grid',
  compact: _compact = false,
}: {
  event: EventSummary;
  layout?: 'grid' | 'row';
  compact?: boolean;
}) {
  const formattedDate = `${dateParts(event.startsAt, event.timezone).day} ${dateParts(event.startsAt, event.timezone).month} ${dateParts(event.startsAt, event.timezone).year}`;
  const src = assetUrl(event.coverKey);

  if (layout === 'row') {
    return (
      <article className="group rounded-xl border border-slate-200/80 bg-white p-3 transition-all duration-200 hover:border-blue-300 hover:shadow-md">
        <Link
          to={`/events/${event.slug}`}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6"
        >
          <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:w-48">
            {src ? (
              <img
                src={src}
                alt={event.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 p-3 text-center text-xs font-bold text-white">
                {event.category.name}
              </div>
            )}
            <span className="absolute left-2 top-2 rounded-full bg-slate-900/75 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs">
              {event.category.name}
            </span>
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-600">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{formattedDate}</span>
                {event.isSoldOut && (
                  <span className="ml-auto rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                    Habis
                  </span>
                )}
              </div>
              <h3 className="mt-1.5 text-base font-bold text-slate-900 group-hover:text-blue-600 sm:text-lg">
                {event.title}
              </h3>
              <p className="mt-1 line-clamp-1 text-xs text-slate-500">{event.summary}</p>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 text-xs">
              <div className="flex items-center gap-1.5 text-slate-500">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                <span className="truncate">{event.type === 'ONLINE' ? 'Online Event' : event.venueName ?? event.city ?? 'Lokasi menyusul'}</span>
              </div>
              <div className="font-extrabold text-blue-600">
                {event.priceFrom === 0 ? 'Gratis' : event.priceFrom !== null ? `Mulai ${formatIDR(event.priceFrom)}` : 'Harga belum rilis'}
              </div>
            </div>
          </div>
        </Link>
      </article>
    );
  }

  // Loket / Artatix Standard Commercial Grid Card
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl">
      <Link to={`/events/${event.slug}`} className="flex h-full flex-col">
        {/* Poster Top */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
          {src ? (
            <img
              src={src}
              alt={event.title}
              width={600}
              height={375}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 p-4 text-center text-white">
              <Sparkles className="mb-2 h-6 w-6 text-blue-300" aria-hidden />
              <span className="line-clamp-2 text-sm font-bold">{event.title}</span>
            </div>
          )}

          {/* Floating Badges */}
          <div className="absolute inset-x-2.5 top-2.5 flex items-center justify-between gap-2">
            <span className="rounded-full bg-slate-900/80 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-xs backdrop-blur-md">
              {event.category.name}
            </span>
            {event.isSoldOut ? (
              <span className="rounded-full bg-rose-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
                Sold Out
              </span>
            ) : event.type === 'ONLINE' ? (
              <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
                Online
              </span>
            ) : null}
          </div>
        </div>

        {/* Card Body */}
        <div className="flex flex-1 flex-col justify-between p-4">
          <div>
            {/* Date with icon */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden />
              <span>{formattedDate}</span>
            </div>

            {/* Event Title */}
            <h3 className="mt-2 line-clamp-2 text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-blue-600">
              {event.title}
            </h3>

            {/* Venue & Location */}
            <div className="mt-2.5 flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
              <span className="truncate">
                {event.type === 'ONLINE' ? 'Online' : `${event.venueName ?? ''}${event.city ? `, ${event.city}` : ''}` || 'Lokasi menyusul'}
              </span>
            </div>

            {/* Organizer */}
            <p className="mt-1 truncate text-[11px] text-slate-400">
              By {event.organizer.organizationName}
            </p>
          </div>

          {/* Price & CTA Footer */}
          <div className="mt-4 border-t border-slate-100 pt-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  Mulai dari
                </p>
                <p className="text-base font-extrabold text-blue-600 tabular-nums">
                  {event.priceFrom === 0
                    ? 'Gratis'
                    : event.priceFrom !== null
                      ? formatIDR(event.priceFrom)
                      : 'Harga menyusul'}
                </p>
              </div>

              <span className="inline-flex items-center gap-0.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                Beli
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </div>
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
      className="text-xs font-semibold text-blue-600 underline underline-offset-4 hover:text-blue-800"
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
