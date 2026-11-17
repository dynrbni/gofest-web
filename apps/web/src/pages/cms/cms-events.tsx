import { useDeferredValue, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { api } from '@/lib/api';
import { assetUrl } from '@/lib/assets';
import { formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorState, LoadingState } from '@/components/common/states';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import type { CmsEvent } from './cms-models';

type EventResult = { events: CmsEvent[]; meta: { totalPages: number; total: number } };
function EventInfo({ event }: { event: CmsEvent }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      {event.coverKey ? (
        <img
          src={assetUrl(event.coverKey) ?? undefined}
          alt=""
          className="h-14 w-20 shrink-0 rounded object-cover"
        />
      ) : null}
      <div className="min-w-0 space-y-1 text-xs text-slate-600">
        <p className="break-words text-sm font-medium text-slate-900">{event.title}</p>
        <p>
          {event.organizer.organizationName} · {event.category?.name ?? 'Tanpa kategori'}
        </p>
        <p>
          {formatDateTime(event.startsAt)} · {event.city || 'Online'}
        </p>
        <span className="inline-flex rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-800">
          {event.status === 'APPROVED'
            ? 'Disetujui'
            : event.status === 'PUBLISHED'
              ? 'Sudah terbit'
              : 'Tidak aktif'}
        </span>
      </div>
    </div>
  );
}
export function CmsEventSelector({
  value,
  onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search);
  const query = useQuery({
    queryKey: ['cms-events', deferredSearch, page],
    queryFn: () =>
      api<EventResult>('/admin/cms/events', { query: { q: deferredSearch, page, limit: 10 } }),
    enabled: open,
  });
  const selected = useQuery({
    queryKey: ['cms-selected-events', value.join(',')],
    queryFn: () =>
      api<EventResult>('/admin/cms/events', { query: { ids: value.join(','), limit: 100 } }),
    enabled: value.length > 0,
  });
  const eventMap = new Map(
    [...(selected.data?.events ?? []), ...(query.data?.events ?? [])].map((event) => [
      event.id,
      event,
    ]),
  );
  function move(index: number, delta: number) {
    const next = [...value];
    const target = next[index + delta];
    const current = next[index];
    if (!target || !current) return;
    next[index] = target;
    next[index + delta] = current;
    onChange(next);
  }
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Event terpilih ({value.length})</h3>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          Urutan ini mengikuti tampilan di website. Event yang sudah disetujui dapat dipilih, dan
          muncul setelah diterbitkan selama masih aktif.
        </p>
        {selected.isError ? (
          <ErrorState
            error={selected.error}
            onRetry={() => void selected.refetch()}
            title="Event terpilih belum dapat dimuat"
            className="mt-3"
          />
        ) : null}
        {value.length === 0 ? (
          <p className="mt-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
            Belum ada event dipilih. Gunakan Tambah event untuk memilih dari daftar.
          </p>
        ) : (
          <ol className="mt-3 divide-y rounded-lg border border-slate-200">
            {value.map((id, index) => {
              const event = eventMap.get(id);
              return (
                <li key={id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    {event ? (
                      <EventInfo event={event} />
                    ) : (
                      <p className="break-all text-sm text-slate-600">
                        {selected.isLoading
                          ? 'Memuat event...'
                          : 'Event sudah tidak tersedia. Hapus dari pilihan untuk melanjutkan.'}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Naikkan event ${index + 1}`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Turunkan event ${index + 1}`}
                      disabled={index === value.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Hapus event ${index + 1}`}
                      onClick={() => onChange(value.filter((item) => item !== id))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={value.length >= 100}
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" aria-hidden />
        Tambah event
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto [&>button:last-child]:hidden">
          <div className="absolute right-3 top-3">
            <DialogClose asChild>
              <Button type="button" size="icon" variant="ghost" aria-label="Tutup pilihan event">
                <X className="size-4" aria-hidden />
              </Button>
            </DialogClose>
          </div>
          <DialogHeader>
            <DialogTitle>Tambah event</DialogTitle>
            <DialogDescription>
              Cari event aktif berdasarkan nama atau organizer, lalu tambahkan ke pilihan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="grid gap-2 text-sm font-medium">
              Cari event
              <Input
                value={search}
                placeholder="Nama event atau organizer"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            {query.isLoading ? (
              <LoadingState rows={2} label="Memuat pilihan event" />
            ) : query.isError ? (
              <ErrorState error={query.error} onRetry={() => void query.refetch()} />
            ) : (
              <>
                {query.data?.events.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                    Tidak ada event aktif yang sesuai pencarian.
                  </p>
                ) : (
                  <ul className="divide-y rounded-lg border border-slate-200">
                    {query.data?.events.map((event) => (
                      <li
                        key={event.id}
                        className="flex flex-wrap items-center justify-between gap-3 p-3"
                      >
                        <EventInfo event={event} />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={value.includes(event.id) || value.length >= 100}
                          onClick={() => onChange([...value, event.id])}
                        >
                          <Plus className="mr-1 h-4 w-4" aria-hidden />
                          {value.includes(event.id) ? 'Terpilih' : 'Tambahkan'}
                          <span className="sr-only"> {event.title}</span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                {(query.data?.meta.totalPages ?? 1) > 1 ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Sebelumnya
                    </Button>
                    <span className="text-xs text-slate-600">
                      Halaman {page} dari {query.data?.meta.totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={page >= (query.data?.meta.totalPages ?? 1)}
                      onClick={() => setPage(page + 1)}
                    >
                      Berikutnya
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </div>
          <div className="flex justify-end border-t border-slate-200 pt-4">
            <Button type="button" onClick={() => setOpen(false)}>
              Selesai memilih
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
