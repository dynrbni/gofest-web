import { useRef } from 'react';
import { Mail, Phone, UserRound } from 'lucide-react';
import type { z } from 'zod';
import type { createOrderSchema } from '@gofest/shared';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InlineError } from '@/components/common/states';
import { formatIDR } from '@/lib/format';
import { cn } from '@/lib/utils';

type Purchase = z.infer<typeof createOrderSchema>;
export function CheckoutConfirmation({
  purchase,
  onClose,
  onConfirm,
  busy,
  error,
  total,
}: {
  purchase: Purchase | null;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
  error: unknown;
  total: number;
}) {
  const editRequested = useRef(false);
  return (
    <Dialog
      open={Boolean(purchase)}
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const submit = document.querySelector<HTMLButtonElement>('button[type=submit]');
          const target =
            editRequested.current || !submit || submit.disabled
              ? document.getElementById('checkout-name')
              : submit;
          target?.focus({ preventScroll: !editRequested.current });
          editRequested.current = false;
        }}
        className={cn(
          'max-h-[90dvh] w-[calc(100%-32px)] max-w-xl overflow-y-auto rounded-2xl p-5 sm:p-8',
          busy && '[&>button]:hidden',
        )}
      >
        <DialogTitle className="pr-6 text-2xl leading-snug">Konfirmasi Pesanan</DialogTitle>
        <DialogDescription>Pastikan data sudah benar sebelum melanjutkan.</DialogDescription>
        {purchase ? (
          <>
            <dl className="space-y-4 py-2 text-sm sm:text-base">
              {(
                [
                  { Icon: UserRound, label: 'Nama pemesan', value: purchase.buyerName },
                  { Icon: Mail, label: 'Email pemesan', value: purchase.buyerEmail },
                  { Icon: Phone, label: 'Nomor HP pemesan', value: purchase.buyerPhone },
                ] as const
              ).map(({ Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <dt>
                    <span className="sr-only">{label}</span>
                    <Icon className="mt-0.5 size-5 text-blue-600" aria-hidden />
                  </dt>
                  <dd className="min-w-0 break-words font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap justify-between gap-3 rounded-xl bg-blue-50 p-4 text-sm">
              <p>{purchase.attendees.length} tiket · Total pembayaran</p>
              <p className="font-semibold tabular-nums">{formatIDR(total)}</p>
            </div>
            <h3 className="mt-2 font-semibold">Informasi penting</h3>
            <ol className="list-decimal space-y-3 pl-5 text-sm leading-6 text-slate-600">
              <li>
                Konfirmasi pesanan dan tautan e-tiket dikirim ke{' '}
                <span className="break-all font-medium text-blue-700">{purchase.buyerEmail}</span>{' '}
                setelah pembayaran terkonfirmasi.
              </li>
              <li>
                Nomor <span className="font-medium text-blue-700">{purchase.buyerPhone}</span>{' '}
                digunakan untuk menghubungi pemesan terkait pesanan.
              </li>
              <li>
                Nama pada setiap tiket mengikuti data pemegang tiket. Siapkan identitas yang sesuai
                saat masuk acara.
              </li>
              <li>
                Jika email belum terlihat, cari “Gofest” dan periksa folder spam atau promosi.
              </li>
            </ol>
            {error ? <InlineError error={error} /> : null}
            <div className="mt-3 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  editRequested.current = true;
                  onClose();
                }}
                disabled={busy}
                className="min-h-12 rounded-xl"
              >
                Edit Data
              </Button>
              <Button
                type="button"
                onClick={onConfirm}
                disabled={busy}
                className="min-h-12 rounded-xl"
              >
                {busy ? 'Membuat pesanan...' : 'Saya Mengerti'}
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
