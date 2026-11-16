import { useWorkspace } from '@/pages/workspace/workspace-hooks';

import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Power } from 'lucide-react';
import { api, fieldErrors, ApiError, errorMessage } from '@/lib/api';
import { formatIDR } from '@/lib/format';
import type { Coupon } from '@/lib/models';
import {
  EmptyState,
  ErrorState,
  Field,
  InlineError,
  LoadingState,
} from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export function EventCouponManagementPage() {
  const { apiBase } = useWorkspace();
  const { id: eventId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [openModal, setOpenModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  function openCoupon(coupon?: Coupon) {
    setEditingId(coupon?.id ?? null);
    setCode(coupon?.code ?? '');
    setDiscountType(coupon?.discountType ?? 'PERCENTAGE');
    setDiscountValue(String(coupon?.discountValue ?? 10));
    setMinPurchase(String(coupon?.minimumPurchase ?? 0));
    setMaxDiscount(String(coupon?.maxDiscount ?? 50000));
    setMaxRedemptions(String(coupon?.maxRedemptions ?? 50));
    setErrors({});
    setModalError(null);
    setOpenModal(true);
  }
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('10');
  const [minPurchase, setMinPurchase] = useState('0');
  const [maxDiscount, setMaxDiscount] = useState('50000');
  const [maxRedemptions, setMaxRedemptions] = useState('50');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [modalError, setModalError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  const couponsQuery = useQuery({
    queryKey: ['organizer-coupons', eventId],
    queryFn: () => api<{ coupons: Coupon[] }>(`${apiBase}/events/${eventId}/coupons`),
    enabled: Boolean(eventId),
  });

  const coupons = couponsQuery.data?.coupons ?? [];

  async function handleCreateCoupon(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    setModalError(null);

    const valNum = Number(discountValue);
    const minNum = Math.floor(Number(minPurchase));
    const maxDiscNum = maxDiscount ? Math.floor(Number(maxDiscount)) : null;
    const maxRedeemNum = maxRedemptions ? Math.floor(Number(maxRedemptions)) : null;

    if (!code.trim()) {
      setErrors({ code: 'Kode promo wajib diisi' });
      return;
    }

    setSubmitting(true);
    try {
      await api(
        editingId ? `${apiBase}/coupons/${editingId}` : `${apiBase}/events/${eventId}/coupons`,
        {
          method: editingId ? 'PATCH' : 'POST',
          body: {
            code: code.trim().toUpperCase(),
            discountType,
            discountValue: valNum,
            minimumPurchase: minNum,
            maxDiscount: discountType === 'PERCENTAGE' ? maxDiscNum : null,
            maxRedemptions: maxRedeemNum,
          },
        },
      );
      await queryClient.invalidateQueries({ queryKey: ['organizer-coupons', eventId] });
      toast.success('Kupon promo berhasil dibuat');
      setOpenModal(false);
      setCode('');
      setDiscountValue('10');
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setErrors(fieldErrors(err));
      } else {
        setModalError(err);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleCoupon(couponId: string) {
    try {
      const coupon = coupons.find((item) => item.id === couponId);
      await api(`${apiBase}/coupons/${couponId}`, {
        method: 'PATCH',
        body: { isActive: !coupon?.isActive },
      });
      await queryClient.invalidateQueries({ queryKey: ['organizer-coupons', eventId] });
      toast.success('Status kupon diperbarui');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink">Kode Promo & Diskon</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Buat kode promo khusus untuk promosi penjualan tiket acaramu
          </p>
        </div>

        <Button onClick={() => openCoupon()} className="inline-flex items-center gap-2">
          <Plus className="h-4 w-4" aria-hidden />
          Buat Kode Kupon
        </Button>
      </div>

      {couponsQuery.isLoading ? (
        <LoadingState rows={3} label="Memuat kode kupon" />
      ) : couponsQuery.isError ? (
        <ErrorState error={couponsQuery.error} onRetry={() => void couponsQuery.refetch()} />
      ) : coupons.length === 0 ? (
        <EmptyState
          title="Belum ada kupon promo"
          description="Kamu belum membuat kode promo untuk acara ini. Buat kupon untuk memberikan potongan harga kepada calon pembeli."
          action={
            <Button onClick={() => openCoupon()}>
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Buat Kupon Pertama
            </Button>
          }
        />
      ) : (
        <div
          tabIndex={0}
          role="region"
          aria-label="Daftar kode promo"
          className="overflow-x-auto rounded-md border border-warm-border bg-card"
        >
          <table className="w-full text-left text-xs">
            <thead className="border-b border-warm-border bg-warm-muted/40 font-medium text-ink">
              <tr>
                <th className="px-4 py-3">Kode Kupon</th>
                <th className="px-4 py-3">Potongan</th>
                <th className="px-4 py-3">Min. Pembelian</th>
                <th className="px-4 py-3 text-center">Terpakai / Batas</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border text-ink">
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-warm-muted/20">
                  <td className="px-4 py-3 font-mono font-medium text-ink">{coupon.code}</td>
                  <td className="px-4 py-3 font-medium">
                    {coupon.discountType === 'PERCENTAGE'
                      ? `${coupon.discountValue}% (maks. ${coupon.maxDiscount ? formatIDR(coupon.maxDiscount) : 'tak terbatas'})`
                      : formatIDR(coupon.discountValue)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {coupon.minimumPurchase > 0 ? formatIDR(coupon.minimumPurchase) : 'Tanpa min.'}
                  </td>
                  <td className="px-4 py-3 text-center font-mono tabular-nums">
                    {coupon.redeemedCount} / {coupon.maxRedemptions ?? '∞'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                        coupon.isActive
                          ? 'bg-olive/15 text-olive'
                          : 'bg-warm-muted text-muted-foreground'
                      }`}
                    >
                      {coupon.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="mr-3"
                      onClick={() => openCoupon(coupon)}
                    >
                      Edit
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleToggleCoupon(coupon.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-ink"
                    >
                      <Power className="h-3.5 w-3.5" aria-hidden />
                      {coupon.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Dialog for Adding Coupon */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-md bg-paper border-warm-border">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit kode kupon' : 'Buat kode kupon'}</DialogTitle>
            <DialogDescription>
              Tentukan kode unik dan ketentuan diskon potongan harga.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCoupon} className="space-y-4 pt-2">
            <InlineError error={modalError} />

            <Field label="Kode Promo" htmlFor="couponCode" required error={errors.code}>
              <Input
                id="couponCode"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Contoh: HEMAT10 / EARLYBIRD"
                required
              />
            </Field>

            <Field label="Tipe Diskon" htmlFor="discType">
              <select
                id="discType"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'PERCENTAGE' | 'FIXED_AMOUNT')}
                className="h-10 w-full rounded-md border border-ink/20 bg-card px-3 text-sm outline-none focus-visible:border-ink"
              >
                <option value="PERCENTAGE">Persentase (%)</option>
                <option value="FIXED_AMOUNT">Nominal Tetap (Rp)</option>
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label={discountType === 'PERCENTAGE' ? 'Nilai Diskon (%)' : 'Nilai Diskon (Rp)'}
                htmlFor="discValue"
                required
              >
                <Input
                  id="discValue"
                  type="number"
                  min="1"
                  max={discountType === 'PERCENTAGE' ? '100' : undefined}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  required
                />
              </Field>

              {discountType === 'PERCENTAGE' ? (
                <Field label="Maksimal Diskon (Rp)" htmlFor="maxDisc">
                  <Input
                    id="maxDisc"
                    type="number"
                    min="1000"
                    step="1000"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                    placeholder="50000"
                  />
                </Field>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Min. Pembelian (Rp)" htmlFor="minPurchase">
                <Input
                  id="minPurchase"
                  type="number"
                  min="0"
                  step="1000"
                  value={minPurchase}
                  onChange={(e) => setMinPurchase(e.target.value)}
                  placeholder="0"
                />
              </Field>

              <Field label="Batas Penggunaan" htmlFor="maxRedemptions">
                <Input
                  id="maxRedemptions"
                  type="number"
                  min="1"
                  value={maxRedemptions}
                  onChange={(e) => setMaxRedemptions(e.target.value)}
                  placeholder="50"
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpenModal(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Membuat...' : 'Buat Kupon'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
