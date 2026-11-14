import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Field, InlineError } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import { AuthShell } from './auth-shell';

export function ForgotPasswordPage() {
  useDocumentTitle('Lupa password');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [fieldError, setFieldError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldError('Format email tidak valid');
      return;
    }
    setFieldError('');
    setSubmitting(true);
    try {
      await api('/auth/forgot-password', { method: 'POST', body: { email: email.trim() } });
      setSent(true);
    } catch (caught) {
      setError(caught);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Lupa password"
      lede="Masukkan email akunmu. Kami akan mengirim tautan reset bila email tersebut terdaftar."
      footer={
        <Link to="/login" className="font-semibold text-ink underline underline-offset-4">
          Kembali ke halaman masuk
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-4">
          <div className="border-l-4 border-olive bg-olive/5 px-4 py-3">
            <p className="text-sm font-bold text-olive">Permintaan diterima</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Bila email tersebut terdaftar, tautan reset akan dikirim. Tautan berlaku terbatas dan hanya
              dapat dipakai sekali.
            </p>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Pada lingkungan pengembangan dengan pengiriman email console, tautan tercatat di log server.
            Di production, tautan dikirim melalui SMTP yang dikonfigurasi.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Email" htmlFor="forgot-email" error={fieldError} required>
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 border-ink/25 bg-paper"
            />
          </Field>
          {error ? <InlineError error={error} /> : null}
          <Button
            type="submit"
            disabled={submitting}
            className="h-11 w-full bg-brick text-paper hover:bg-brick/90"
          >
            {submitting ? 'Mengirim permintaan...' : 'Kirim tautan reset'}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}