import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { api, fieldErrors, ApiError } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import { Field, InlineError } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function AccountProfilePage() {
  useDocumentTitle('Profil Saya');
  const { user, refreshMe } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    setGeneralError(null);

    if (!name.trim()) {
      setErrors({ name: 'Nama lengkap wajib diisi' });
      return;
    }

    setSaving(true);
    try {
      await api('/auth/profile', {
        method: 'PATCH',
        body: {
          name: name.trim(),
          phone: phone.trim() || undefined,
        },
      });
      await refreshMe();
      toast.success('Profil berhasil diperbarui');
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setErrors(fieldErrors(err));
      } else {
        setGeneralError(err);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Informasi Akun</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Perbarui nama dan nomor kontak untuk komunikasi pesanan tiketmu
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <InlineError error={generalError} />

        <Field label="Alamat Email" htmlFor="email" hint="Email login tidak dapat diubah langsung">
          <Input id="email" value={user?.email ?? ''} disabled className="bg-slate-100 text-slate-500 cursor-not-allowed rounded-xl border-slate-200" />
        </Field>

        <Field label="Nama Lengkap" htmlFor="name" required error={errors.name}>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama lengkap sesuai identitas"
            required
            className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
          />
        </Field>

        <Field label="Nomor WhatsApp / Telepon" htmlFor="phone" hint="Opsional, untuk konfirmasi acara" error={errors.phone}>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Contoh: 08123456789"
            className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
          />
        </Field>

        <div className="pt-2">
          <Button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-6 font-bold text-white shadow-xs hover:bg-blue-700">
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      </form>
    </div>
  );
}
