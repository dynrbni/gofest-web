import { useState } from 'react';
import { KeyRound, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/language';
import { ConfirmDialog } from '@/components/common/confirm-dialog';

export function AccountSecurity() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  async function sendReset() {
    if (!user || state === 'sending') return;
    setState('sending');
    setError(null);
    try {
      await api('/auth/forgot-password', { method: 'POST', body: { email: user.email } });
      setState('sent');
      toast.success(t('Permintaan reset password diterima.', 'Password reset requested.'));
    } catch (err) {
      setError(errorMessage(err));
      setState('idle');
    }
  }
  return (
    <section className="account-panel">
      <KeyRound size={23} className="mb-4 text-[#0052CC]" aria-hidden />
      <h2>{t('Keamanan akun', 'Account security')}</h2>
      <p className="account-panel-description">
        {t(
          'Ubah password melalui tautan verifikasi yang dikirim ke email akunmu.',
          'Change your password through a verification link sent to your account email.',
        )}
      </p>
      <ConfirmDialog
        trigger={
          <button
            type="button"
            className="account-secondary mt-5"
            disabled={state === 'sending' || state === 'sent'}
          >
            <Mail size={16} aria-hidden />
            {state === 'sending'
              ? t('Mengirim…', 'Sending…')
              : state === 'sent'
                ? t('Permintaan terkirim', 'Request sent')
                : t('Ubah password', 'Change password')}
          </button>
        }
        title={t('Kirim tautan reset password?', 'Send a password reset link?')}
        description={
          <p>
            {t('Tautan akan dikirim ke', 'The link will be sent to')}{' '}
            <strong className="break-all font-medium">{user?.email}</strong>.{' '}
            {t(
              'Gunakan tautan tersebut untuk membuat dan mengonfirmasi password baru.',
              'Use it to create and confirm a new password.',
            )}
          </p>
        }
        confirmLabel={t('Kirim tautan', 'Send link')}
        cancelLabel={t('Batal', 'Cancel')}
        onConfirm={() => void sendReset()}
      />
      {state === 'sent' ? (
        <p className="account-panel-description mt-4" role="status">
          {t(
            'Jika email terdaftar, tautan reset akan dikirim. Periksa inbox dan folder spam.',
            'If the email is registered, a reset link will be sent. Check your inbox and spam folder.',
          )}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 text-xs text-rose-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
