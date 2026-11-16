import { useDeferredValue, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { api } from '@/lib/api';
import { assetUrl } from '@/lib/assets';
import { formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QueryState, Status } from '../workspace/workspace-components';
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
        <Status value={event.status} />
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
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search);
  const query = useQuery({
    queryKey: ['cms-events', deferredSearch, page],
    queryFn: () =>
      api<EventResult>('/admin/cms/events', { query: { q: deferredSearch, page, limit: 10 } }),
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
        <h3 className="text-sm font-semibold text-slate-900">Acara terpilih ({value.length})</h3>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          Urutan di bawah menentukan tampilan mode manual. Acara APPROVED dapat dijadwalkan, tetapi
          hanya acara PUBLISHED yang tampil di website. Acara yang tidak lagi aktif disaring saat
          ditampilkan.
        </p>
        {value.length === 0 ? (
          <p className="mt-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
            Belum ada acara dipilih. Cari dan tambahkan acara di bawah.
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
                        {selected.isLoading ? 'Memuat acara...' : `Acara tidak tersedia (${id})`}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Naikkan acara ${index + 1}`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Turunkan acara ${index + 1}`}
                      disabled={index === value.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Hapus acara ${index + 1}`}
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
      <div className="space-y-3">
        <label className="grid gap-2 text-sm font-medium">
          Cari acara untuk ditampilkan
          <Input
            value={search}
            placeholder="Nama acara atau organizer"
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <QueryState query={query}>
          {query.data?.events.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              Tidak ada acara aktif yang sesuai pencarian.
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
                    size="sm"
                    disabled={value.includes(event.id) || value.length >= 100}
                    onClick={() => onChange([...value, event.id])}
                  >
                    <Plus className="mr-1 h-4 w-4" />
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
                size="sm"
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
                size="sm"
                disabled={page >= (query.data?.meta.totalPages ?? 1)}
                onClick={() => setPage(page + 1)}
              >
                Berikutnya
              </Button>
            </div>
          ) : null}
        </QueryState>
      </div>
    </div>
  );
}
