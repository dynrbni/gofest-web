import { Eye, EyeOff } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Field, InlineError } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDocumentTitle } from '@/lib/hooks';
import { fieldErrors } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { AuthShell } from './auth-shell';

function safeNext(value: string | null) {
  if (value && value.startsWith('/') && !value.startsWith('//')) return value;
  return null;
}

export function LoginPage() {
  useDocumentTitle('Masuk');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const nextErrors: Record<string, string> = {};
    if (!email.trim()) nextErrors.email = 'Email wajib diisi';
    if (!password) nextErrors.password = 'Password wajib diisi';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const user = await login({ email: email.trim(), password });
      toast.success(`Selamat datang, ${user.name.split(' ')[0]}`);
      const next = safeNext(searchParams.get('next'));
      if (next) {
        navigate(next, { replace: true });
      } else if (user.roles.includes('ADMIN')) {
        navigate('/admin', { replace: true });
      } else if (user.roles.includes('ORGANIZER')) {
        navigate('/organizer', { replace: true });
      } else if (user.roles.includes('STAFF')) {
        navigate('/staff/events', { replace: true });
      } else {
        navigate('/account', { replace: true });
      }
    } catch (caught) {
      setError(caught);
      setErrors(fieldErrors(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Masuk"
      lede="Gunakan email dan password akun Gofest. Kamu bisa membeli tiket tanpa akun, tetapi akun memudahkan akses ulang."
      footer={
        <>
          Belum punya akun?{' '}
          <Link to="/register" className="font-semibold text-ink underline underline-offset-4">
            Daftar
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Email" htmlFor="login-email" error={errors.email} required>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            className="h-11 border-ink/25 bg-paper"
          />
        </Field>

        <Field label="Password" htmlFor="login-password" error={errors.password} required>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              className="h-11 border-ink/25 bg-paper pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-sm text-muted-foreground hover:text-ink"
              aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </Field>

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs font-semibold text-olive underline underline-offset-4">
            Lupa password?
          </Link>
        </div>

        {error ? <InlineError error={error} /> : null}

        <Button
          type="submit"
          disabled={submitting}
          className="h-11 w-full bg-brick text-paper hover:bg-brick/90"
        >
          {submitting ? 'Memeriksa akun...' : 'Masuk'}
        </Button>
      </form>
    </AuthShell>
  );
}