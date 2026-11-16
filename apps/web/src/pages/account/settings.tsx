import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Globe2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/language';
import { useDocumentTitle } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/api';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { AccountHeading } from './account-components';
import { AccountSecurity } from './account-security';

export function AccountSettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  useDocumentTitle(t('Pengaturan', 'Settings'));
  async function signOut() {
    setLeaving(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLeaving(false);
    }
  }
  return (
    <>
      <AccountHeading
        title={t('Pengaturan', 'Settings')}
        description={t(
          'Atur preferensi dan akses akunmu.',
          'Manage your preferences and account access.',
        )}
      />
      <div className="account-profile-grid">
        <div className="account-detail-stack">
          <section className="account-panel">
            <Globe2 size={23} className="mb-4 text-[#0052CC]" aria-hidden />
            <h2>{t('Preferensi akun', 'Account preferences')}</h2>
            <p className="account-panel-description">
              {t(
                'Pilihan bahasa disimpan pada browser ini.',
                'Your language preference is saved in this browser.',
              )}
            </p>
            <label className="mt-5 grid max-w-xs gap-2 text-xs" htmlFor="account-language">
              {t('Bahasa tampilan', 'Display language')}
              <select
                id="account-language"
                value={language}
                onChange={(event) => setLanguage(event.target.value === 'en' ? 'en' : 'id')}
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-3"
              >
                <option value="id">Bahasa Indonesia</option>
                <option value="en">English</option>
              </select>
            </label>
          </section>
          <section className="account-panel">
            <h2>{t('Informasi event dan pesanan', 'Event and order information')}</h2>
            <p className="account-panel-description">
              {t(
                'Gunakan halaman pesanan untuk memeriksa status terbaru. Preferensi notifikasi belum dapat diatur dari akun.',
                'Check your orders for the latest status. Account notification preferences are not available yet.',
              )}
            </p>
            <Link className="account-text-link mt-3" to="/account/orders">
              {t('Lihat pesanan', 'View orders')}
            </Link>
          </section>
          <section className="account-panel">
            <h2>{t('Sesi akun', 'Account session')}</h2>
            <p className="account-panel-description">
              {t('Keluar dari sesi pada browser ini.', 'Sign out of the session in this browser.')}
            </p>
            <ConfirmDialog
              trigger={
                <button className="account-secondary mt-5" disabled={leaving}>
                  <LogOut size={16} aria-hidden />
                  {leaving ? t('Keluar…', 'Signing out…') : t('Keluar dari akun', 'Log out')}
                </button>
              }
              title={t('Keluar dari akun?', 'Log out?')}
              description={t(
                'Kamu perlu masuk kembali untuk membuka tiket dan pesanan.',
                'You will need to sign in again to access tickets and orders.',
              )}
              confirmLabel={t('Keluar', 'Log out')}
              cancelLabel={t('Batal', 'Cancel')}
              onConfirm={() => void signOut()}
            />
          </section>
        </div>
        <AccountSecurity />
      </div>
    </>
  );
}
