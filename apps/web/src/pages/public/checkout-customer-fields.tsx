import { Venus, Mars, Ticket, UserRound } from 'lucide-react';
import { ageOnDate, checkoutToday, IDENTITY_TYPES, IDENTITY_LABELS } from '@gofest/shared';
import { emptyHolder, type PersonDraft, type HolderDraft } from './checkout-customer-model';
import { Field } from '@/components/common/states';
import { InternationalPhone } from '@/components/common/international-phone';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function CheckoutCustomerFields({
  person,
  onChange,
  prefix,
  errors,
  holder = false,
}: {
  person: PersonDraft | HolderDraft;
  onChange: (person: HolderDraft) => void;
  prefix: string;
  errors: Record<string, string | undefined>;
  holder?: boolean;
}) {
  const data = { ...emptyHolder, ...person };
  const id = (field: string) => `${prefix}-${field}`;
  const error = (field: string) => errors[field];
  const change = (field: string, value: string) => onChange({ ...data, [field]: value });
  const underage =
    data.birthDate && ageOnDate(data.birthDate) !== null && ageOnDate(data.birthDate)! < 17;
  const input = (
    field: 'name' | 'email' | 'identityNumber',
    label: string,
    autocomplete?: string,
  ) => (
    <Field label={label} htmlFor={id(field)} error={error(field)} required>
      <Input
        id={id(field)}
        autoComplete={autocomplete}
        type={field === 'email' ? 'email' : 'text'}
        value={data[field]}
        onChange={(event) => change(field, event.target.value)}
        maxLength={field === 'name' ? 120 : field === 'identityNumber' ? 50 : 254}
        aria-invalid={Boolean(error(field))}
        aria-describedby={error(field) ? `${id(field)}-error` : undefined}
        className="h-12 rounded-xl border-slate-200 bg-white"
      />
    </Field>
  );
  return (
    <div className="space-y-5 rounded-xl bg-white p-4 sm:p-5">
      {input('name', 'Nama lengkap', 'name')}
      {input('email', 'Email', 'email')}
      {holder ? (
        <>
          <fieldset aria-describedby={error('gender') ? `${id('gender')}-error` : undefined}>
            <legend className="mb-2 text-sm font-medium text-slate-700">
              Jenis kelamin <span className="text-rose-600">*</span>
            </legend>
            <div className="flex flex-wrap gap-3">
              {(['MALE', 'FEMALE'] as const).map((gender) => {
                const Icon = gender === 'MALE' ? Mars : Venus;
                return (
                  <label
                    key={gender}
                    className={cn(
                      'relative flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm font-medium text-slate-600 focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2',
                      data.gender === gender
                        ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600'
                        : 'border-slate-300 hover:border-blue-400',
                    )}
                  >
                    <input
                      type="radio"
                      name={id('gender')}
                      value={gender}
                      checked={data.gender === gender}
                      onChange={() => change('gender', gender)}
                      className="sr-only"
                    />
                    <Icon className="size-5" aria-hidden />
                    {gender === 'MALE' ? 'Laki-laki' : 'Perempuan'}
                  </label>
                );
              })}
            </div>
            {error('gender') ? (
              <p id={`${id('gender')}-error`} className="mt-2 text-xs text-rose-600">
                {error('gender')}
              </p>
            ) : null}
          </fieldset>
          <Field
            label="Tanggal lahir"
            htmlFor={id('birthDate')}
            error={error('birthDate')}
            hint="Usia dihitung saat pemesanan. Di bawah 17 tahun hanya dapat memakai Kartu Pelajar atau Paspor."
            required
          >
            <Input
              id={id('birthDate')}
              type="date"
              min="1900-01-01"
              max={checkoutToday()}
              value={data.birthDate}
              onChange={(event) => change('birthDate', event.target.value)}
              aria-invalid={Boolean(error('birthDate'))}
              aria-describedby={error('birthDate') ? `${id('birthDate')}-error` : undefined}
              className="h-12 min-w-0 rounded-xl border-slate-200 bg-white"
            />
          </Field>
        </>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <Field
          label="Tipe identitas"
          htmlFor={id('identityType')}
          error={error('identityType')}
          required
        >
          <select
            id={id('identityType')}
            value={data.identityType}
            onChange={(event) => change('identityType', event.target.value)}
            aria-invalid={Boolean(error('identityType'))}
            aria-describedby={error('identityType') ? `${id('identityType')}-error` : undefined}
            className="h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <option value="">Pilih tipe identitas</option>
            {IDENTITY_TYPES.map((type) => (
              <option
                key={type}
                value={type}
                disabled={Boolean(underage && (type === 'KTP' || type === 'SIM'))}
              >
                {IDENTITY_LABELS[type]}
              </option>
            ))}
          </select>
        </Field>
        {input('identityNumber', 'Nomor identitas')}
      </div>
      <Field label="Nomor WhatsApp / HP" htmlFor={id('phone')} error={error('phone')} required>
        <InternationalPhone
          id={id('phone')}
          label={holder ? 'pemegang tiket' : 'pemesan'}
          value={data.phone}
          onChange={(value) => change('phone', value)}
          error={error('phone')}
        />
      </Field>
    </div>
  );
}

export function CustomerPanel({
  title,
  children,
  attendee = false,
  action,
}: {
  title: string;
  children: React.ReactNode;
  attendee?: boolean;
  action?: React.ReactNode;
}) {
  const Icon = attendee ? Ticket : UserRound;
  return (
    <section className="rounded-2xl bg-blue-50 p-4 sm:p-5" aria-label={title}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-lg font-semibold">
          <Icon className="size-5 shrink-0 text-blue-600" aria-hidden />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
