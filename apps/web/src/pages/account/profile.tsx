import { useState, type FormEvent } from 'react';
import { updateProfileSchema } from '@gofest/shared';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { api, fieldErrors, ApiError } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import { useLanguage } from '@/lib/language';
import { Field, InlineError } from '@/components/common/states';
import { Input } from '@/components/ui/input';
import { AccountAvatar, AccountHeading } from './account-components';
import { AccountSecurity } from './account-security';

export function AccountProfilePage() {
  const { t } = useLanguage();
  useDocumentTitle(t('Profil Saya', 'My Profile'));
  const { user, refreshMe } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setErrors({});
    setGeneralError(null);
    setSaved(false);
    const parsed = updateProfileSchema.safeParse({ name, phone });
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])),
      );
      return;
    }
    setSaving(true);
    try {
      await api('/auth/profile', { method: 'PATCH', body: parsed.data });
      await refreshMe();
      setSaved(true);
      toast.success(t('Profil berhasil diperbarui', 'Profile updated'));
    } catch (error) {
      if (error instanceof ApiError && error.details) setErrors(fieldErrors(error));
      else setGeneralError(error);
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <AccountHeading
        title={t('Profil Saya', 'My Profile')}
        description={t(
          'Pastikan informasi akunmu selalu terbaru.',
          'Keep your account information up to date.',
        )}
      />
      <div className="account-profile-grid">
        <form
          className="account-panel account-profile-form"
          onSubmit={submit}
          noValidate
          aria-busy={saving}
        >
          <div className="account-profile-avatar">
            <AccountAvatar name={user?.name ?? ''} />
            <div className="min-w-0">
              <h2>{t('Informasi pribadi', 'Personal information')}</h2>
              <p>{t('Avatar menggunakan inisial namamu.', 'Your avatar uses your initials.')}</p>
            </div>
          </div>
          <InlineError error={generalError} />
          <Field
            label={t('Nama lengkap', 'Full name')}
            htmlFor="account-name"
            required
            error={errors.name}
          >
            <Input
              id="account-name"
              name="name"
              autoComplete="name"
              maxLength={80}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setSaved(false);
              }}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'account-name-error' : undefined}
            />
          </Field>
          <Field
            label="Email"
            htmlFor="account-email"
            hint={t(
              'Email login tidak dapat diubah langsung karena memerlukan verifikasi ulang.',
              'Changing your login email requires re-verification and is not currently available.',
            )}
          >
            <Input id="account-email" type="email" value={user?.email ?? ''} disabled />
          </Field>
          <Field
            label={t('Nomor WhatsApp', 'WhatsApp number')}
            htmlFor="account-phone"
            error={errors.phone}
            hint={t(
              'Nomor Indonesia, contoh +6281234567890. Opsional.',
              'Indonesian number, e.g. +6281234567890. Optional.',
            )}
          >
            <Input
              id="account-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={24}
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                setSaved(false);
              }}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? 'account-phone-error' : undefined}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" className="account-primary" disabled={saving}>
              {saving ? t('Menyimpan…', 'Saving…') : t('Simpan perubahan', 'Save changes')}
            </button>
            {saved ? (
              <p role="status" className="text-xs text-emerald-700">
                {t('Perubahan tersimpan.', 'Changes saved.')}
              </p>
            ) : null}
          </div>
        </form>
        <AccountSecurity />
      </div>
    </>
  );
}
