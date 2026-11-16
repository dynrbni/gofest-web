import { useWorkspace } from '@/pages/workspace/workspace-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, apiPage, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, InlineError } from '@/components/common/states';
import { Pagination } from '@/components/common/pagination';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { WorkspaceHeading, Panel, QueryState, Status } from './workspace-components';
import { useWorkspaceNotifications } from '@/lib/workspace-notifications';

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: string;
  reply: string | null;
  updatedAt: string;
  user: { name: string; email: string };
}
export function SupportPage() {
  const { creator, apiBase } = useWorkspace();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [status, setStatus] = useState('IN_PROGRESS');
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const query = useQuery({
    queryKey: ['support', apiBase, page, search],
    queryFn: () => apiPage<SupportTicket>(`${apiBase}/support`, { query: { page, q: search } }),
  });
  const save = useMutation({
    mutationFn: () => api(`${apiBase}/support`, { method: 'POST', body: { subject, message } }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['support'] });
      setSubject('');
      setMessage('');
      toast.success('Tiket bantuan dibuat');
    },
  });
  const answer = useMutation({
    mutationFn: () =>
      api(`/admin/support/${selected!.id}`, { method: 'PATCH', body: { reply, status } }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['support'] });
      setSelected(null);
      toast.success('Balasan disimpan');
    },
  });
  return (
    <div className="space-y-6">
      <WorkspaceHeading
        title={creator ? 'Bantuan & dukungan' : 'Customer Support'}
        description={
          creator
            ? 'Kirim pertanyaan dan pantau balasan untuk tiket bantuan Anda.'
            : 'Tinjau dan balas permintaan bantuan pengguna.'
        }
      />
      {creator ? (
        <Panel title="Buat tiket bantuan">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            <Field label="Subjek" htmlFor="support-subject" required>
              <Input
                id="support-subject"
                required
                minLength={5}
                maxLength={150}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </Field>
            <Field label="Pesan" htmlFor="support-message" required>
              <Textarea
                id="support-message"
                required
                minLength={10}
                maxLength={5000}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </Field>
            <InlineError error={save.error} />
            <Button type="submit" disabled={save.isPending}>
              Kirim tiket bantuan
            </Button>
          </form>
        </Panel>
      ) : null}
      <label className="grid max-w-sm gap-2 text-sm font-medium">
        Cari subjek
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </label>
      <QueryState query={query} empty={query.data?.data.length === 0}>
        <div className="space-y-4">
          {query.data?.data.map((ticket) => (
            <Panel
              key={ticket.id}
              title={ticket.subject}
              description={`${ticket.user.name} · ${formatDateTime(ticket.updatedAt)}`}
              action={<Status value={ticket.status} />}
            >
              <p className="whitespace-pre-wrap text-sm leading-6">{ticket.message}</p>
              {ticket.reply ? (
                <div className="mt-4 rounded-lg bg-blue-50 p-4">
                  <p className="text-xs font-medium text-blue-900">Balasan GOFEST</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                    {ticket.reply}
                  </p>
                </div>
              ) : null}
              {!creator ? (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSelected(ticket);
                    setReply(ticket.reply ?? '');
                    setStatus(ticket.status);
                    answer.reset();
                  }}
                >
                  Balas & ubah status
                </Button>
              ) : null}
            </Panel>
          ))}
        </div>
        <Pagination meta={query.data?.meta} onPageChange={setPage} />
      </QueryState>
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Balas tiket bantuan</DialogTitle>
            <DialogDescription>{selected?.subject}</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              answer.mutate();
            }}
          >
            <Field label="Status" htmlFor="support-status">
              <select
                id="support-status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-300 px-3"
              >
                <option>OPEN</option>
                <option>IN_PROGRESS</option>
                <option>RESOLVED</option>
              </select>
            </Field>
            <Field label="Balasan" htmlFor="support-reply" required>
              <Textarea
                id="support-reply"
                required
                minLength={5}
                maxLength={5000}
                value={reply}
                onChange={(event) => setReply(event.target.value)}
              />
            </Field>
            <InlineError error={answer.error} />
            <Button type="submit" disabled={answer.isPending}>
              Simpan balasan
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function NotificationsPage() {
  const { apiBase } = useWorkspace();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const query = useWorkspaceNotifications(apiBase, page);
  const read = useMutation({
    mutationFn: (id: string) => api(`${apiBase}/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['workspace-notifications'] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  return (
    <div className="space-y-6">
      <WorkspaceHeading
        title="Notifikasi"
        description="Pembaruan permintaan payout, event, dan balasan bantuan untuk akun Anda."
      />
      <QueryState query={query} empty={query.data?.notifications.length === 0}>
        <div className="space-y-4">
          {query.data?.notifications.map((notice) => (
            <Panel
              key={notice.id}
              title={notice.title}
              description={formatDateTime(notice.createdAt)}
              action={
                notice.readAt ? (
                  <span className="text-xs text-slate-600">Dibaca</span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={read.isPending}
                    onClick={() => read.mutate(notice.id)}
                  >
                    Tandai dibaca
                  </Button>
                )
              }
            >
              <p className="text-sm leading-6 text-slate-700">{notice.message}</p>
              {notice.href ? (
                <Link
                  className="mt-3 inline-block text-sm font-medium text-blue-700"
                  to={notice.href}
                >
                  Lihat detail
                </Link>
              ) : null}
            </Panel>
          ))}
        </div>
        <Pagination meta={query.data?.meta} onPageChange={setPage} />
      </QueryState>
    </div>
  );
}
