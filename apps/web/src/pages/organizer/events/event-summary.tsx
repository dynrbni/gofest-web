import { useState } from 'react';
import { CalendarDays, ImageIcon, MapPin } from 'lucide-react';
import { assetUrl } from '@/lib/assets';
import { formatDateTime, formatTimeZoneLabel, fromDateTimeInput } from '@/lib/format';

interface EventSummaryProps {
  title: string;
  coverKey: string | null;
  type: 'OFFLINE' | 'ONLINE';
  venueName: string;
  address: string;
  city: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
}

function SummaryBanner({ coverKey, title }: { coverKey: string | null; title: string }) {
  const [failed, setFailed] = useState(false);
  return coverKey && !failed ? (
    <img
      src={assetUrl(coverKey)!}
      alt={`Banner ${title || 'acara'}`}
      width={1200}
      height={500}
      className="aspect-[12/5] w-full object-cover"
      onError={() => setFailed(true)}
    />
  ) : (
    <div className="flex aspect-[12/5] flex-col items-center justify-center gap-2 bg-slate-100 text-slate-600">
      <ImageIcon className="size-7" aria-hidden />
      <p className="text-xs">{failed ? 'Banner tidak dapat dimuat' : 'Banner belum ditambahkan'}</p>
    </div>
  );
}

function schedule(value: string, timezone: string) {
  if (!value) return 'Belum ditentukan';
  try {
    const iso = fromDateTimeInput(value, timezone);
    return iso ? formatDateTime(iso, timezone) : 'Belum ditentukan';
  } catch {
    return 'Jadwal belum valid';
  }
}

export function EventFormSummary(event: EventSummaryProps) {
  const location =
    event.type === 'ONLINE' ? 'Acara online' : event.venueName.trim() || 'Lokasi belum diisi';
  const address =
    event.type === 'OFFLINE'
      ? [event.address.trim(), event.city.trim()].filter(Boolean).join(', ')
      : '';
  return (
    <aside
      aria-labelledby="event-summary-heading"
      tabIndex={0}
      className="min-w-0 self-start overflow-hidden rounded-xl border border-slate-200 bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 xl:sticky xl:top-24 xl:max-h-[calc(100dvh-7rem)] xl:overflow-y-auto"
    >
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 id="event-summary-heading" className="text-sm font-semibold text-slate-900">
          Ringkasan acara
        </h2>
      </div>
      <SummaryBanner key={event.coverKey} coverKey={event.coverKey} title={event.title} />
      <div className="space-y-5 p-5">
        <h3 className="break-words text-lg font-semibold leading-6 text-slate-950">
          {event.title.trim() || 'Nama acara belum diisi'}
        </h3>
        <dl className="space-y-5 text-sm">
          <div className="relative min-w-0 pl-7">
            <dt className="text-xs text-slate-500">
              <MapPin className="absolute left-0 top-0.5 size-4 text-blue-700" aria-hidden />
              Lokasi
            </dt>
            <dd className="mt-1 break-words leading-6 text-slate-900">
              {location}
              {address && (
                <span className="mt-0.5 block text-xs leading-5 text-slate-600">{address}</span>
              )}
            </dd>
          </div>
          {(
            [
              ['Mulai', event.startsAt],
              ['Selesai', event.endsAt],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="relative min-w-0 pl-7">
              <dt className="text-xs text-slate-500">
                <CalendarDays
                  className="absolute left-0 top-0.5 size-4 text-blue-700"
                  aria-hidden
                />
                {label}
              </dt>
              <dd className="mt-1 leading-6 text-slate-900">{schedule(value, event.timezone)}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-slate-500">{formatTimeZoneLabel(event.timezone)}</p>
        <p className="border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
          Ringkasan mengikuti isian form. Simpan perubahan untuk menerapkannya.
        </p>
      </div>
    </aside>
  );
}
