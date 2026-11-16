import { format, formatDistanceToNowStrict } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export const DEFAULT_TZ = 'Asia/Jakarta';

export function defaultTimeZone() {
  return typeof document === 'undefined'
    ? DEFAULT_TZ
    : document.documentElement.dataset.siteTimezone || DEFAULT_TZ;
}

export function formatIDR(value: number | null | undefined) {
  if (value === null || value === undefined) return 'Gratis';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(value);
}

export function formatDateLong(iso: string, timeZone = defaultTimeZone()) {
  return formatInTimeZone(new Date(iso), timeZone, 'd MMMM yyyy', { locale: localeId });
}

export function formatDateShort(iso: string, timeZone = defaultTimeZone()) {
  return formatInTimeZone(new Date(iso), timeZone, 'd MMM yyyy', { locale: localeId });
}

export function formatDateTime(iso: string, timeZone = defaultTimeZone()) {
  return formatInTimeZone(new Date(iso), timeZone, 'd MMM yyyy, HH.mm', { locale: localeId });
}

export function formatTime(iso: string, timeZone = defaultTimeZone()) {
  return formatInTimeZone(new Date(iso), timeZone, 'HH.mm');
}

export function formatEventWhen(startsAt: string, endsAt: string, timeZone = defaultTimeZone()) {
  const sameDay =
    formatInTimeZone(new Date(startsAt), timeZone, 'yyyy-MM-dd') ===
    formatInTimeZone(new Date(endsAt), timeZone, 'yyyy-MM-dd');
  if (sameDay) {
    return `${formatDateLong(startsAt, timeZone)} · ${formatTime(startsAt, timeZone)} sampai ${formatTime(endsAt, timeZone)}`;
  }
  return `${formatDateLong(startsAt, timeZone)} ${formatTime(startsAt, timeZone)} sampai ${formatDateLong(endsAt, timeZone)} ${formatTime(endsAt, timeZone)}`;
}

export function dateParts(iso: string, timeZone = defaultTimeZone()) {
  const date = new Date(iso);
  return {
    day: formatInTimeZone(date, timeZone, 'dd'),
    month: formatInTimeZone(date, timeZone, 'MMM', { locale: localeId }).replace('.', ''),
    year: formatInTimeZone(date, timeZone, 'yyyy'),
    weekday: formatInTimeZone(date, timeZone, 'EEEE', { locale: localeId }),
  };
}

export function formatRelative(iso: string) {
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true, locale: localeId });
}

export function formatCountdown(ms: number) {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function toDateTimeInput(iso: string | null | undefined, timeZone = defaultTimeZone()) {
  if (!iso) return '';
  return formatInTimeZone(new Date(iso), timeZone, "yyyy-MM-dd'T'HH:mm");
}

export function fromDateTimeInput(value: string, timeZone = defaultTimeZone()) {
  if (!value) return null;
  return fromZonedTime(value, timeZone).toISOString();
}

export function formatTimeZoneLabel(timeZone: string) {
  if (timeZone === 'Asia/Jakarta') return 'Waktu Indonesia Barat';
  if (timeZone === 'Asia/Makassar') return 'Waktu Indonesia Tengah';
  if (timeZone === 'Asia/Jayapura') return 'Waktu Indonesia Timur';
  return timeZone;
}

export function formatDateForFilename(date = new Date()) {
  return format(date, 'yyyyMMdd-HHmm');
}
