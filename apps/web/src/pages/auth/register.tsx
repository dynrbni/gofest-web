import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { registerSchema, passwordSchema } from '@gofest/shared';
import { Field, InlineError } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, ApiError, fieldErrors } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useDocumentTitle } from '@/lib/hooks';
import { useLanguage } from '@/lib/language';
import { AuthShell } from './auth-shell';
import { PersonalInformationFields, type PersonalInformation } from './personal-information';
import { RegistrationPassword } from './password-field';

type Step = 'personal' | 'password' | 'verification';
interface Challenge {
  challengeId: string;
  expiresAt: string;
  resendAt: string;
  testMode: boolean;
  email: string;
}
interface Verification {
  email: string;
  verificationToken: string;
  expiresAt: string;
}
const personalSchema = registerSchema.pick({
  name: true,
  username: true,
  phone: true,
  email: true,
});

export function RegisterPage() {
  const { t } = useLanguage();
  useDocumentTitle(t('Daftar', 'Sign up'));
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('personal');
  const [form, setForm] = useState<PersonalInformation & { password: string }>({
    name: '',
    username: '',
    phone: '',
    email: '',
    password: '',
  });
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [now, setNow] = useState(Date.now());
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const firstInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInput.current?.focus({ preventScroll: true });
  }, [step]);
  useEffect(() => {
    if (step !== 'verification') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [step]);

  const resendSeconds = challenge
    ? Math.max(0, Math.ceil((Date.parse(challenge.resendAt) - now) / 1000))
    : 0;
  const expired = challenge ? now >= Date.parse(challenge.expiresAt) : false;
  const titles = {
    personal: t('Selamat datang di Gofest!', 'Welcome to Gofest!'),
    password: t('Buat password', 'Create a password'),
    verification: t('Verifikasi email', 'Verify your email'),
  };
  const ledes = {
    personal: t('Silahkan isi data diri kamu untuk melanjutkan pendaftaran akunmu.', 'Please fill in your personal information to continue your account registration.'),
    password: t(
      'Gunakan password yang kuat untuk akunmu.',
      'Choose a strong password for your account.',
    ),
    verification: t(
      `Masukkan kode 6 digit untuk ${form.email}.`,
      `Enter the 6-digit code for ${form.email}.`,
    ),
  };

  function change(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === 'email' && value.trim().toLowerCase() !== form.email.trim().toLowerCase()) {
      setChallenge(null);
      setVerification(null);
      setCode('');
    }
  }
  function go(next: Step) {
    setErrors({});
    setError(null);
    setNow(Date.now());
    setStep(next);
  }
  async function sendCode() {
    const email = form.email.trim().toLowerCase();
    const data = await api<Omit<Challenge, 'email'>>('/auth/register/request-otp', {
      method: 'POST',
      body: { email },
    });
    setChallenge({ ...data, email });
    setVerification(null);
    setCode('');
    go('verification');
    firstInput.current?.focus({ preventScroll: true });
  }
  async function finish(proof: Verification) {
    await register({
      name: form.name,
      username: form.username,
      email: proof.email,
      phone: form.phone,
      password: form.password,
      verificationToken: proof.verificationToken,
    });
    toast.success(t('Akun dibuat. Kamu sudah masuk.', 'Account created. You are now logged in.'));
    navigate('/account', { replace: true });
  }
  function handleError(caught: unknown) {
    setError(caught);
    const details = fieldErrors(caught);
    setErrors(details);
    if (caught instanceof ApiError && caught.code === 'USERNAME_TAKEN') {
      setStep('personal');
      setErrors({ username: caught.message });
    } else if (caught instanceof ApiError && caught.code === 'REGISTRATION_VERIFICATION_REQUIRED') {
      setVerification(null);
      setChallenge(null);
      setStep('password');
    } else if (['name', 'username', 'phone', 'email'].some((key) => details[key]))
      setStep('personal');
    else if (details.password) setStep('password');
  }
  async function resend() {
    setSubmitting(true);
    setError(null);
    setErrors({});
    try {
      await sendCode();
    } catch (caught) {
      handleError(caught);
    } finally {
      setSubmitting(false);
    }
  }
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setErrors({});
    if (step === 'personal') {
      const parsed = personalSchema.safeParse(form);
      if (!parsed.success) {
        const english: Record<string, string> = {
          name: 'Enter your full name (2–80 characters).',
          username: 'Use 3–24 letters, numbers or underscores.',
          phone: 'Enter a valid Indonesian phone number.',
          email: 'Enter a valid email',
        };
        setErrors(
          Object.fromEntries(
            parsed.error.issues.map((issue) => [
              String(issue.path[0]),
              t(issue.message, english[String(issue.path[0])] ?? issue.message),
            ]),
          ),
        );
        return;
      }
      setForm((current) => ({ ...current, ...parsed.data, phone: parsed.data.phone ?? '' }));
      go('password');
      return;
    }
    if (step === 'password') {
      const next: Record<string, string> = {};
      if (!passwordSchema.safeParse(form.password).success)
        next.password = t(
          'Penuhi semua persyaratan password di bawah.',
          'Meet all the password requirements below.',
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
    } else if (!/^\d{6}$/.test(code) && !verification) {
      setErrors({ code: t('Masukkan 6 digit kode OTP', 'Enter the 6-digit code') });
      return;
    }
    setSubmitting(true);
    try {
      const proofIsValid =
        verification &&
        verification.email === form.email.trim().toLowerCase() &&
        Date.parse(verification.expiresAt) > Date.now();
      if (proofIsValid) {
        await finish(verification);
        return;
      }
      if (step === 'password') {
        if (
          challenge &&
          challenge.email === form.email.trim().toLowerCase() &&
          Date.parse(challenge.expiresAt) > Date.now() &&
          !verification
        )
          go('verification');
        else await sendCode();
      } else if (challenge) {
        const proof = await api<Verification>('/auth/register/verify-otp', {
          method: 'POST',
          body: { challengeId: challenge.challengeId, code },
        });
        setVerification(proof);
        await finish(proof);
      }
    } catch (caught) {
      handleError(caught);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      compact
      title={titles[step]}
      lede={ledes[step]}
      footer={
        <>
          {t('Sudah punya akun?', 'Already have an account?')}{' '}
          <Link to="/login">{t('Masuk', 'Log in')}</Link>
        </>
      }
    >
      
      <form onSubmit={onSubmit} className="space-y-3" noValidate aria-busy={submitting}>
        {step === 'personal' ? (
          <PersonalInformationFields
            value={form}
            onChange={change}
            errors={errors}
            inputRef={firstInput}
          />
        ) : null}
        {step === 'password' ? (
          <>
            <RegistrationPassword
              value={form.password}
              onChange={(value) => change('password', value)}
              error={errors.password}
              inputRef={firstInput}
            />
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
        {step === 'verification' ? (
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
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                aria-invalid={Boolean(errors.code)}
                aria-describedby={errors.code ? 'register-code-error' : 'register-code-hint'}
                placeholder="000000"
                className="h-11 rounded-xl border-slate-200 bg-white text-center text-xl tracking-[0.4em]"
              />
            </Field>
            <p id="register-code-hint" className="text-xs leading-5 text-slate-600">
              {challenge?.testMode
                ? t(
                    'Mode testing: gunakan 6 digit angka apa saja.',
                    'Testing mode: enter any 6 digits.',
                  )
                : expired
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
                onClick={() => go('personal')}
                disabled={submitting}
                className="min-h-8 hover:underline"
              >
                {t('Ubah email', 'Change email')}
              </button>
              <button
                type="button"
                onClick={resend}
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
        {error ? <InlineError error={error} /> : null}
        <Button
          type="submit"
          disabled={submitting || (step === 'verification' && expired && !verification)}
          className="h-11 w-full rounded-xl"
        >
          {submitting
            ? t('Memproses...', 'Processing...')
            : step === 'verification'
              ? t('Verifikasi email', 'Verify email')
              : t('Lanjutkan', 'Continue')}
        </Button>
        {step !== 'personal' ? (
          <button
            type="button"
            disabled={submitting}
            onClick={() => go(step === 'password' ? 'personal' : 'password')}
            className="mx-auto flex min-h-8 items-center text-xs font-medium text-blue-700 hover:underline"
          >
            {t('Sebelumnya', 'Previous step')}
          </button>
        ) : null}
      </form>
    </AuthShell>
  );
}
