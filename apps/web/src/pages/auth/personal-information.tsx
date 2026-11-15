import type { Ref } from 'react';
import { Field } from '@/components/common/states';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/lib/language';

export interface PersonalInformation {
  name: string;
  username: string;
  phone: string;
  email: string;
}

export function PersonalInformationFields({
  value,
  onChange,
  errors,
  inputRef,
}: {
  value: PersonalInformation;
  onChange: (key: keyof PersonalInformation, value: string) => void;
  errors: Record<string, string>;
  inputRef: Ref<HTMLInputElement>;
}) {
  const { t } = useLanguage();
  const fields = [
    {
      key: 'name',
      label: t('Nama lengkap', 'Full name'),
      placeholder: t('Nama lengkap', 'Full name'),
      type: 'text',
      autoComplete: 'name',
      maxLength: 80,
    },
    {
      key: 'username',
      label: 'Username',
      placeholder: 'username',
      type: 'text',
      autoComplete: 'username',
      maxLength: 24,
    },
    {
      key: 'phone',
      label: t('Nomor HP', 'Phone number'),
      placeholder: '081234567890',
      type: 'tel',
      autoComplete: 'tel',
      maxLength: 24,
    },
    {
      key: 'email',
      label: 'Email',
      placeholder: 'nama@email.com',
      type: 'email',
      autoComplete: 'email',
      maxLength: 254,
    },
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-3">
      {fields.map((field) => (
        <div
          key={field.key}
          className={
            field.key === 'name' || field.key === 'username' ? 'min-w-0' : 'col-span-2 min-w-0'
          }
        >
          <Field
            label={field.label}
            htmlFor={`register-${field.key}`}
            error={errors[field.key]}
            required
          >
            <Input
              ref={field.key === 'name' ? inputRef : undefined}
              id={`register-${field.key}`}
              type={field.type}
              autoComplete={field.autoComplete}
              autoCapitalize={field.key === 'name' ? 'words' : 'none'}
              spellCheck={field.key === 'name'}
              maxLength={field.maxLength}
              value={value[field.key]}
              onChange={(event) =>
                onChange(
                  field.key,
                  field.key === 'username' ? event.target.value.toLowerCase() : event.target.value,
                )
              }
              aria-invalid={Boolean(errors[field.key])}
              aria-describedby={errors[field.key] ? `register-${field.key}-error` : undefined}
              placeholder={field.placeholder}
              className="h-11 rounded-xl border-slate-200 bg-white"
            />
          </Field>
        </div>
      ))}
    </div>
  );
}
