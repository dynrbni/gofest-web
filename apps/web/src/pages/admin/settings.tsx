import { useState, useEffect, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, fieldErrors, ApiError } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import { Field, InlineError, LoadingState, ErrorState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PlatformSettingsData {
  platformFeeType: 'none' | 'fixed' | 'percentage';
  platformFeeValue: number;
  orderReservationMinutes: number;
}

export function AdminSettingsPage() {
  useDocumentTitle('Pengaturan Platform · Super Admin');
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['admin-platform-settings'],
    queryFn: () => api<{ settings: PlatformSettingsData }>('/admin/settings'),
  });

  const settings = settingsQuery.data?.settings;

  const [feeType, setFeeType] = useState<'none' | 'fixed' | 'percentage'>('none');
  const [feeValue, setFeeValue] = useState('0');
  const [reservationMinutes, setReservationMinutes] = useState('15');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFeeType(settings.platformFeeType);
      setFeeValue(String(settings.platformFeeValue));
      setReservationMinutes(String(settings.orderReservationMinutes));
    }
  }, [settings]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    const valNum = Number(feeValue);
    const minNum = Math.floor(Number(reservationMinutes));

    if (feeType !== 'none' && valNum < 0) {
      setErrors({ platformFeeValue: 'Nilai biaya tidak boleh negatif' });
      return;
    }
    if (minNum < 1 || minNum > 120) {
      setErrors({ orderReservationMinutes: 'Batas reservasi antara 1 sampai 120 menit' });
      return;
    }

    setSaving(true);
    try {
      await api('/admin/settings', {
        method: 'PATCH',
        body: {
          platformFeeType: feeType,
          platformFeeValue: feeType === 'none' ? 0 : valNum,
          orderReservationMinutes: minNum,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-platform-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['platform-settings-public'] });
      toast.success('Pengaturan platform berhasil diperbarui');
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

  if (settingsQuery.isLoading) {
    return <LoadingState rows={4} label="Memuat pengaturan platform" />;
  }

  if (settingsQuery.isError || !settings) {
    return (
      <ErrorState
        error={settingsQuery.error ?? new Error('Gagal memuat pengaturan')}
        onRetry={() => void settingsQuery.refetch()}
      />
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="border-b border-warm-border pb-4">
        <h1 className="font-display text-3xl font-bold tracking-tightest">Konfigurasi Platform</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Pengaturan global untuk biaya layanan platform dan durasi reservasi kuota checkout
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 rounded-md border border-warm-border bg-card p-6">
        <InlineError error={generalError} />

        <div className="space-y-4">
          <Field label="Tipe Biaya Layanan Platform" htmlFor="feeType">
            <select
              id="feeType"
              value={feeType}
              onChange={(e) => setFeeType(e.target.value as 'none' | 'fixed' | 'percentage')}
              className="h-10 w-full rounded-md border border-ink/20 bg-card px-3 text-sm outline-none focus-visible:border-ink"
            >
              <option value="none">Tanpa Biaya (Gratis)</option>
              <option value="fixed">Nominal Tetap per Transaksi (Rp)</option>
              <option value="percentage">Persentase per Transaksi (%)</option>
            </select>
          </Field>

          {feeType !== 'none' ? (
            <Field
              label={feeType === 'percentage' ? 'Persentase Biaya (%)' : 'Nominal Biaya (Rp)'}
              htmlFor="feeVal"
              required
              error={errors.platformFeeValue}
            >
              <Input
                id="feeVal"
                type="number"
                min="0"
                step={feeType === 'percentage' ? '0.1' : '500'}
                value={feeValue}
                onChange={(e) => setFeeValue(e.target.value)}
                required
              />
            </Field>
          ) : null}

          <Field
            label="Durasi Reservasi Kuota Checkout (Menit)"
            htmlFor="reservationMin"
            hint="Batas waktu pembeli menyelesaikan pembayaran sebelum kuota dilepas worker otomatis"
            required
            error={errors.orderReservationMinutes}
          >
            <Input
              id="reservationMin"
              type="number"
              min="1"
              max="120"
              value={reservationMinutes}
              onChange={(e) => setReservationMinutes(e.target.value)}
              required
            />
          </Field>
        </div>

        <div className="pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
          </Button>
        </div>
      </form>
    </div>
  );
}
