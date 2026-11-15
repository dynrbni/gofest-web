import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Field, InlineError } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fieldErrors } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useDocumentTitle } from '@/lib/hooks';
import { AuthShell } from './auth-shell';
import { useLanguage } from '@/lib/language';
import { Eye, EyeOff } from 'lucide-react';

export function RegisterPage() {
  const { t } = useLanguage();
  useDocumentTitle(t('Daftar', 'Sign up'));
  const [showPassword, setShowPassword] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  function setField(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2)
      next.name = t('Nama minimal 2 karakter', 'Enter at least 2 characters');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next.email = t('Format email tidak valid', 'Enter a valid email');
    if (
      form.phone.trim() &&
      !/^(\+62|62|0)8[1-9][0-9]{6,12}$/.test(form.phone.replace(/[\s-]/g, ''))
    ) {
      next.phone = t('Nomor WhatsApp tidak valid', 'Enter a valid Indonesian phone number');
    }
    if (form.password.length < 8)
      next.password = t('Password minimal 8 karakter', 'Use at least 8 characters');
    else if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      next.password = t('Password harus mengandung huruf dan angka', 'Include letters and numbers');
    }
    if (form.password !== form.confirm)
      next.confirm = t('Konfirmasi password tidak sama', 'Passwords do not match');
    if (!accepted)
      next.terms = t(
        'Kamu perlu menyetujui syarat layanan dan kebijakan privasi',
        'Please accept the terms and privacy policy',
      );
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
      });
      toast.success(t('Akun dibuat. Kamu sudah masuk.', 'Account created. You are now logged in.'));
      navigate('/account', { replace: true });
    } catch (caught) {
      setError(caught);
      setErrors(fieldErrors(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title={t('Buat akun Gofest', 'Create your Gofest account')}
      lede={t(
        'Buat akun untuk menyimpan tiket dan mengelola pesananmu.',
        'Create an account to keep your tickets and manage your orders.',
      )}
      footer={
        <>
          {t('Sudah punya akun?', 'Already have an account?')}{' '}
          <Link to="/login">{t('Masuk', 'Log in')}</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field
          label={t('Nama lengkap', 'Full name')}
          htmlFor="register-name"
          error={errors.name}
          required
        >
          <Input
            id="register-name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'register-name-error' : undefined}
            autoComplete="name"
            placeholder={t('Nama sesuai identitasmu', 'Your full name')}
            value={form.name}
            onChange={(event) => setField('name', event.target.value)}
            className="h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
          />
        </Field>
        <Field label="Email" htmlFor="register-email" error={errors.email} required>
          <Input
            id="register-email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'register-email-error' : undefined}
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            value={form.email}
            onChange={(event) => setField('email', event.target.value)}
            className="h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
          />
        </Field>
        <Field
          label={t('Nomor WhatsApp (opsional)', 'WhatsApp number (optional)')}
          htmlFor="register-phone"
          hint={t(
            'Contoh: 081234567890. Boleh dikosongkan.',
            'Example: 081234567890. You can leave this blank.',
          )}
          error={errors.phone}
        >
          <Input
            id="register-phone"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? 'register-phone-error' : undefined}
            inputMode="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(event) => setField('phone', event.target.value)}
            className="h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
          />
        </Field>
        <Field
          label="Password"
          htmlFor="register-password"
          hint={t(
            'Minimal 8 karakter, mengandung huruf dan angka.',
            'At least 8 characters with letters and numbers.',
          )}
          error={errors.password}
          required
        >
          <div className="relative">
            <Input
              id="register-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'register-password-error' : undefined}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => setField('password', event.target.value)}
              className="h-11 rounded-xl border-slate-200 bg-slate-50 pr-12 focus:bg-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={
                showPassword
                  ? t('Sembunyikan password', 'Hide password')
                  : t('Tampilkan password', 'Show password')
              }
              className="absolute right-0 top-0 flex size-11 items-center justify-center rounded-lg text-slate-600 hover:text-blue-700"
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden />
              ) : (
                <Eye className="size-4" aria-hidden />
              )}
            </button>
          </div>
        </Field>
        <Field
          label={t('Ulangi password', 'Confirm password')}
          htmlFor="register-confirm"
          error={errors.confirm}
          required
        >
          <Input
            id="register-confirm"
            aria-invalid={Boolean(errors.confirm)}
            aria-describedby={errors.confirm ? 'register-confirm-error' : undefined}
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={form.confirm}
            onChange={(event) => setField('confirm', event.target.value)}
            className="h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
          />
        </Field>

        <div>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-1 h-4 w-4 rounded accent-blue-600"
              aria-describedby={errors.terms ? 'register-terms-error' : undefined}
            />
            <span>
              {t('Saya menyetujui', 'I agree to the')}{' '}
              <Link to="/terms" className="font-medium text-blue-600 underline underline-offset-4">
                {t('Syarat Layanan', 'Terms of service')}
              </Link>{' '}
              {t('dan', 'and')}{' '}
              <Link
                to="/privacy"
                className="font-medium text-blue-600 underline underline-offset-4"
              >
                {t('Kebijakan Privasi', 'Privacy policy')}
              </Link>
              .
            </span>
          </label>
          {errors.terms ? (
            <p id="register-terms-error" className="mt-1 text-xs font-medium text-rose-600">
              {errors.terms}
            </p>
          ) : null}
        </div>

        {error ? <InlineError error={error} /> : null}

        <Button
          type="submit"
          disabled={submitting}
          className="h-12 w-full rounded-xl bg-blue-600 font-medium text-white shadow-md transition-all hover:bg-blue-700 active:scale-95"
        >
          {submitting
            ? t('Membuat akun...', 'Creating account...')
            : t('Buat akun', 'Create account')}
        </Button>
      </form>
    </AuthShell>
  );
}
