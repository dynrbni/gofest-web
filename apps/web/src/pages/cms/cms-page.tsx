import { useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, FileText, Image, LayoutTemplate, Settings, Menu, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState, InlineError } from '@/components/common/states';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Metric,
  Panel,
  QueryState,
  Status,
  WorkspaceHeading,
} from '../workspace/workspace-components';
import { CmsFields } from './cms-fields';
import {
  defaultDocument,
  MODULES,
  recordTitle,
  type CmsDocument,
  type CmsModule,
  type CmsRecord,
} from './cms-models';

const moduleIcons = {
  overview: Globe,
  sections: LayoutTemplate,
  banners: Image,
  pages: FileText,
  navigation: Menu,
  settings: Settings,
};
const MODULE_KEYS = new Set(MODULES.map((item) => item.key));
const CORE_SECTIONS = new Set(['hero', 'promotions', 'events-for-you', 'categories', 'cities']);
function refreshCms(client: ReturnType<typeof useQueryClient>) {
  void client.invalidateQueries({ queryKey: ['cms'] });
  void client.invalidateQueries({ queryKey: ['cms-site'] });
}
export function CmsPage() {
  const { module: moduleParam } = useParams();
  const active = moduleParam ?? 'overview';
  const module = MODULES.find((item) => item.key === active);
  return (
    <div className="space-y-6">
      <WorkspaceHeading
        title="Website CMS"
        description="Kelola konten website. Simpan draft, periksa preview, lalu publikasikan untuk menerapkan perubahan ke website publik."
        action={<PreviewLink />}
      />
      <nav
        aria-label="Modul Website CMS"
        className="flex flex-wrap gap-2 border-b border-slate-200 pb-4"
      >
        {MODULES.map(({ key, label }) => {
          const Icon = moduleIcons[key];
          return (
            <NavLink
              key={key}
              end
              to={key === 'overview' ? '/admin/cms' : `/admin/cms/${key}`}
              className={({ isActive }) =>
                `inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${isActive ? 'bg-blue-50 text-blue-800' : 'text-slate-600 hover:bg-slate-100'}`
              }
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </NavLink>
          );
        })}
      </nav>
      {!MODULE_KEYS.has(active as CmsModule) ? (
        <EmptyState
          title="Modul tidak ditemukan"
          description="Pilih salah satu modul CMS di atas."
        />
      ) : active === 'overview' ? (
        <CmsOverview />
      ) : (
        <CmsCollection
          key={active}
          module={active as CmsModule}
          title={module?.label ?? ''}
          description={module?.description ?? ''}
        />
      )}
    </div>
  );
}
export function FeaturedEventsPage() {
  return (
    <div className="space-y-6">
      <WorkspaceHeading
        title="Event Seru Untukmu"
        description="Pilih acara dan atur section rekomendasi pada beranda. Perubahan baru tampil setelah dipublikasikan."
        action={<PreviewLink />}
      />
      <CmsCollection
        module="sections"
        title="Konfigurasi section"
        description="Acara aktif yang sudah disetujui dapat ditambahkan. Urutan manual dapat diubah tanpa mengubah data acara."
        featured
      />
    </div>
  );
}
function PreviewLink({ slug }: { slug?: string }) {
  return (
    <Button asChild variant="outline">
      <a
        href={`/admin/cms/preview${slug ? `?page=${encodeURIComponent(slug)}` : ''}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
        Preview website<span className="sr-only"> (tab baru)</span>
      </a>
    </Button>
  );
}
interface Overview {
  websiteStatus: 'ACTIVE' | 'MAINTENANCE';
  counts: { published: number; draft: number; banners: number; sections: number };
  lastUpdated: string | null;
  activities: {
    id: string;
    action: string;
    createdAt: string;
    actor?: { name: string } | null;
    user?: { name: string } | null;
    entityType?: string;
    entityId?: string;
  }[];
}
function CmsOverview() {
  const query = useQuery({
    queryKey: ['cms', 'overview'],
    queryFn: () => api<Overview>('/admin/cms/overview'),
  });
  return (
    <QueryState query={query}>
      {query.data ? (
        <div className="space-y-6">
          <Panel
            title="Status website"
            action={<Status value={query.data.websiteStatus} />}
            description={
              query.data.lastUpdated
                ? `Terakhir diperbarui ${formatDateTime(query.data.lastUpdated)}`
                : 'Belum ada perubahan CMS.'
            }
          >
            <p className="text-sm leading-6 text-slate-600">
              {query.data.websiteStatus === 'MAINTENANCE'
                ? 'Pengunjung melihat halaman maintenance. Dashboard internal tetap tersedia.'
                : 'Website publik aktif dan menggunakan versi konten yang sudah dipublikasikan.'}
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/admin/cms/settings">Atur status & branding</Link>
            </Button>
          </Panel>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Konten terpublikasi" value={query.data.counts.published} />
            <Metric label="Draft tersimpan" value={query.data.counts.draft} />
            <Metric label="Banner aktif" value={query.data.counts.banners} />
            <Metric label="Section homepage" value={query.data.counts.sections} />
          </div>
          <Panel
            title="Aktivitas CMS terbaru"
            description="Perubahan dan publikasi yang tercatat di audit log."
          >
            {query.data.activities.length === 0 ? (
              <p className="text-sm text-slate-600">Belum ada aktivitas CMS.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {query.data.activities.map((activity) => (
                  <li
                    key={activity.id}
                    className="flex flex-wrap items-start justify-between gap-2 py-3"
                  >
                    <div>
                      <p className="break-words text-sm font-medium text-slate-900">
                        {activity.action.replaceAll('_', ' ')}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {activity.actor?.name ?? activity.user?.name ?? 'Administrator'}
                        {activity.entityType ? ` · ${activity.entityType}` : ''}
                      </p>
                    </div>
                    <time className="text-xs text-slate-600" dateTime={activity.createdAt}>
                      {formatDateTime(activity.createdAt)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      ) : null}
    </QueryState>
  );
}
function CmsCollection({
  module,
  title,
  description,
  featured = false,
}: {
  module: CmsModule;
  title: string;
  description: string;
  featured?: boolean;
}) {
  const client = useQueryClient();
  const [editing, setEditing] = useState<CmsRecord | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['cms', module],
    queryFn: () => api<{ items: CmsRecord[] }>(`/admin/cms/${module}`),
  });
  const items = (query.data?.items ?? []).filter(
    (record) => !featured || record.key === 'events-for-you',
  );
  const filtered = items.filter((record) =>
    `${recordTitle(record)} ${record.key}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  const publish = useMutation({
    mutationFn: ({ record, action }: { record: CmsRecord; action: 'publish' | 'unpublish' }) =>
      api(`/admin/cms/${module}/${record.id}/${action}`, {
        method: 'POST',
        body: { expectedVersion: record.version },
      }),
    onSuccess: (_, { action }) => {
      refreshCms(client);
      toast.success(
        action === 'publish' ? 'Konten dipublikasikan ke website' : 'Konten ditarik dari website',
      );
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (record: CmsRecord) =>
      api(`/admin/cms/${module}/${record.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      refreshCms(client);
      toast.success('Konten dihapus');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const canCreate = !(featured || module === 'settings') || items.length === 0;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
        {canCreate ? (
          <Button onClick={() => setEditing('new')}>
            {module === 'settings' ? 'Atur website' : featured ? 'Atur section' : 'Tambah konten'}
          </Button>
        ) : null}
      </div>
      {!featured && module !== 'settings' ? (
        <label className="grid max-w-md gap-2 text-sm font-medium">
          Cari konten CMS
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Judul atau kunci konten"
          />
        </label>
      ) : null}
      <QueryState query={query}>
        {filtered.length === 0 ? (
          <EmptyState
            title={search ? 'Konten tidak ditemukan' : 'Belum ada konten'}
            description={
              search
                ? 'Coba kata pencarian lain.'
                : 'Tambahkan konten dan simpan sebagai draft sebelum dipublikasikan.'
            }
          />
        ) : (
          <div className="space-y-4">
            {filtered.map((record) => (
              <Panel
                key={record.id}
                title={recordTitle(record)}
                description={`Versi ${record.version} · Diperbarui ${formatDateTime(record.updatedAt)}`}
                action={<Status value={record.status} />}
              >
                <div className="space-y-4">
                  <p className="text-sm leading-6 text-slate-600">
                    {record.status === 'DRAFT'
                      ? record.published
                        ? 'Ada perubahan draft. Website masih menggunakan versi published sebelumnya.'
                        : 'Draft belum ditampilkan di website publik.'
                      : record.status === 'UNPUBLISHED'
                        ? 'Konten tidak ditampilkan di website publik.'
                        : `Terpublikasi${record.publishedAt ? ` ${formatDateTime(record.publishedAt)}` : ''}.`}
                  </p>
                  {'sortOrder' in record.draft ? (
                    <p className="text-xs text-slate-600">
                      Urutan tampil: {record.draft.sortOrder}
                      {'visible' in record.draft
                        ? ` · ${record.draft.visible ? 'Ditampilkan' : 'Disembunyikan'}`
                        : ''}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setEditing(record)}>
                      Edit draft
                    </Button>
                    <PreviewLink slug={'slug' in record.draft ? record.draft.slug : undefined} />
                    <ConfirmDialog
                      title="Publikasikan perubahan?"
                      description={`Draft ${recordTitle(record)} akan diterapkan pada website publik. Pastikan preview sudah diperiksa.`}
                      confirmLabel="Publikasikan"
                      trigger={
                        <Button disabled={publish.isPending || remove.isPending}>Publish</Button>
                      }
                      onConfirm={() => publish.mutate({ record, action: 'publish' })}
                    />
                    {record.published ? (
                      <ConfirmDialog
                        title="Tarik konten dari website?"
                        description={`${recordTitle(record)} akan disembunyikan dari website publik. Draft tetap tersimpan.`}
                        confirmLabel="Unpublish"
                        trigger={
                          <Button
                            variant="outline"
                            disabled={publish.isPending || remove.isPending}
                          >
                            Unpublish
                          </Button>
                        }
                        onConfirm={() => publish.mutate({ record, action: 'unpublish' })}
                      />
                    ) : null}
                    {!featured &&
                    module !== 'settings' &&
                    (module !== 'sections' || !CORE_SECTIONS.has(record.key)) ? (
                      <ConfirmDialog
                        title="Hapus konten CMS?"
                        description={`${recordTitle(record)} beserta versi published akan dihapus. Konten tidak lagi muncul pada website.`}
                        destructive
                        confirmLabel="Hapus konten"
                        trigger={
                          <Button
                            variant="outline"
                            disabled={remove.isPending || publish.isPending}
                          >
                            Hapus
                          </Button>
                        }
                        onConfirm={() => remove.mutate(record)}
                      />
                    ) : null}
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        )}
      </QueryState>
      {editing ? (
        <CmsEditor
          key={editing === 'new' ? 'new' : `${editing.id}-${editing.version}`}
          module={module}
          record={editing}
          featured={featured}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}
function CmsEditor({
  module,
  record,
  featured,
  onClose,
}: {
  module: CmsModule;
  record: CmsRecord | 'new';
  featured: boolean;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const initial =
    record === 'new' ? defaultDocument(module) : { ...defaultDocument(module), ...record.draft };
  if (featured && record === 'new' && 'title' in initial) initial.title = 'Event Seru Untukmu';
  const [document, setDocument] = useState<CmsDocument>(initial);
  const [key] = useState(() =>
    record === 'new'
      ? featured
        ? 'events-for-you'
        : module === 'settings'
          ? 'general'
          : `${module}-${crypto.randomUUID()}`
      : record.key,
  );
  const [uploads, setUploads] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  const save = useMutation({
    mutationFn: () =>
      api<{ item: CmsRecord }>(`/admin/cms/${module}${record === 'new' ? '' : `/${record.id}`}`, {
        method: record === 'new' ? 'POST' : 'PATCH',
        body: { ...(record === 'new' ? { key } : { expectedVersion: record.version }), document },
      }),
    onSuccess: () => {
      refreshCms(client);
      toast.success('Draft disimpan. Periksa preview sebelum publish.');
      onClose();
    },
  });
  const busy = save.isPending || uploads > 0;
  function close() {
    if (busy) return;
    if (dirty) setDiscard(true);
    else onClose();
  }
  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent
          className="max-h-[92dvh] max-w-3xl overflow-y-auto"
          onPointerDownOutside={(event) => {
            if (busy) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {record === 'new' ? 'Tambah konten CMS' : `Edit ${recordTitle(record)}`}
            </DialogTitle>
            <DialogDescription>
              Perubahan disimpan sebagai draft. Website publik tetap menggunakan versi yang telah
              dipublikasikan.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              if (!busy) save.mutate();
            }}
          >
            <fieldset disabled={busy} className="min-w-0 space-y-5">
              <CmsFields
                module={module}
                document={document}
                featured={featured}
                onBusy={(uploading) => setUploads((count) => count + (uploading ? 1 : -1))}
                onChange={(value) => {
                  setDocument(value);
                  setDirty(true);
                }}
              />
            </fieldset>
            <InlineError error={save.error} />
            <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white py-4">
              <p className="text-xs text-slate-600">
                {uploads > 0 ? 'Tunggu unggahan selesai.' : 'Simpan draft sebelum membuka preview.'}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" disabled={busy} onClick={close}>
                  Batal
                </Button>
                <Button type="submit" disabled={busy}>
                  {save.isPending ? 'Menyimpan...' : 'Simpan draft'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={discard} onOpenChange={setDiscard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buang perubahan yang belum disimpan?</DialogTitle>
            <DialogDescription>
              Perubahan di editor ini belum tersimpan sebagai draft. Gambar yang telah diunggah
              tidak otomatis dipublikasikan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setDiscard(false)}>
              Lanjut edit
            </Button>
            <Button variant="destructive" onClick={onClose}>
              Buang perubahan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
