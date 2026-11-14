import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserPlus, Trash2, ShieldCheck, Mail } from 'lucide-react';
import { api, fieldErrors, ApiError, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { StaffAssignment } from '@/lib/models';
import { EmptyState, ErrorState, Field, InlineError, LoadingState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/common/confirm-dialog';

export function EventStaffManagementPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'CHECK_IN' | 'MANAGER'>('CHECK_IN');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const staffQuery = useQuery({
    queryKey: ['organizer-staff', eventId],
    queryFn: () => api<{ staff: StaffAssignment[] }>(`/organizer/events/${eventId}/staff`),
    enabled: Boolean(eventId),
  });

  const staffList = staffQuery.data?.staff ?? [];

  async function handleAddStaff(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!email.trim()) return;

    setAdding(true);
    try {
      await api(`/organizer/events/${eventId}/staff`, {
        method: 'POST',
        body: {
          email: email.trim(),
          role,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ['organizer-staff', eventId] });
      toast.success('Petugas berhasil ditambahkan ke acara');
      setEmail('');
    } catch (err) {
      setError(err);
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveStaff(staffId: string) {
    try {
      await api(`/organizer/events/${eventId}/staff/${staffId}`, { method: 'DELETE' });
      await queryClient.invalidateQueries({ queryKey: ['organizer-staff', eventId] });
      toast.success('Akses petugas berhasil dicabut');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-warm-border pb-4">
        <h2 className="text-xl font-bold tracking-tight text-ink">Petugas Check-In (Event Staff)</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Beri akses terbatas kepada petugas tiket di lapangan untuk memindai QR code tiket saat hari acara
        </p>
      </div>

      {/* Form Add Staff */}
      <form onSubmit={handleAddStaff} className="rounded-md border border-warm-border bg-card p-5 space-y-4 max-w-xl">
        <h3 className="text-sm font-bold text-ink flex items-center gap-2">
          <UserPlus className="h-4 w-4" aria-hidden />
          Tugaskan Petugas Baru
        </h3>
        <InlineError error={error} />

        <div className="grid sm:grid-cols-[1fr_140px] gap-3">
          <Field label="Alamat Email Petugas" htmlFor="staffEmail" hint="Petugas harus memiliki akun di Gofest">
            <Input
              id="staffEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="petugas@example.com"
              required
            />
          </Field>

          <Field label="Peran Petugas" htmlFor="staffRole">
            <select
              id="staffRole"
              value={role}
              onChange={(e) => setRole(e.target.value as 'CHECK_IN' | 'MANAGER')}
              className="h-10 w-full rounded-md border border-ink/20 bg-card px-2.5 text-xs outline-none focus-visible:border-ink"
            >
              <option value="CHECK_IN">Petugas Scan</option>
              <option value="MANAGER">Manajer Pintu</option>
            </select>
          </Field>
        </div>

        <Button type="submit" disabled={adding} className="text-xs">
          {adding ? 'Menambahkan...' : 'Tugaskan Petugas'}
        </Button>
      </form>

      {/* Staff List Table */}
      {staffQuery.isLoading ? (
        <LoadingState rows={3} label="Memuat petugas acara" />
      ) : staffQuery.isError ? (
        <ErrorState error={staffQuery.error} onRetry={() => void staffQuery.refetch()} />
      ) : staffList.length === 0 ? (
        <EmptyState
          title="Belum ada petugas ditugaskan"
          description="Tambahkan email anggota tim kamu untuk bertindak sebagai petugas check-in di pintu masuk acara."
        />
      ) : (
        <div className="overflow-x-auto rounded-md border border-warm-border bg-card">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-warm-border bg-warm-muted/40 font-semibold text-ink">
              <tr>
                <th className="px-4 py-3">Nama Petugas</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Peran</th>
                <th className="px-4 py-3">Waktu Ditugaskan</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border text-ink">
              {staffList.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-warm-muted/20">
                  <td className="px-4 py-3 font-semibold text-ink">
                    {assignment.user?.name ?? 'Petugas'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{assignment.user?.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-warm-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">
                      {assignment.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateTime(assignment.assignedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ConfirmDialog
                      trigger={
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-brick hover:underline"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          Hapus
                        </button>
                      }
                      title="Cabut Akses Petugas?"
                      description="Petugas ini tidak akan dapat lagi memindai tiket atau membuka halaman check-in untuk acara ini."
                      confirmLabel="Ya, Cabut Akses"
                      destructive
                      onConfirm={() => handleRemoveStaff(assignment.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
