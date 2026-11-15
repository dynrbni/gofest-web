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
import { useLanguage } from '@/lib/language';

function safeNext(value: string | null) {
  if (value && value.startsWith('/') && !value.startsWith('//')) return value;
  return null;
}

export function LoginPage() {
  const { t } = useLanguage();
  useDocumentTitle(t('Masuk', 'Log in'));
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
    if (!email.trim()) nextErrors.email = t('Email wajib diisi', 'Enter your email');
    if (!password) nextErrors.password = t('Password wajib diisi', 'Enter your password');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const user = await login({ email: email.trim(), password });
      toast.success(`${t('Selamat datang', 'Welcome')}, ${user.name.split(' ')[0]}`);
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
      title={t('Masuk ke Gofest', 'Log in to Gofest')}
      lede={t(
        'Masuk untuk membuka tiket dan melanjutkan rencana serumu.',
        'Log in to access your tickets and pick up where you left off.',
      )}
      footer={
        <>
          {t('Belum punya akun?', 'New to Gofest?')}{' '}
          <Link to="/register">{t('Daftar sekarang', 'Create an account')}</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Email" htmlFor="login-email" error={errors.email} required>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder={t('Masukkan email kamu', 'Enter your email')}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            className="h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
          />
        </Field>

        <Field label="Password" htmlFor="login-password" error={errors.password} required>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder={t('Masukkan password kamu', 'Enter your password')}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              className="h-11 rounded-xl border-slate-200 bg-slate-50 pr-10 focus:bg-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:text-slate-800"
              aria-label={
                showPassword
                  ? t('Sembunyikan password', 'Hide password')
                  : t('Tampilkan password', 'Show password')
              }
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
        </Field>

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs font-medium text-blue-600 hover:underline">
            {t('Lupa password?', 'Forgot password?')}
          </Link>
        </div>

        {error ? <InlineError error={error} /> : null}

        <Button
          type="submit"
          disabled={submitting}
          className="h-12 w-full rounded-xl bg-blue-600 font-medium text-white shadow-md transition-all hover:bg-blue-700 active:scale-95"
        >
          {submitting ? t('Memeriksa akun...', 'Logging in...') : t('Masuk', 'Log in')}
        </Button>
      </form>
    </AuthShell>
  );
}
