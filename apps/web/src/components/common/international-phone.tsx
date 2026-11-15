import { useState } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from '@gofest/shared';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

const countryNames = new Intl.DisplayNames(['id'], { type: 'region' });
const englishNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countries = getCountries()
  .map((code) => ({
    code,
    name: countryNames.of(code) ?? code,
    english: englishNames.of(code) ?? code,
    dial: getCountryCallingCode(code),
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'id'));
const flag = (code: string) =>
  String.fromCodePoint(...[...code].map((letter) => 127397 + letter.charCodeAt(0)));

export function InternationalPhone({
  id,
  value,
  onChange,
  error,
  label,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label: string;
}) {
  const parsed = parsePhoneNumberFromString(value, 'ID');
  const [selectedCountry, setCountry] = useState<CountryCode>(parsed?.country ?? 'ID');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const country =
    parsed?.countryCallingCode &&
    parsed.countryCallingCode !== getCountryCallingCode(selectedCountry)
      ? (parsed.country ?? selectedCountry)
      : selectedCountry;
  const calling = getCountryCallingCode(country);
  const matches = countries.filter((entry) =>
    `${entry.name} ${entry.english} ${entry.code} +${entry.dial}`
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase().trim()),
  );
  return (
    <div className="flex min-w-0 rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2">
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch('');
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex min-h-12 shrink-0 items-center gap-2 rounded-l-xl border-r border-slate-200 px-3 hover:bg-blue-50"
            aria-label={`Negara ${label}: ${countryNames.of(country)} +${calling}`}
          >
            <span aria-hidden>{flag(country)}</span>
            <ChevronDown className="size-3.5" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          aria-label={`Pilih negara ${label}`}
          align="start"
          className="w-[min(360px,calc(100vw-32px))] p-2"
        >
          <div className="relative">
            <Search className="absolute left-3 top-3.5 size-4 text-slate-500" aria-hidden />
            <Input
              aria-label="Cari negara atau kode telepon"
              placeholder="Cari negara atau kode telepon"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 pl-9"
            />
          </div>
          <div className="mt-2 max-h-64 overflow-y-auto" aria-label="Pilihan negara">
            {matches.length ? (
              matches.map((entry) => (
                <button
                  type="button"
                  key={entry.code}
                  onClick={() => {
                    const national =
                      parsed?.nationalNumber ??
                      value.replace(new RegExp(`^\\+${calling}`), '').replace(/^0/, '');
                    setCountry(entry.code);
                    onChange(`+${entry.dial}${national}`);
                    setOpen(false);
                    setSearch('');
                  }}
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-blue-50 focus-visible:bg-blue-50"
                  aria-label={`${entry.name} +${entry.dial}`}
                >
                  <span aria-hidden>{flag(entry.code)}</span>
                  <span className="min-w-0 flex-1">{entry.name}</span>
                  <span className="text-slate-500">+{entry.dial}</span>
                  {entry.code === country ? (
                    <Check className="size-4 shrink-0 text-blue-700" aria-hidden />
                  ) : null}
                </button>
              ))
            ) : (
              <p className="p-3 text-sm text-slate-600" role="status">
                Negara tidak ditemukan.
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
      <Input
        id={id}
        type="tel"
        autoComplete="tel"
        value={value || `+${calling}`}
        onChange={(event) => {
          const raw = event.target.value;
          onChange(
            raw.startsWith('+') || !raw
              ? raw
              : (parsePhoneNumberFromString(raw, country)?.number ?? raw),
          );
        }}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="h-12 min-w-0 rounded-l-none rounded-r-xl border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </div>
  );
}
