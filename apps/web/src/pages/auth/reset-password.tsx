import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Field, InlineError } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import { AuthShell } from './auth-shell';

export function ResetPasswordPage() {
  useDocumentTitle('Reset password');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const next: Record<string, string> = {};
    if (password.length < 8) next.password = 'Password minimal 8 karakter';
    else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      next.password = 'Password harus mengandung huruf dan angka';
    }
    if (password !== confirm) next.confirm = 'Konfirmasi password tidak sama';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, password } });
      toast.success('Password diperbarui. Silakan masuk dengan password baru.');
      navigate('/login', { replace: true });
    } catch (caught) {
      setError(caught);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthShell
        title="Token tidak ditemukan"
        lede="Halaman ini membutuhkan token reset dari email. Buka tautan terbaru dari emailmu, atau minta tautan baru."
        footer={
          <Link to="/login" className="font-semibold text-ink underline underline-offset-4">
            Kembali ke halaman masuk
          </Link>
        }
      >
        <Link
          to="/forgot-password"
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-brick text-sm font-semibold text-paper"
        >
          Minta tautan reset baru
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Password baru"
      lede="Buat password baru untuk akunmu. Setelah berhasil, semua sesi lama dicabut dan kamu perlu masuk kembali."
      footer={
        <Link to="/login" className="font-semibold text-ink underline underline-offset-4">
          Kembali ke halaman masuk
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field
          label="Password baru"
          htmlFor="reset-password"
          hint="Minimal 8 karakter, mengandung huruf dan angka."
          error={errors.password}
          required
        >
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 border-ink/25 bg-paper"
          />
        </Field>
        <Field label="Ulangi password" htmlFor="reset-confirm" error={errors.confirm} required>
          <Input
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className="h-11 border-ink/25 bg-paper"
          />
        </Field>
        {error ? <InlineError error={error} /> : null}
        <Button
          type="submit"
          disabled={submitting}
          className="h-11 w-full bg-brick text-paper hover:bg-brick/90"
        >
          {submitting ? 'Menyimpan password...' : 'Simpan password baru'}
        </Button>
      </form>
    </AuthShell>
  );
}