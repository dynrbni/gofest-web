import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, apiPage, errorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, InlineError } from '@/components/common/states';
import { Pagination } from '@/components/common/pagination';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { WorkspaceHeading, DataTable, QueryState, Status } from './workspace-components';

export interface ContentItem {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  targetUrl: string | null;
  isActive: boolean;
  sortOrder: number;
}
export function ContentManagementPage() {
  const [params, setParams] = useSearchParams();
  const kind = params.get('kind') ?? 'HOMEPAGE';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const client = useQueryClient();
  const [editing, setEditing] = useState<ContentItem | 'new' | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImage] = useState('');
  const [targetUrl, setTarget] = useState('');
  const [sortOrder, setSort] = useState('0');
  const query = useQuery({
    queryKey: ['workspace-content', kind, page, search],
    queryFn: () => apiPage<ContentItem>('/admin/content', { query: { kind, page, q: search } }),
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['workspace-content'] });
    void client.invalidateQueries({ queryKey: ['public-content'] });
  };
  const save = useMutation({
    mutationFn: () =>
      api(editing === 'new' ? '/admin/content' : `/admin/content/${(editing as ContentItem).id}`, {
        method: editing === 'new' ? 'POST' : 'PATCH',
        body: {
          kind,
          title,
          description: description || null,
          imageUrl: imageUrl || null,
          targetUrl: targetUrl || null,
          sortOrder: Number(sortOrder),
          isActive: editing === 'new' ? true : (editing as ContentItem).isActive,
        },
      }),
    onSuccess: () => {
      refresh();
      setEditing(null);
      toast.success('Konten disimpan');
    },
  });
  const toggle = useMutation({
    mutationFn: (item: ContentItem) =>
      api(`/admin/content/${item.id}`, {
        method: 'PATCH',
        body: { ...item, isActive: !item.isActive },
      }),
    onSuccess: refresh,
    onError: (error) => toast.error(errorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/content/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      refresh();
      toast.success('Konten dihapus');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  function edit(item: ContentItem | 'new') {
    setEditing(item);
    setTitle(item === 'new' ? '' : item.title);
    setDescription(item === 'new' ? '' : (item.description ?? ''));
    setImage(item === 'new' ? '' : (item.imageUrl ?? ''));
    setTarget(item === 'new' ? '' : (item.targetUrl ?? ''));
    setSort(String(item === 'new' ? 0 : item.sortOrder));
    save.reset();
  }
  return (
    <div className="space-y-6">
      <WorkspaceHeading
        title={
          kind === 'HOMEPAGE'
            ? 'Homepage Management'
            : kind === 'BANNER'
              ? 'Banner Management'
              : 'Kampanye promosi'
        }
        description="Konten aktif ditampilkan pada beranda publik. Urutan terkecil ditampilkan lebih dahulu."
        action={<Button onClick={() => edit('new')}>Tambah konten</Button>}
      />
      <div className="flex flex-wrap gap-3">
        {[
          ['HOMEPAGE', 'Homepage'],
          ['BANNER', 'Banner'],
          ['CAMPAIGN', 'Kampanye'],
        ].map(([value, label]) => (
          <Button
            key={value}
            variant={kind === value ? 'default' : 'outline'}
            onClick={() => {
              setParams({ kind: value ?? 'HOMEPAGE' });
              setPage(1);
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      <label className="grid max-w-sm gap-2 text-sm font-medium">
        Cari konten
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
          caption="Konten platform"
          headers={['Judul', 'Tujuan', 'Urutan', 'Status', 'Aksi']}
        >
          {query.data?.data.map((item) => (
            <tr key={item.id}>
              <td>{item.title}</td>
              <td className="max-w-60 truncate">{item.targetUrl ?? '—'}</td>
              <td>{item.sortOrder}</td>
              <td>
                <Status value={item.isActive ? 'ACTIVE' : 'INACTIVE'} />
              </td>
              <td>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => edit(item)}>
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={toggle.isPending}
                    onClick={() => toggle.mutate(item)}
                  >
                    {item.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </Button>
                  <ConfirmDialog
                    title="Hapus konten?"
                    description={item.title}
                    trigger={
                      <Button variant="outline" size="sm" disabled={remove.isPending}>
                        Hapus
                      </Button>
                    }
                    onConfirm={() => remove.mutate(item.id)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
        <Pagination meta={query.data?.meta} onPageChange={setPage} />
      </QueryState>
      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? 'Tambah konten' : 'Edit konten'}</DialogTitle>
            <DialogDescription>
              Gunakan gambar dan tautan yang dimiliki atau diizinkan untuk GOFEST.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            <Field label="Judul" htmlFor="content-title" required>
              <Input
                id="content-title"
                minLength={2}
                maxLength={150}
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>
            <Field label="Deskripsi" htmlFor="content-description">
              <Textarea
                id="content-description"
                maxLength={2000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
            <Field label="URL gambar" htmlFor="content-image">
              <Input
                id="content-image"
                type="url"
                value={imageUrl}
                onChange={(event) => setImage(event.target.value)}
              />
            </Field>
            <Field
              label="Tautan tujuan"
              htmlFor="content-target"
              hint="Path internal seperti /events atau URL https://"
            >
              <Input
                id="content-target"
                value={targetUrl}
                onChange={(event) => setTarget(event.target.value)}
              />
            </Field>
            <Field label="Urutan tampil" htmlFor="content-sort">
              <Input
                id="content-sort"
                type="number"
                min={0}
                max={1000}
                value={sortOrder}
                onChange={(event) => setSort(event.target.value)}
              />
            </Field>
            <InlineError error={save.error} />
            <Button type="submit" disabled={save.isPending}>
              Simpan konten
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
