import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Power } from 'lucide-react';
import { api, fieldErrors, ApiError, errorMessage } from '@/lib/api';
import { formatIDR } from '@/lib/format';
import type { TicketType } from '@/lib/models';
import {
  EmptyState,
  ErrorState,
  Field,
  InlineError,
  LoadingState,
} from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export function EventTicketManagementPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [openModal, setOpenModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [quotaTotal, setQuotaTotal] = useState('100');
  const [minPerOrder, setMinPerOrder] = useState('1');
  const [maxPerOrder, setMaxPerOrder] = useState('5');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [modalError, setModalError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  const ticketsQuery = useQuery({
    queryKey: ['organizer-ticket-types', eventId],
    queryFn: () => api<{ ticketTypes: TicketType[] }>(`/organizer/events/${eventId}/ticket-types`),
    enabled: Boolean(eventId),
  });

  const ticketTypes = ticketsQuery.data?.ticketTypes ?? [];

  async function handleCreateTicket(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    setModalError(null);

    const priceNum = Math.floor(Number(price));
    const quotaNum = Math.floor(Number(quotaTotal));
    const minNum = Math.floor(Number(minPerOrder));
    const maxNum = Math.floor(Number(maxPerOrder));

    if (!name.trim()) {
      setErrors({ name: 'Nama jenis tiket wajib diisi' });
      return;
    }
    if (priceNum < 0) {
      setErrors({ price: 'Harga tidak boleh negatif' });
      return;
    }
    if (quotaNum < 1) {
      setErrors({ quotaTotal: 'Kuota minimal 1 tiket' });
      return;
    }

    setSubmitting(true);
    try {
      await api(`/organizer/events/${eventId}/ticket-types`, {
        method: 'POST',
        body: {
          name: name.trim(),
          description: description.trim() || undefined,
          price: priceNum,
          quotaTotal: quotaNum,
          minPerOrder: minNum,
          maxPerOrder: maxNum,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ['organizer-ticket-types', eventId] });
      await queryClient.invalidateQueries({ queryKey: ['organizer-event', eventId] });
      toast.success('Jenis tiket berhasil ditambahkan');
      setOpenModal(false);
      setName('');
      setDescription('');
      setPrice('0');
      setQuotaTotal('100');
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

  async function handleDeactivate(ticketId: string) {
    try {
      await api(`/organizer/ticket-types/${ticketId}`, { method: 'DELETE' });
      await queryClient.invalidateQueries({ queryKey: ['organizer-ticket-types', eventId] });
      toast.success('Status tiket diperbarui');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink">Jenis Tiket & Kuota</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tentukan kategori tiket (misal Presale, Early Bird, VIP), harga dalam Rupiah, dan batas
            kuota
          </p>
        </div>

        <Button onClick={() => setOpenModal(true)} className="inline-flex items-center gap-2">
          <Plus className="h-4 w-4" aria-hidden />
          Tambah Jenis Tiket
        </Button>
      </div>

      {ticketsQuery.isLoading ? (
        <LoadingState rows={3} label="Memuat jenis tiket" />
      ) : ticketsQuery.isError ? (
        <ErrorState error={ticketsQuery.error} onRetry={() => void ticketsQuery.refetch()} />
      ) : ticketTypes.length === 0 ? (
        <EmptyState
          title="Belum ada jenis tiket"
          description="Acara belum memiliki tiket yang dapat dijual. Tambahkan setidaknya satu jenis tiket agar acara dapat dibeli pengunjung."
          action={
            <Button onClick={() => setOpenModal(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Tambah Tiket Pertama
            </Button>
          }
        />
      ) : (
        <div
          tabIndex={0}
          role="region"
          aria-label="Jenis tiket dan kuota"
          className="overflow-x-auto rounded-md border border-warm-border bg-card"
        >
          <table className="w-full text-left text-xs">
            <thead className="border-b border-warm-border bg-warm-muted/40 font-semibold text-ink">
              <tr>
                <th className="px-4 py-3">Nama Tiket</th>
                <th className="px-4 py-3">Harga</th>
                <th className="px-4 py-3 text-center">Kuota Total</th>
                <th className="px-4 py-3 text-center">Terjual</th>
                <th className="px-4 py-3 text-center">Tersedia</th>
                <th className="px-4 py-3 text-center">Batas/Order</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border text-ink">
              {ticketTypes.map((ticket) => {
                const available = Math.max(
                  0,
                  ticket.quotaTotal - ticket.quantitySold - ticket.quantityReserved,
                );
                return (
                  <tr key={ticket.id} className="hover:bg-warm-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-bold text-ink">{ticket.name}</p>
                      {ticket.description ? (
                        <p className="text-[11px] text-muted-foreground">{ticket.description}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-medium tabular-nums">
                      {ticket.price === 0 ? 'Gratis' : formatIDR(ticket.price)}
                    </td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums">
                      {ticket.quotaTotal}
                    </td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums text-olive">
                      {ticket.quantitySold}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold tabular-nums">
                      {available}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {ticket.minPerOrder} - {ticket.maxPerOrder}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          ticket.isActive
                            ? 'bg-olive/15 text-olive'
                            : 'bg-warm-muted text-muted-foreground'
                        }`}
                      >
                        {ticket.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeactivate(ticket.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-ink"
                        title={ticket.isActive ? 'Nonaktifkan penjualan' : 'Aktifkan penjualan'}
                      >
                        <Power className="h-3.5 w-3.5" aria-hidden />
                        {ticket.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Dialog for Adding Ticket */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-md bg-paper border-warm-border">
          <DialogHeader>
            <DialogTitle>Tambah Jenis Tiket</DialogTitle>
            <DialogDescription>
              Buat tier atau kategori tiket baru untuk acara ini.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTicket} className="space-y-4 pt-2">
            <InlineError error={modalError} />

            <Field label="Nama Tiket" htmlFor="ticketName" required error={errors.name}>
              <Input
                id="ticketName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Early Bird / Presale 1 / VIP"
                required
              />
            </Field>

            <Field
              label="Deskripsi Tiket"
              htmlFor="ticketDesc"
              hint="Fasilitas atau keuntungan tiket"
            >
              <Textarea
                id="ticketDesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Termasuk akses lounge khusus dan merchandise..."
                rows={2}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Harga Tiket (IDR)" htmlFor="price" required error={errors.price}>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="1000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0 untuk gratis"
                  required
                />
              </Field>

              <Field
                label="Total Kuota Tiket"
                htmlFor="quotaTotal"
                required
                error={errors.quotaTotal}
              >
                <Input
                  id="quotaTotal"
                  type="number"
                  min="1"
                  value={quotaTotal}
                  onChange={(e) => setQuotaTotal(e.target.value)}
                  placeholder="100"
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Min per Order" htmlFor="minPerOrder">
                <Input
                  id="minPerOrder"
                  type="number"
                  min="1"
                  max="10"
                  value={minPerOrder}
                  onChange={(e) => setMinPerOrder(e.target.value)}
                />
              </Field>

              <Field label="Maks per Order" htmlFor="maxPerOrder">
                <Input
                  id="maxPerOrder"
                  type="number"
                  min="1"
                  max="20"
                  value={maxPerOrder}
                  onChange={(e) => setMaxPerOrder(e.target.value)}
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpenModal(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Menyimpan...' : 'Tambah Tiket'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
