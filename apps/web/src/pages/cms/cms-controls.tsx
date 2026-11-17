import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { QueryState } from '../workspace/workspace-components';
import { recordTitle, type CmsModule, type CmsRecord } from './cms-models';
import { setCmsOperation, useCmsPending } from './cms-state';
import { useCmsUpdate } from './cms-data';
export function CmsVisibility({ record, module }: { record: CmsRecord; module: CmsModule }) {
  const update = useCmsUpdate();
  const pending = useCmsPending();
  if (!('visible' in record.draft)) return null;
  const visible = record.draft.visible;
  const title = recordTitle(record);

  function handleToggle() {
    update.mutate(
      { module, record, document: { ...record.draft, visible: !visible } },
      {
        onSuccess: () => {
          if (!visible) {
            toast.success(`"${title}" berhasil diaktifkan dan sekarang tampil di website!`);
          } else {
            toast.info(`"${title}" telah dinonaktifkan (disembunyikan dari website).`);
          }
        },
      },
    );
  }

  return (
    <ConfirmDialog
      title={visible ? 'Sembunyikan konten dari website?' : 'Tampilkan konten di website?'}
      description={
        visible ? (
          <p>
            Bagian <strong>"{title}"</strong> akan dinonaktifkan dan disembunyikan dari website publik.
          </p>
        ) : (
          <p>
            Bagian <strong>"{title}"</strong> akan diaktifkan dan ditampilkan di website publik.
          </p>
        )
      }
      confirmLabel={visible ? 'Ya, Sembunyikan' : 'Ya, Tampilkan'}
      destructive={visible}
      disabled={pending > 0 || update.isPending}
      onConfirm={handleToggle}
      trigger={
        <button
          type="button"
          role="switch"
          aria-checked={visible}
          aria-label={`${visible ? 'Sembunyikan' : 'Tampilkan'} ${title}`}
          title={
            visible
              ? 'Status: Aktif (Klik untuk menyembunyikan)'
              : 'Status: Nonaktif (Klik untuk menampilkan)'
          }
          disabled={pending > 0 || update.isPending}
          className={cn(
            'inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600',
            visible
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100'
              : 'border-slate-300 bg-slate-50 text-slate-600 hover:border-slate-400 hover:bg-slate-100',
          )}
        >
          <span
            className={cn(
              'size-2 shrink-0 rounded-full',
              visible ? 'bg-emerald-500' : 'bg-slate-400',
            )}
            aria-hidden
          />
          <span>{visible ? 'Aktif (Tampil)' : 'Nonaktif (Sembunyi)'}</span>
          <span
            aria-hidden
            className={cn(
              'flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors',
              visible ? 'justify-end bg-emerald-600' : 'justify-start bg-slate-300',
            )}
          >
            <span className="size-3 rounded-full bg-white shadow-xs" />
          </span>
        </button>
      }
    />
  );
}
export function CmsOrderButtons({
  record,
  items,
  module,
}: {
  record: CmsRecord;
  items: CmsRecord[];
  module: CmsModule;
}) {
  const update = useCmsUpdate();
  const [moving, setMoving] = useState(false);
  const pending = useCmsPending();
  const index = items.findIndex((row) => row.id === record.id);
  async function move(delta: number) {
    const ordered = [...items];
    [ordered[index], ordered[index + delta]] = [ordered[index + delta]!, ordered[index]!];
    setMoving(true);
    try {
      for (const [position, row] of ordered.entries()) {
        if ('sortOrder' in row.draft && row.draft.sortOrder !== position * 10)
          await update.mutateAsync({
            module,
            record: row,
            document: { ...row.draft, sortOrder: position * 10 },
          });
      }
    } catch {
      /* The mutation displays the validation or conflict message. */
    } finally {
      setMoving(false);
    }
  }
  return (
    <div className="flex gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Naikkan ${recordTitle(record)}`}
        disabled={index < 1 || moving || pending > 0}
        onClick={() => void move(-1)}
      >
        <ArrowUp aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Turunkan ${recordTitle(record)}`}
        disabled={index === items.length - 1 || moving || pending > 0}
        onClick={() => void move(1)}
      >
        <ArrowDown aria-hidden />
      </Button>
    </div>
  );
}
const CORE = new Set(['hero', 'promotions', 'events-for-you', 'categories', 'cities']);
export function CmsItemMenu({
  module,
  record,
  onDeleted,
}: {
  module: CmsModule;
  record: CmsRecord;
  onDeleted?: () => void;
}) {
  const client = useQueryClient();
  const token = useRef({});
  const pending = useCmsPending();
  const [history, setHistory] = useState(false);
  const revisions = useQuery({
    queryKey: ['cms', 'revisions', module, record.id],
    queryFn: () =>
      api<{ items: { id: string; version: number; action: string; createdAt: string }[] }>(
        `/admin/cms/${module}/${record.id}/revisions`,
      ),
    enabled: history,
  });
  const mutation = useMutation({
    onMutate: () => setCmsOperation(token.current, true),
    onSettled: () => setCmsOperation(token.current, false),
    mutationFn: (action: 'unpublish' | 'delete') =>
      api(`/admin/cms/${module}/${record.id}${action === 'unpublish' ? '/unpublish' : ''}`, {
        method: action === 'delete' ? 'DELETE' : 'POST',
        ...(action === 'unpublish' ? { body: { expectedVersion: record.version } } : {}),
      }),
    onSuccess: (_, action) => {
      void client.invalidateQueries({ queryKey: ['cms'] });
      void client.invalidateQueries({ queryKey: ['cms-site'] });
      if (action === 'delete') onDeleted?.();
      toast.success(action === 'delete' ? 'Konten dihapus' : 'Konten ditarik dari website');
    },
    onError: (error) => {
      toast.error(errorMessage(error));
      void client.invalidateQueries({ queryKey: ['cms'] });
    },
  });
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Opsi ${recordTitle(record)}`}
            disabled={pending > 0 || mutation.isPending}
          >
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="grid gap-1">
          <Button type="button" variant="ghost" onClick={() => setHistory(true)}>
            Riwayat versi
          </Button>
          {record.published && (
            <ConfirmDialog
              title="Tarik dari website?"
              description={`${recordTitle(record)} tidak lagi tampil di website. Draft dan riwayat tetap tersimpan.`}
              confirmLabel="Tarik dari website"
              onConfirm={() => mutation.mutate('unpublish')}
              trigger={
                <Button type="button" variant="ghost">
                  Tarik dari website
                </Button>
              }
            />
          )}
          {module !== 'settings' && !(module === 'sections' && CORE.has(record.key)) && (
            <ConfirmDialog
              destructive
              title="Hapus konten ini?"
              description={`${recordTitle(record)} akan dihapus dari daftar dan website. Riwayat versi tetap tersimpan.`}
              confirmLabel="Hapus"
              onConfirm={() => mutation.mutate('delete')}
              trigger={
                <Button type="button" variant="ghost" className="text-red-700">
                  Hapus
                </Button>
              }
            />
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={history} onOpenChange={setHistory}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Riwayat {recordTitle(record)}</DialogTitle>
            <DialogDescription>Catatan versi tersimpan dan penerbitan konten.</DialogDescription>
          </DialogHeader>
          <QueryState query={revisions}>
            {revisions.data?.items.length === 0 ? (
              <p className="text-sm text-slate-600">Belum ada riwayat penerbitan.</p>
            ) : (
              <ol className="divide-y">
                {revisions.data?.items.map((item) => (
                  <li key={item.id} className="py-3 text-sm">
                    <p className="font-medium">
                      Versi {item.version} ·{' '}
                      {(
                        {
                          PUBLISH: 'Diterbitkan',
                          UNPUBLISH: 'Ditarik dari website',
                          DELETE: 'Dihapus',
                          SAVE_DRAFT: 'Draft disimpan',
                        } as Record<string, string>
                      )[item.action] ?? 'Draft'}
                    </p>
                    <time className="text-xs text-slate-600">{formatDateTime(item.createdAt)}</time>
                  </li>
                ))}
              </ol>
            )}
          </QueryState>
        </DialogContent>
      </Dialog>
    </>
  );
}
export function CmsStatus({ record }: { record: CmsRecord }) {
  return (
    <span className="text-xs text-slate-600">
      {record.status === 'DRAFT' ? 'Draft' : record.published ? 'Terbit' : 'Ditarik dari website'}
    </span>
  );
}
