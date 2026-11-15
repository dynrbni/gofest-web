import { useState, type Ref } from 'react';
import { Check, Circle, Eye, EyeOff } from 'lucide-react';
import { PASSWORD_PATTERNS } from '@gofest/shared';
import { Field } from '@/components/common/states';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/lib/language';

export function RegistrationPassword({
  value,
  onChange,
  error,
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  inputRef: Ref<HTMLInputElement>;
}) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const checks = [
    { label: t('8–72 karakter', '8–72 characters'), met: value.length >= 8 && value.length <= 72 },
    { label: t('Huruf besar', 'Uppercase'), met: PASSWORD_PATTERNS.uppercase.test(value) },
    { label: t('Huruf kecil', 'Lowercase'), met: PASSWORD_PATTERNS.lowercase.test(value) },
    { label: t('Angka', 'Number'), met: PASSWORD_PATTERNS.number.test(value) },
    { label: t('Simbol', 'Symbol'), met: PASSWORD_PATTERNS.symbol.test(value) },
  ];
  const met = checks.filter((check) => check.met).length;
  const strength = !value
    ? 0
    : met < 3
      ? 1
      : met < 5
        ? 2
        : value.length >= 12 && new Set(value).size >= 8
          ? 4
          : 3;
  const labels = [
    t('Belum diisi', 'Not entered'),
    t('Lemah', 'Weak'),
    t('Cukup', 'Fair'),
    t('Baik', 'Good'),
    t('Kuat', 'Strong'),
  ];
  return (
    <div className="space-y-3">
      <Field label="Password" htmlFor="register-password" error={error} required>
        <div className="relative">
          <Input
            ref={inputRef}
            id="register-password"
            type={visible ? 'text' : 'password'}
            autoComplete="new-password"
            maxLength={72}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'register-password-error' : 'password-requirements'}
            className="h-11 rounded-xl border-slate-200 bg-white pr-12"
          />
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={
              visible
                ? t('Sembunyikan password', 'Hide password')
                : t('Tampilkan password', 'Show password')
            }
            className="absolute right-0 top-0 flex size-11 items-center justify-center rounded-lg text-slate-600 hover:text-blue-700"
          >
            {visible ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </button>
        </div>
      </Field>
      <div>
        <div className="mb-1.5 flex justify-between gap-2 text-xs text-slate-600">
          <span>{t('Kekuatan password', 'Password strength')}</span>
          <span className="font-medium text-slate-900">{labels[strength]}</span>
        </div>
        <div
          role="meter"
          aria-label={t('Kekuatan password', 'Password strength')}
          aria-valuemin={0}
          aria-valuemax={4}
          aria-valuenow={strength}
          aria-valuetext={labels[strength]}
          className="grid grid-cols-4 gap-1.5"
        >
          {[1, 2, 3, 4].map((segment) => (
            <span
              key={segment}
              aria-hidden
              className={`h-1 rounded-full ${segment > strength ? 'bg-slate-200' : strength < 2 ? 'bg-rose-600' : strength < 3 ? 'bg-amber-600' : 'bg-blue-600'}`}
            />
          ))}
        </div>
      </div>
      <ul id="password-requirements" className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs leading-4">
        {checks.map((check) => (
          <li
            key={check.label}
            className={`flex items-center gap-1.5 ${check.met ? 'text-blue-700' : 'text-slate-600'}`}
          >
            {check.met ? (
              <Check className="size-3 shrink-0" aria-hidden />
            ) : (
              <Circle className="size-3 shrink-0" aria-hidden />
            )}
            <span className="sr-only">
              {check.met ? t('Terpenuhi: ', 'Met: ') : t('Belum terpenuhi: ', 'Not met: ')}
            </span>
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
