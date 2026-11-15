import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { emailSchema, usernameSchema, phoneSchema, passwordSchema } from '@gofest/shared';
import { Field, InlineError } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, ApiError, fieldErrors } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useDocumentTitle } from '@/lib/hooks';
import { useLanguage } from '@/lib/language';
import { AuthShell } from './auth-shell';

type Step = 'email' | 'otp' | 'profile' | 'password';
interface Challenge {
  challengeId: string;
  expiresAt: string;
  resendAt: string;
}
interface Verification {
  email: string;
  verificationToken: string;
  expiresAt: string;
}
const steps: Step[] = ['email', 'otp', 'profile', 'password'];
const inputClass = 'h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white';

export function RegisterPage() {
  const { t } = useLanguage();
  useDocumentTitle(t('Daftar', 'Sign up'));
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [form, setForm] = useState({ email: '', code: '', username: '', phone: '', password: '' });
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [now, setNow] = useState(Date.now());
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const firstInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInput.current?.focus({ preventScroll: true });
  }, [step]);
  useEffect(() => {
    if (step !== 'otp') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [step]);

  const resendSeconds = challenge
    ? Math.max(0, Math.ceil((Date.parse(challenge.resendAt) - now) / 1000))
    : 0;
  const expired = challenge ? now >= Date.parse(challenge.expiresAt) : false;
  const ledes = {
    email: t('Mulai dengan email yang kamu gunakan.', 'Start with your email address.'),
    otp: t(
      `Masukkan kode 6 digit dari email ${form.email}.`,
      `Enter the 6-digit code sent to ${form.email}.`,
    ),
    profile: t(
      'Email terverifikasi. Lengkapi profilmu.',
      'Email verified. Tell us about yourself.',
    ),
    password: t(
      'Buat password untuk mengamankan akunmu.',
      'Choose a password to protect your account.',
    ),
  };

  function change(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  function go(next: Step) {
    setErrors({});
    setError(null);
    setStep(next);
  }
  async function sendCode() {
    setSubmitting(true);
    setError(null);
    setErrors({});
    try {
      const data = await api<Challenge>('/auth/register/request-otp', {
        method: 'POST',
        body: { email: form.email },
      });
      setChallenge(data);
      setVerification(null);
      setNow(Date.now());
      change('code', '');
      setStep('otp');
      firstInput.current?.focus({ preventScroll: true });
    } catch (caught) {
      setError(caught);
      setErrors(fieldErrors(caught));
    } finally {
      setSubmitting(false);
    }
  }
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setErrors({});
    if (step === 'email') {
      if (!emailSchema.safeParse(form.email).success) {
        setErrors({ email: t('Masukkan email yang valid', 'Enter a valid email') });
        return;
      }
      await sendCode();
      return;
    }
    if (step === 'profile') {
      const next: Record<string, string> = {};
      if (!usernameSchema.safeParse(form.username).success)
        next.username = t(
          'Gunakan 3–24 huruf, angka, atau underscore.',
          'Use 3–24 letters, numbers, or underscores.',
        );
      if (!form.phone.trim() || !phoneSchema.safeParse(form.phone).success)
        next.phone = t(
          'Masukkan nomor telepon Indonesia yang valid.',
          'Enter a valid Indonesian phone number.',
        );
      if (Object.keys(next).length) {
        setErrors(next);
        return;
      }
      go('password');
      return;
    }
    if (step === 'otp' && !/^\d{6}$/.test(form.code)) {
      setErrors({ code: t('Masukkan 6 digit kode OTP', 'Enter the 6-digit code') });
      return;
    }
    if (step === 'password') {
      const next: Record<string, string> = {};
      if (!passwordSchema.safeParse(form.password).success)
        next.password = t(
          'Gunakan 8–72 karakter, dengan huruf dan angka.',
          'Use 8–72 characters, including letters and numbers.',
        );
      if (!accepted)
        next.terms = t(
          'Setujui syarat layanan dan kebijakan privasi.',
          'Please accept the terms and privacy policy',
        );
      if (Object.keys(next).length) {
        setErrors(next);
        return;
      }
    }
    setSubmitting(true);
    try {
      if (step === 'otp' && challenge) {
        const data = await api<Verification>('/auth/register/verify-otp', {
          method: 'POST',
          body: { challengeId: challenge.challengeId, code: form.code },
        });
        setVerification(data);
        change('email', data.email);
        go('profile');
      } else if (step === 'password' && verification) {
        await register({
          username: form.username,
          email: verification.email,
          phone: form.phone,
          password: form.password,
          verificationToken: verification.verificationToken,
        });
        toast.success(
          t('Akun dibuat. Kamu sudah masuk.', 'Account created. You are now logged in.'),
        );
        navigate('/account', { replace: true });
      }
    } catch (caught) {
      setError(caught);
      setErrors(fieldErrors(caught));
      if (caught instanceof ApiError && caught.code === 'USERNAME_TAKEN') {
        setStep('profile');
        setErrors({ username: caught.message });
      }
      if (caught instanceof ApiError && caught.code === 'REGISTRATION_VERIFICATION_REQUIRED') {
        setVerification(null);
        setStep('email');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      compact
      title={t('Buat akun Gofest', 'Create your Gofest account')}
      lede={ledes[step]}
      footer={
        <>
          {t('Sudah punya akun?', 'Already have an account?')}{' '}
          <Link to="/login">{t('Masuk', 'Log in')}</Link>
        </>
      }
    >
      <ol
        className="mb-5 grid grid-cols-4 gap-2 text-center text-xs"
        aria-label={t('Langkah pendaftaran', 'Registration steps')}
      >
        {steps.map((item, index) => (
          <li
            key={item}
            aria-current={step === item ? 'step' : undefined}
            className={`border-t-2 pt-2 ${index <= steps.indexOf(step) ? 'border-blue-600 text-blue-700' : 'border-slate-200 text-slate-500'}`}
          >
            {['Email', 'OTP', t('Profil', 'Profile'), 'Password'][index]}
          </li>
        ))}
      </ol>
      <form onSubmit={onSubmit} className="space-y-3" noValidate aria-busy={submitting}>
        {step === 'email' ? (
          <Field label="Email" htmlFor="register-email" error={errors.email} required>
            <Input
              ref={firstInput}
              id="register-email"
              type="email"
              autoComplete="email"
              maxLength={254}
              value={form.email}
              onChange={(event) => change('email', event.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'register-email-error' : undefined}
              placeholder="nama@email.com"
              className={inputClass}
            />
          </Field>
        ) : null}
        {step === 'otp' ? (
          <>
            <Field
              label={t('Kode OTP', 'OTP code')}
              htmlFor="register-code"
              error={errors.code}
              required
            >
              <Input
                ref={firstInput}
                id="register-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={form.code}
                onChange={(event) => change('code', event.target.value.replace(/\D/g, ''))}
                aria-invalid={Boolean(errors.code)}
                aria-describedby={errors.code ? 'register-code-error' : 'register-code-hint'}
                placeholder="000000"
                className={`${inputClass} text-center text-xl tracking-[0.4em]`}
              />
            </Field>
            <p id="register-code-hint" className="text-xs leading-5 text-slate-600">
              {expired
                ? t(
                    'Kode kedaluwarsa. Kirim ulang untuk mendapat kode baru.',
                    'Code expired. Request a new code.',
                  )
                : t(
                    'Kode berlaku 10 menit. Periksa juga folder spam.',
                    'The code expires in 10 minutes. Check your spam folder too.',
                  )}
            </p>
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-blue-700">
              <button
                type="button"
                onClick={() => {
                  setVerification(null);
                  go('email');
                }}
                disabled={submitting}
                className="min-h-8 hover:underline"
              >
                {t('Ubah email', 'Change email')}
              </button>
              <button
                type="button"
                onClick={sendCode}
                disabled={submitting || resendSeconds > 0}
                className="min-h-8 hover:underline disabled:text-slate-500"
              >
                {resendSeconds > 0
                  ? t(`Kirim ulang (${resendSeconds} dtk)`, `Resend (${resendSeconds}s)`)
                  : t('Kirim ulang kode', 'Resend code')}
              </button>
            </div>
          </>
        ) : null}
        {step === 'profile' ? (
          <>
            <Field label="Username" htmlFor="register-username" error={errors.username} required>
              <Input
                ref={firstInput}
                id="register-username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={24}
                value={form.username}
                onChange={(event) => change('username', event.target.value.toLowerCase())}
                aria-invalid={Boolean(errors.username)}
                aria-describedby={errors.username ? 'register-username-error' : undefined}
                placeholder="username_kamu"
                className={inputClass}
              />
            </Field>
            <Field
              label={t('Nomor telepon', 'Phone number')}
              htmlFor="register-phone"
              error={errors.phone}
              required
            >
              <Input
                id="register-phone"
                type="tel"
                autoComplete="tel"
                maxLength={24}
                value={form.phone}
                onChange={(event) => change('phone', event.target.value)}
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? 'register-phone-error' : undefined}
                placeholder="081234567890"
                className={inputClass}
              />
            </Field>
          </>
        ) : null}
        {step === 'password' ? (
          <>
            <Field label="Password" htmlFor="register-password" error={errors.password} required>
              <div className="relative">
                <Input
                  ref={firstInput}
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  maxLength={72}
                  value={form.password}
                  onChange={(event) => change('password', event.target.value)}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={
                    errors.password ? 'register-password-error' : 'register-password-hint'
                  }
                  className={`${inputClass} pr-12`}
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
            <p id="register-password-hint" className="text-xs text-slate-600">
              {t(
                '8–72 karakter, mengandung huruf dan angka.',
                '8–72 characters, with letters and numbers.',
              )}
            </p>
            <div>
              <label className="flex items-start gap-2 text-xs leading-5 text-slate-700">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(event) => setAccepted(event.target.checked)}
                  className="mt-1 size-4 shrink-0 accent-blue-600"
                  aria-describedby={errors.terms ? 'register-terms-error' : undefined}
                />
                <span>
                  {t('Saya menyetujui', 'I agree to the')}{' '}
                  <Link to="/terms" className="text-blue-700 underline">
                    {t('Syarat Layanan', 'Terms of service')}
                  </Link>{' '}
                  {t('dan', 'and')}{' '}
                  <Link to="/privacy" className="text-blue-700 underline">
                    {t('Kebijakan Privasi', 'Privacy policy')}
                  </Link>
                  .
                </span>
              </label>
              {errors.terms ? (
                <p id="register-terms-error" className="mt-1 text-xs text-rose-600">
                  {errors.terms}
                </p>
              ) : null}
            </div>
          </>
        ) : null}
        {error ? <InlineError error={error} /> : null}
        <Button
          type="submit"
          disabled={submitting || (step === 'otp' && expired)}
          className="h-11 w-full rounded-xl"
        >
          {submitting
            ? t('Memproses...', 'Processing...')
            : step === 'email'
              ? t('Kirim kode OTP', 'Send OTP code')
              : step === 'otp'
                ? t('Verifikasi email', 'Verify email')
                : step === 'profile'
                  ? t('Lanjutkan', 'Continue')
                  : t('Buat akun', 'Create account')}
        </Button>
        {step === 'profile' || step === 'password' ? (
          <button
            type="button"
            disabled={submitting}
            onClick={() => go(step === 'profile' ? 'email' : 'profile')}
            className="mx-auto flex min-h-8 items-center text-xs font-medium text-blue-700 hover:underline"
          >
            {step === 'profile'
              ? t('Ubah email', 'Change email')
              : t('Sebelumnya', 'Previous step')}
          </button>
        ) : null}
      </form>
    </AuthShell>
  );
}
