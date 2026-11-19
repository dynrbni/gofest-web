import { useWorkspace } from '@/pages/workspace/workspace-hooks';
import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import type { PaginationMeta } from '@gofest/shared';
import { api, apiPage, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, InlineError } from '@/components/common/states';
import { Pagination } from '@/components/common/pagination';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import {
  DataTable,
  Metric,
  Panel,
  QueryState,
  Status,
  WorkspaceHeading,
} from './workspace-components';

interface Monitoring {
  meta: PaginationMeta;
  staffMeta: PaginationMeta;
  summary: {
    totalAttendees: number;
    checkedIn: number;
    notCheckedIn: number;
    invalid: number;
    duplicateAttempts: number;
  };
  data: {
    id: string;
    scannedAt: string;
    result: string;
    gate: string | null;
    event: { id: string; title: string };
    ticket: { ticketCode: string; holderName: string } | null;
    staff: { name: string };
  }[];
  staff: {
    id: string;
    role: string;
    user: { name: string; email: string; status: string };
    event: { id: string; title: string };
  }[];
}
export function CheckInOperationsPage() {
  const { apiBase, base } = useWorkspace();
  const pathname = useLocation().pathname;
  const { id } = useParams<{ id: string }>();
  const staffOnly = pathname.endsWith('/staff');
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [eventId, setEvent] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('CHECK_IN');
  const query = useQuery({
    queryKey: ['monitoring', apiBase, id, page, search],
    queryFn: async () => {
      const result = await api<Monitoring>(`${apiBase}/check-in-monitoring`, {
        query: { page, q: search, eventId: id },
      });
      return result;
    },
  });
  const events = useQuery({
    queryKey: ['workspace-event-options', apiBase],
    queryFn: () =>
      apiPage<{ id: string; title: string }>(`${apiBase}/events`, { query: { limit: 100 } }),
    enabled: staffOnly,
  });
  const save = useMutation({
    mutationFn: () => api(`${apiBase}/staff/${eventId}`, { method: 'POST', body: { email, role } }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['monitoring'] });
      setEmail('');
      toast.success('Staff ditugaskan ke event');
    },
  });
  const remove = useMutation({
    mutationFn: (assignment: Monitoring['staff'][number]) =>
      api(`${apiBase}/staff/${assignment.event.id}/${assignment.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['monitoring'] });
      toast.success('Penugasan staff dihapus');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const data = query.data;
  return (
    <div className="space-y-6">
      {id ? (
        <h2 className="text-xl font-semibold text-ink">Riwayat check-in</h2>
      ) : (
        <>
          <WorkspaceHeading
            title={
              staffOnly
                ? 'Check-in staff'
                : pathname.includes('history')
                  ? 'Riwayat check-in'
                  : 'Check-in Monitoring'
            }
            description="Pantau validasi tiket dan penugasan petugas pada event yang dapat Anda akses."
          />
          <label className="grid max-w-sm gap-2 text-sm font-medium">
            Cari event
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>
        </>
      )}
      <QueryState query={query}>
        {data ? (
          <>
            {!staffOnly ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {[
                    ['Total peserta', data.summary.totalAttendees],
                    ['Sudah check-in', data.summary.checkedIn],
                    ['Belum check-in', data.summary.notCheckedIn],
                    ['Tiket tidak valid', data.summary.invalid],
                    ['Scan duplikat', data.summary.duplicateAttempts],
                  ].map(([label, value]) => (
                    <Metric key={label} label={String(label)} value={value} />
                  ))}
                </div>
                <Panel title="Riwayat scan">
                  <DataTable
                    caption="Riwayat check-in"
                    headers={[
                      'Waktu',
                      'Event',
                      'Kode tiket',
                      'Peserta',
                      'Petugas',
                      'Gate',
                      'Hasil',
                    ]}
                  >
                    {data.data.map((scan) => (
                      <tr key={scan.id}>
                        <td>{formatDateTime(scan.scannedAt)}</td>
                        <td>
                          <Link
                            className="text-blue-700"
                            to={`${base}/events/${scan.event.id}/check-in`}
                          >
                            {scan.event.title}
                          </Link>
                        </td>
                        <td>{scan.ticket?.ticketCode ?? '—'}</td>
                        <td>{scan.ticket?.holderName ?? 'Tidak dikenal'}</td>
                        <td>{scan.staff.name}</td>
                        <td>{scan.gate ?? '—'}</td>
                        <td>
                          <Status value={scan.result} />
                        </td>
                      </tr>
                    ))}
                  </DataTable>
                  {!data.data.length ? (
                    <p className="mt-4 text-sm text-slate-600">Belum ada scan tiket.</p>
                  ) : null}
                  <Pagination meta={data.meta} onPageChange={setPage} />
                </Panel>
              </>
            ) : (
              <>
                <Panel title="Tugaskan staff" description="Staff harus memiliki akun GOFEST aktif.">
                  <form
                    className="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      save.mutate();
                    }}
                  >
                    <Field label="Event" htmlFor="staff-event" required>
                      <select
                        id="staff-event"
                        required
                        value={eventId}
                        onChange={(event) => setEvent(event.target.value)}
                        className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                      >
                        <option value="">Pilih event</option>
                        {events.data?.data.map((event) => (
                          <option key={event.id} value={event.id}>
                            {event.title}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Email staff" htmlFor="staff-email" required>
                      <Input
                        id="staff-email"
                        type="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </Field>
                    <Field label="Penugasan" htmlFor="staff-role">
                      <select
                        id="staff-role"
                        value={role}
                        onChange={(event) => setRole(event.target.value)}
                        className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                      >
                        <option value="CHECK_IN">CHECK_IN</option>
                        <option value="MANAGER">MANAGER</option>
                      </select>
                    </Field>
                    <Button type="submit" disabled={save.isPending}>
                      Tugaskan staff
                    </Button>
                    <div className="sm:col-span-2 xl:col-span-4">
                      <InlineError error={save.error} />
                    </div>
                  </form>
                </Panel>
                <Panel
                  title="Penugasan staff"
                  description="Gunakan pencarian event untuk mempersempit daftar penugasan."
                >
                  <DataTable
                    caption="Penugasan petugas check-in"
                    headers={['Nama', 'Email', 'Event', 'Penugasan', 'Status akun', 'Aksi']}
                  >
                    {data.staff.map((assignment) => (
                      <tr key={assignment.id}>
                        <td>{assignment.user.name}</td>
                        <td>{assignment.user.email}</td>
                        <td>{assignment.event.title}</td>
                        <td>{assignment.role}</td>
                        <td>
                          <Status value={assignment.user.status} />
                        </td>
                        <td>
                          <ConfirmDialog
                            title="Hapus penugasan staff?"
                            description={`${assignment.user.name} akan kehilangan akses ke ${assignment.event.title}.`}
                            trigger={
                              <Button variant="outline" size="sm" disabled={remove.isPending}>
                                Hapus penugasan
                              </Button>
                            }
                            onConfirm={() => remove.mutate(assignment)}
                          />
                        </td>
                      </tr>
                    ))}
                  </DataTable>
                  {!data.staff.length ? (
                    <p className="mt-4 text-sm text-slate-600">Belum ada penugasan.</p>
                  ) : null}
                  <Pagination meta={data.staffMeta} onPageChange={setPage} className="mt-4" />
                </Panel>
              </>
            )}
          </>
        ) : null}
      </QueryState>
    </div>
  );
}

interface Attendee {
  id: string;
  ticketCode: string;
  holderName: string;
  holderEmail: string;
  status: string;
  checkedInAt: string | null;
  ticketType: { name: string };
}
export function AttendeesPage() {
  const { apiBase } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['workspace-attendees', apiBase, id, page, search],
    queryFn: () =>
      apiPage<Attendee>(`${apiBase}/attendees`, { query: { page, q: search, eventId: id } }),
  });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-ink">Daftar peserta</h2>
        <Button variant="outline" asChild>
          <a href={`/api/v1${apiBase}/events/${id}/attendees/export`}>
            <Download className="mr-2 size-4" aria-hidden />
            Ekspor CSV
          </a>
        </Button>
      </div>
      <label className="grid max-w-sm gap-2 text-sm font-medium">
        Cari nama, email, atau kode tiket
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </label>
      <QueryState query={query} empty={query.data?.data.length === 0}>
        <DataTable
          caption="Daftar peserta"
          headers={['Kode tiket', 'Nama', 'Email', 'Jenis tiket', 'Status', 'Waktu check-in']}
        >
          {query.data?.data.map((attendee) => (
            <tr key={attendee.id}>
              <td>{attendee.ticketCode}</td>
              <td>{attendee.holderName}</td>
              <td>{attendee.holderEmail}</td>
              <td>{attendee.ticketType.name}</td>
              <td>
                <Status value={attendee.status} />
              </td>
              <td>{attendee.checkedInAt ? formatDateTime(attendee.checkedInAt) : '—'}</td>
            </tr>
          ))}
        </DataTable>
        <Pagination meta={query.data?.meta} onPageChange={setPage} />
      </QueryState>
    </div>
  );
}

export function EventToolsPage() {
  const { apiBase, base } = useWorkspace();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['event-tools', apiBase, page, search],
    queryFn: () =>
      apiPage<{ id: string; title: string; status: string }>(`${apiBase}/events`, {
        query: { page, q: search },
      }),
  });
  return (
    <div className="space-y-6">
      <WorkspaceHeading
        title="Promosi & voucher event"
        description="Pilih event untuk mengelola kode diskon yang terhubung ke checkout."
        action={
          <Button variant="outline" asChild>
            <Link to="/admin/content?kind=CAMPAIGN">Kelola kampanye</Link>
          </Button>
        }
      />
      <label className="grid max-w-sm gap-2 text-sm font-medium">
        Cari event
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </label>
      <QueryState query={query} empty={query.data?.data.length === 0}>
        <DataTable caption="Pilih event" headers={['Event', 'Status', 'Kelola']}>
          {query.data?.data.map((event) => (
            <tr key={event.id}>
              <td>{event.title}</td>
              <td>
                <Status value={event.status} />
              </td>
              <td>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`${base}/events/${event.id}/coupons`}>Kelola kode promo</Link>
                </Button>
              </td>
            </tr>
          ))}
        </DataTable>
        <Pagination meta={query.data?.meta} onPageChange={setPage} />
      </QueryState>
    </div>
  );
}

export function EventHistoryPanel({ eventId }: { eventId: string }) {
  const { apiBase } = useWorkspace();
  const query = useQuery({
    queryKey: ['event-history', apiBase, eventId],
    queryFn: () =>
      api<{
        history: {
          id: string;
          action: string;
          metadata: Record<string, unknown> | null;
          createdAt: string;
          actor: { name: string } | null;
        }[];
      }>(`${apiBase}/events/${eventId}/history`),
  });
  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-medium">Riwayat perubahan event</summary>
      <div className="mt-4">
        <QueryState query={query}>
          <ul className="space-y-3">
            {query.data?.history.map((entry) => (
              <li key={entry.id} className="text-xs leading-5">
                <p className="font-medium">
                  {entry.action.replaceAll('_', ' ')} · {entry.actor?.name ?? 'Sistem'}
                </p>
                <p className="text-slate-600">
                  {formatDateTime(entry.createdAt)}
                  {typeof entry.metadata?.note === 'string' ? ` · ${entry.metadata.note}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </QueryState>
      </div>
    </details>
  );
}
