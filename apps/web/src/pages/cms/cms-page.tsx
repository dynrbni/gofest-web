import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useBlocker, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Image, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError, api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { assetUrl } from '@/lib/assets';
import { formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/common/states';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Panel, QueryState, WorkspaceHeading, DataTable } from '../workspace/workspace-components';
import { CmsFields } from './cms-fields';
import { CmsCitiesPage } from './cms-cities';
import { MenuFooter } from './cms-footer';
import { CmsAutoEditor } from './cms-autosave';
import { useCmsPending, setCmsOperation } from './cms-state';
import { cmsSorted, useCmsRecords } from './cms-data';
import { CmsItemMenu, CmsOrderButtons, CmsStatus, CmsVisibility } from './cms-controls';
import {
  MODULES,
  recordTitle,
  type BannerDocument,
  type CmsModule,
  type CmsRecord,
  type SectionDocument,
  type SettingsDocument,
} from './cms-models';

interface Change {
  collection: CmsModule;
  id: string;
  title: string;
  version: number;
}
const SECTION_NAMES: Record<string, string> = {
  hero: 'Banner utama',
  promotions: 'Promosi',
  'events-for-you': 'Event Seru Untukmu',
  categories: 'Kategori Event',
  cities: 'Jelajahi Event di Kotamu',
};
export function CmsPage() {
  const pending = useCmsPending();
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      pending > 0 && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (blocker.state === 'blocked' && !pending) blocker.proceed();
  }, [blocker, pending]);
  const { module: moduleParam } = useParams();
  const active = moduleParam ?? 'sections';
  const { user } = useAuth();
  const superadmin = user?.roles.includes('SUPERADMIN');
  const module = MODULES.find((item) => item.key === active);
  const changes = useQuery({
    queryKey: ['cms', 'changes'],
    queryFn: () => api<{ items: Change[] }>('/admin/cms/changes'),
  });
  const published = useQuery({
    queryKey: ['cms', 'website-status'],
    queryFn: () => api<{ settings: SettingsDocument }>('/cms/site'),
  });
  if (active === 'overview') return <Navigate to="/admin/cms/sections" replace />;
  if (!module || (!superadmin && active !== 'sections'))
    return (
      <EmptyState
        title="Halaman tidak tersedia"
        description="Gunakan menu Beranda untuk mengelola rekomendasi event."
      />
    );
  return (
    <div className="space-y-6 pb-28">
      {blocker.state === 'blocked' && pending > 0 && (
        <p
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          Menunggu draft tersimpan sebelum berpindah halaman. Jika ada pesan gagal simpan di form,
          perbaiki isinya atau coba simpan kembali.
        </p>
      )}
      <WorkspaceHeading title={module.label} description={module.description} />
      {active === 'sections' && (
        <p className="text-sm text-slate-600">
          {published.data?.settings.maintenance ? 'Website dalam pemeliharaan' : 'Website aktif'} ·{' '}
          {changes.data?.items.length ?? 0} perubahan belum diterbitkan
        </p>
      )}
      {active === 'sections' ? (
        <HomepageSections />
      ) : active === 'cities' ? (
        <CmsCitiesPage />
      ) : active === 'navigation' ? (
        <MenuFooter />
      ) : active === 'settings' ? (
        <IdentitySettings />
      ) : (
        <ContentCollection key={active} module={active as 'banners' | 'pages'} />
      )}
      <PublishBar query={changes} />
    </div>
  );
}
export function FeaturedEventsPage() {
  return <Navigate to="/admin/cms/sections" replace />;
}
function PublishBar({ query }: { query: ReturnType<typeof useQuery<{ items: Change[] }>> }) {
  const client = useQueryClient();
  const token = useRef({});
  const pending = useCmsPending();
  const mutation = useMutation({
    onMutate: async () => {
      setCmsOperation(token.current, true);
      await client.cancelQueries({ queryKey: ['cms'] });
    },
    onSettled: () => setCmsOperation(token.current, false),
    mutationFn: (items: Change[]) =>
      api('/admin/cms/publish-all', {
        method: 'POST',
        body: {
          items: items.map(({ collection, id, version }) => ({
            collection,
            id,
            expectedVersion: version,
          })),
        },
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['cms'] });
      void client.invalidateQueries({ queryKey: ['cms-site'] });
      toast.success('Perubahan telah diterbitkan ke website');
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError && error.status === 409
          ? 'Ada konten yang berubah. Daftar terbaru dimuat; periksa kembali sebelum menerbitkan.'
          : errorMessage(error),
      );
      void client.invalidateQueries({ queryKey: ['cms'] });
    },
  });
  const items = query.data?.items ?? [];
  return (
    <div
      className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-5 py-4 shadow-md"
      role="region"
      aria-label="Penerbitan website"
    >
      <div role="status">
        <p className="text-sm font-semibold">{items.length} perubahan belum diterbitkan</p>
        <p className="mt-1 text-xs text-slate-600">
          {pending
            ? 'Menunggu draft dan unggahan selesai...'
            : 'Website menampilkan versi terakhir yang diterbitkan.'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <a
            href="/admin/cms/preview"
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={pending > 0}
            onClick={(event) => {
              if (pending) event.preventDefault();
            }}
          >
            <ExternalLink aria-hidden />
            Preview<span className="sr-only"> (tab baru)</span>
          </a>
        </Button>
        <ConfirmDialog
          title="Terbitkan perubahan ke website?"
          description={
            <>
              <p>Perubahan berikut akan diterapkan bersamaan:</p>
              <ul className="mt-3 max-h-60 list-disc space-y-1 overflow-y-auto pl-5">
                {items.map((item) => (
                  <li key={`${item.collection}-${item.id}`}>{item.title}</li>
                ))}
              </ul>
            </>
          }
          confirmLabel="Terbitkan ke website"
          disabled={
            pending > 0 || mutation.isPending || !items.length || query.isFetching || query.isError
          }
          trigger={
            <Button
              disabled={
                pending > 0 ||
                mutation.isPending ||
                !items.length ||
                query.isFetching ||
                query.isError
              }
            >
              {mutation.isPending ? 'Menerbitkan...' : 'Terbitkan ke website'}
            </Button>
          }
          onConfirm={() => {
            if (!pending) mutation.mutate(items);
          }}
        />
      </div>
      {query.isError && (
        <p className="w-full text-sm text-red-700">
          Daftar perubahan belum dapat dimuat.{' '}
          <Button variant="outline" onClick={() => void query.refetch()}>
            Coba lagi
          </Button>
        </p>
      )}
    </div>
  );
}
function HomepageSections() {
  const query = useCmsRecords('sections');
  const [editing, setEditing] = useState<string | null>(null);
  const pending = useCmsPending();
  const items = cmsSorted(query.data?.items ?? []).filter((item) => SECTION_NAMES[item.key]);
  const selected =
    items.find((item) => item.id === editing) ??
    items.find((item) => item.key === 'events-for-you');
  return (
    <QueryState query={query}>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <Panel
          title="Bagian beranda"
          description="Urutkan bagian sesuai tampilan di website publik."
        >
          <ul className="divide-y divide-slate-200">
            {items.map((record) => {
              const doc = record.draft as SectionDocument;
              return (
                <li
                  key={record.id}
                  className={`border-l-4 p-4 ${selected?.id === record.id && !['hero', 'cities'].includes(record.key) ? 'border-blue-600 bg-blue-50' : 'border-transparent'}`}
                >
                  <h3 className="text-sm font-semibold">{SECTION_NAMES[record.key]}</h3>
                  <p className="mt-1 break-words text-xs leading-5 text-slate-600">
                    {doc.title} ·{' '}
                    {doc.kind === 'categories'
                      ? `Maksimal ${doc.limit} kategori`
                      : doc.kind === 'events'
                        ? `${{ manual: 'Pilihan sendiri', popular: 'Paling laris', upcoming: 'Event terdekat', latest: 'Terbaru' }[doc.source]} · Maksimal ${doc.limit} event`
                        : doc.kind === 'cities'
                          ? 'Kota dan ilustrasi pilihan'
                          : doc.kind === 'hero'
                            ? 'Gambar dan pesan utama website'
                            : 'Promosi yang aktif'}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <CmsOrderButtons module="sections" record={record} items={items} />
                    <CmsVisibility module="sections" record={record} />
                    {record.key === 'hero' || record.key === 'cities' ? (
                      <Button asChild variant="outline">
                        <Link to={`/admin/cms/${record.key === 'hero' ? 'banners' : 'cities'}`}>
                          Ubah<span className="sr-only"> {SECTION_NAMES[record.key]}</span>
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        disabled={pending > 0}
                        onClick={() => setEditing(record.id)}
                      >
                        Ubah<span className="sr-only"> {SECTION_NAMES[record.key]}</span>
                      </Button>
                    )}
                    <CmsItemMenu module="sections" record={record} />
                  </div>
                </li>
              );
            })}
          </ul>
          {!items.length && (
            <p className="text-sm text-slate-600">Bagian beranda belum tersedia.</p>
          )}
        </Panel>
        {selected && (
          <EditorPanel
            module="sections"
            record={selected}
            title={SECTION_NAMES[selected.key] ?? recordTitle(selected)}
          />
        )}
      </div>
    </QueryState>
  );
}
function EditorPanel({
  module,
  record,
  title,
  onCreated,
  onClose,
}: {
  module: CmsModule;
  record: CmsRecord | 'new';
  title: string;
  onCreated?: (record: CmsRecord) => void;
  onClose?: () => void;
}) {
  const pending = useCmsPending();
  return (
    <Panel
      title={title}
      className="xl:sticky xl:top-6"
      action={
        onClose && (
          <Button
            variant="ghost"
            size="icon"
            disabled={pending > 0}
            onClick={onClose}
            aria-label="Tutup editor"
          >
            <X aria-hidden />
          </Button>
        )
      }
    >
      <CmsAutoEditor
        key={record === 'new' ? 'new' : record.id}
        module={module}
        record={record}
        onCreated={onCreated}
      >
        {({ document, onChange, onBusy, busy }) => (
          <fieldset disabled={busy} className="min-w-0">
            <CmsFields
              module={module}
              document={document}
              onChange={onChange}
              featured={module === 'sections'}
              onBusy={onBusy}
            />
          </fieldset>
        )}
      </CmsAutoEditor>
    </Panel>
  );
}
function ContentCollection({ module }: { module: 'banners' | 'pages' }) {
  const query = useCmsRecords(module);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const pending = useCmsPending();
  const items = cmsSorted(query.data?.items ?? []);
  const selected = items.find((item) => item.id === editing);
  const filtered = items.filter((item) =>
    recordTitle(item).toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,1fr)]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="grid min-w-0 gap-2 text-sm font-medium">
            Cari {module === 'pages' ? 'halaman' : 'banner'}
            <Input value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <Button disabled={pending > 0} onClick={() => setEditing('new')}>
            <Plus aria-hidden />
            Tambah {module === 'pages' ? 'halaman' : 'banner'}
          </Button>
        </div>
        <QueryState query={query}>
          {!filtered.length ? (
            <EmptyState
              title={
                search
                  ? 'Tidak ditemukan'
                  : `Belum ada ${module === 'pages' ? 'halaman' : 'banner'}`
              }
              description="Tambahkan konten, lalu terbitkan setelah draft siap."
            />
          ) : module === 'pages' ? (
            <DataTable
              headers={['Judul', 'Alamat halaman', 'Status', 'Diperbarui', 'Tindakan']}
              caption="Daftar halaman website"
            >
              {filtered.map((record) => (
                <tr
                  key={record.id}
                  className={
                    record.id === editing
                      ? 'bg-blue-50 [&_td:first-child]:border-l-4 [&_td:first-child]:border-blue-600'
                      : ''
                  }
                >
                  <td className="font-medium">{recordTitle(record)}</td>
                  <td>/{'slug' in record.draft ? record.draft.slug : ''}</td>
                  <td>
                    <CmsStatus record={record} />
                  </td>
                  <td>{formatDateTime(record.updatedAt)}</td>
                  <td>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        disabled={pending > 0}
                        onClick={() => setEditing(record.id)}
                      >
                        Ubah<span className="sr-only"> {recordTitle(record)}</span>
                      </Button>
                      <CmsItemMenu
                        module={module}
                        record={record}
                        onDeleted={() => setEditing(null)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <ul className="divide-y rounded-xl border border-slate-200 bg-white">
              {filtered.map((record) => {
                const banner = record.draft as BannerDocument;
                return (
                  <li
                    key={record.id}
                    className={`border-l-4 p-4 ${editing === record.id ? 'border-blue-600 bg-blue-50' : 'border-transparent'}`}
                  >
                    <div className="flex items-start gap-3">
                      {banner.imageKey ? (
                        <img
                          src={assetUrl(banner.imageKey)!}
                          width={128}
                          height={72}
                          alt=""
                          className="h-16 w-24 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded bg-slate-100">
                          <Image aria-hidden />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h2 className="break-words font-semibold">{banner.title}</h2>
                        <p className="mt-1 text-xs text-slate-600">
                          {banner.startsAt
                            ? formatDateTime(banner.startsAt)
                            : 'Mulai saat diterbitkan'}
                          {banner.endsAt
                            ? ` sampai ${formatDateTime(banner.endsAt)}`
                            : ' · Tanpa batas akhir'}
                        </p>
                        <CmsStatus record={record} />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <CmsOrderButtons module={module} record={record} items={items} />
                      <CmsVisibility module={module} record={record} />
                      <Button
                        variant="outline"
                        disabled={pending > 0}
                        onClick={() => setEditing(record.id)}
                      >
                        Ubah<span className="sr-only"> {banner.title}</span>
                      </Button>
                      <CmsItemMenu
                        module={module}
                        record={record}
                        onDeleted={() => setEditing(null)}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </QueryState>
      </div>
      {selected || editing === 'new' ? (
        <EditorPanel
          module={module}
          record={selected ?? 'new'}
          title={
            selected
              ? `Ubah ${recordTitle(selected)}`
              : `Tambah ${module === 'pages' ? 'halaman' : 'banner'}`
          }
          onCreated={(record) => setEditing(record.id)}
          onClose={() => setEditing(null)}
        />
      ) : (
        <Panel title="Pilih konten">
          <p className="text-sm leading-6 text-slate-600">
            Pilih Ubah pada {module === 'pages' ? 'halaman' : 'banner'} untuk menyuntingnya di sini.
          </p>
        </Panel>
      )}
    </div>
  );
}
function IdentitySettings() {
  const query = useCmsRecords('settings');
  const record = query.data?.items.find((item) => item.key === 'general');
  return (
    <QueryState query={query}>
      {record ? (
        <EditorPanel module="settings" record={record} title="Pengaturan website" />
      ) : (
        <EmptyState
          title="Pengaturan belum tersedia"
          description="Jalankan migrasi dan seed website sebelum mengubah identitas."
        />
      )}
    </QueryState>
  );
}
