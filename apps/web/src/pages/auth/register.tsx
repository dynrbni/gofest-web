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

export function RegisterPage() {
  useDocumentTitle('Daftar');
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
    if (form.name.trim().length < 2) next.name = 'Nama minimal 2 karakter';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Format email tidak valid';
    if (form.phone.trim() && !/^(\+62|62|0)8[1-9][0-9]{6,12}$/.test(form.phone.replace(/[\s-]/g, ''))) {
      next.phone = 'Nomor WhatsApp tidak valid';
    }
    if (form.password.length < 8) next.password = 'Password minimal 8 karakter';
    else if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      next.password = 'Password harus mengandung huruf dan angka';
    }
    if (form.password !== form.confirm) next.confirm = 'Konfirmasi password tidak sama';
    if (!accepted) next.terms = 'Kamu perlu menyetujui syarat layanan dan kebijakan privasi';
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
      toast.success('Akun dibuat. Kamu sudah masuk.');
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
      title="Daftar"
      lede="Satu akun untuk membeli tiket dan mengelola acara. Nomor WhatsApp opsional, tetapi membantu organizer menghubungimu."
      footer={
        <>
          Sudah punya akun?{' '}
          <Link to="/login" className="font-semibold text-ink underline underline-offset-4">
            Masuk
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Nama lengkap" htmlFor="register-name" error={errors.name} required>
          <Input
            id="register-name"
            autoComplete="name"
            value={form.name}
            onChange={(event) => setField('name', event.target.value)}
            className="h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
          />
        </Field>
        <Field label="Email" htmlFor="register-email" error={errors.email} required>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => setField('email', event.target.value)}
            className="h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
          />
        </Field>
        <Field
          label="Nomor WhatsApp"
          htmlFor="register-phone"
          hint="Contoh: 081234567890. Boleh dikosongkan."
          error={errors.phone}
        >
          <Input
            id="register-phone"
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
          hint="Minimal 8 karakter, mengandung huruf dan angka."
          error={errors.password}
          required
        >
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => setField('password', event.target.value)}
            className="h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
          />
        </Field>
        <Field label="Ulangi password" htmlFor="register-confirm" error={errors.confirm} required>
          <Input
            id="register-confirm"
            type="password"
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
              Saya menyetujui{' '}
              <Link to="/terms" className="font-bold text-blue-600 underline underline-offset-4">
                Syarat Layanan
              </Link>{' '}
              dan{' '}
              <Link to="/privacy" className="font-bold text-blue-600 underline underline-offset-4">
                Kebijakan Privasi
              </Link>
              .
            </span>
          </label>
          {errors.terms ? (
            <p id="register-terms-error" className="mt-1 text-xs font-semibold text-rose-600">
              {errors.terms}
            </p>
          ) : null}
        </div>

        {error ? <InlineError error={error} /> : null}

        <Button
          type="submit"
          disabled={submitting}
          className="h-12 w-full rounded-xl bg-blue-600 font-bold text-white shadow-md transition-all hover:bg-blue-700 active:scale-95"
        >
          {submitting ? 'Membuat akun...' : 'Daftar Sekarang'}
        </Button>
      </form>
    </AuthShell>
  );
}