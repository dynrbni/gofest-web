import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, InlineError } from '@/components/common/states';
import { WorkspaceHeading, Panel, QueryState } from '@/pages/workspace/workspace-components';

interface Settings {
  platformName: string;
  platformLogo: string;
  contactEmail: string;
  contactPhone: string;
  platformFeeType: string;
  platformFeeValue: number;
  minimumWithdrawal: number;
  orderReservationMinutes: number;
  eventReviewRequired: boolean;
  notificationsEnabled: boolean;
}
export function AdminSettingsPage() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['admin-platform-settings'],
    queryFn: () => api<{ settings: Settings }>('/admin/settings'),
  });
  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api('/admin/settings', { method: 'PATCH', body }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin-platform-settings'] });
      void client.invalidateQueries({ queryKey: ['platform-settings-public'] });
      toast.success('Konfigurasi tersimpan dan dicatat pada audit log');
    },
  });
  const settings = query.data?.settings;
  return (
    <div className="space-y-6">
      <WorkspaceHeading
        title="System Settings"
        description="Konfigurasi platform dan service fee. Perubahan tarif berlaku untuk checkout berikutnya; snapshot transaksi lama tetap tersimpan."
      />
      <QueryState query={query}>
        {settings ? (
          <form
            key={JSON.stringify(settings)}
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              save.mutate({
                platformName: data.get('platformName'),
                platformLogo: data.get('platformLogo'),
                contactEmail: data.get('contactEmail'),
                contactPhone: data.get('contactPhone'),
                platformFeeType: data.get('platformFeeType'),
                platformFeeValue: Number(data.get('platformFeeValue')),
                minimumWithdrawal: Number(data.get('minimumWithdrawal')),
                orderReservationMinutes: Number(data.get('orderReservationMinutes')),
                eventReviewRequired: data.has('eventReviewRequired'),
                notificationsEnabled: data.has('notificationsEnabled'),
              });
            }}
          >
            <Panel title="Identitas & kontak">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nama platform" htmlFor="platform-name" required>
                  <Input
                    id="platform-name"
                    name="platformName"
                    defaultValue={settings.platformName}
                    required
                    maxLength={100}
                  />
                </Field>
                <Field label="URL logo platform" htmlFor="platform-logo">
                  <Input
                    id="platform-logo"
                    name="platformLogo"
                    type="url"
                    defaultValue={settings.platformLogo}
                  />
                </Field>
                <Field label="Email kontak" htmlFor="platform-email">
                  <Input
                    id="platform-email"
                    name="contactEmail"
                    type="email"
                    defaultValue={settings.contactEmail}
                  />
                </Field>
                <Field label="Telepon kontak" htmlFor="platform-phone">
                  <Input
                    id="platform-phone"
                    name="contactPhone"
                    defaultValue={settings.contactPhone}
                    maxLength={30}
                  />
                </Field>
              </div>
            </Panel>
            <Panel
              title="Biaya layanan & withdrawal"
              description="Customer membayar harga tiket setelah diskon ditambah service fee. Dana harga tiket merupakan hak organizer."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Jenis service fee" htmlFor="fee-type">
                  <select
                    id="fee-type"
                    name="platformFeeType"
                    defaultValue={settings.platformFeeType}
                    className="h-11 w-full rounded-lg border border-slate-300 px-3"
                  >
                    <option value="none">Tanpa fee</option>
                    <option value="percentage">Persentase (%)</option>
                    <option value="fixed">Nominal tetap (Rp)</option>
                  </select>
                </Field>
                <Field
                  label="Nilai service fee"
                  htmlFor="fee-value"
                  hint="Persentase maksimal 100; nilai tetap dalam Rupiah."
                >
                  <Input
                    id="fee-value"
                    name="platformFeeValue"
                    type="number"
                    min={0}
                    step={1}
                    required
                    defaultValue={settings.platformFeeValue}
                  />
                </Field>
                <Field label="Minimum withdrawal (Rp)" htmlFor="min-withdrawal">
                  <Input
                    id="min-withdrawal"
                    name="minimumWithdrawal"
                    type="number"
                    min={1}
                    max={2000000000}
                    step={1}
                    required
                    defaultValue={settings.minimumWithdrawal}
                  />
                </Field>
                <Field label="Reservasi order (menit)" htmlFor="reservation-minutes">
                  <Input
                    id="reservation-minutes"
                    name="orderReservationMinutes"
                    type="number"
                    min={5}
                    max={120}
                    step={1}
                    required
                    defaultValue={settings.orderReservationMinutes}
                  />
                </Field>
              </div>
            </Panel>
            <Panel title="Review & notifikasi">
              <div className="space-y-4">
                <label className="flex min-h-11 items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    name="eventReviewRequired"
                    defaultChecked={settings.eventReviewRequired}
                    className="size-4 accent-blue-700"
                  />
                  Event wajib ditinjau admin sebelum publikasi
                </label>
                <label className="flex min-h-11 items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    name="notificationsEnabled"
                    defaultChecked={settings.notificationsEnabled}
                    className="size-4 accent-blue-700"
                  />
                  Aktifkan notifikasi operasional
                </label>
              </div>
            </Panel>
            <InlineError error={save.error} />
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Menyimpan…' : 'Simpan konfigurasi'}
            </Button>
          </form>
        ) : null}
      </QueryState>
    </div>
  );
}
