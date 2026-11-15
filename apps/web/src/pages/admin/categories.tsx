import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pencil, Plus, Power } from 'lucide-react';
import { api, fieldErrors, ApiError, errorMessage } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import type { Category } from '@/lib/models';
import { ErrorState, Field, InlineError, LoadingState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export function AdminCategoriesPage() {
  useDocumentTitle('Kategori Acara · Super Admin');
  const queryClient = useQueryClient();

  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [modalError, setModalError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api<{ categories: Category[] }>('/admin/categories'),
  });

  const categories = categoriesQuery.data?.categories ?? [];

  function autoSlug(str: string) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  function handleNameChange(val: string) {
    setName(val);
    if (!editing && (!slug || slug === autoSlug(name))) {
      setSlug(autoSlug(val));
    }
  }

  function openEditor(category?: Category) {
    setEditing(category ?? null);
    setName(category?.name ?? '');
    setSlug(category?.slug ?? '');
    setDescription(category?.description ?? '');
    setErrors({});
    setModalError(null);
    setOpenModal(true);
  }

  async function handleCreateCategory(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setModalError(null);

    if (!name.trim()) {
      setErrors({ name: 'Nama kategori wajib diisi' });
      return;
    }

    setSubmitting(true);
    try {
      await api(editing ? `/admin/categories/${editing.id}` : '/admin/categories', {
        method: editing ? 'PATCH' : 'POST',
        body: {
          name: name.trim(),
          slug: slug.trim() || autoSlug(name),
          description: description.trim(),
          ...(editing ? {} : { isActive: true }),
        },
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(
        editing ? 'Kategori berhasil diperbarui' : 'Kategori baru berhasil ditambahkan',
      );
      setOpenModal(false);
      setName('');
      setSlug('');
      setDescription('');
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setErrors(fieldErrors(err));
      } else {
        setModalError(err);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(cat: Category) {
    setToggling(cat.id);
    try {
      await api(`/admin/categories/${cat.id}`, {
        method: 'PATCH',
        body: { isActive: !cat.isActive },
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(`Kategori ${cat.name} diperbarui`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-warm-border pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tightest">Kategori Acara</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Kategori aktif otomatis tampil di menu navbar, katalog, dan form acara.
          </p>
        </div>

        <Button onClick={() => openEditor()} className="inline-flex items-center gap-2">
          <Plus className="h-4 w-4" aria-hidden />
          Tambah Kategori
        </Button>
      </div>

      {categoriesQuery.isLoading ? (
        <LoadingState rows={4} label="Memuat kategori acara" />
      ) : categoriesQuery.isError ? (
        <ErrorState error={categoriesQuery.error} onRetry={() => void categoriesQuery.refetch()} />
      ) : (
        <div
          tabIndex={0}
          role="region"
          aria-label="Kategori acara"
          className="overflow-x-auto rounded-md border border-warm-border bg-card"
        >
          <table className="w-full text-left text-xs">
            <thead className="border-b border-warm-border bg-warm-muted/40 font-medium text-ink">
              <tr>
                <th className="px-4 py-3">Nama Kategori</th>
                <th className="px-4 py-3">Slug URL</th>
                <th className="px-4 py-3">Deskripsi</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border text-ink">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-warm-muted/20">
                  <td className="px-4 py-3 font-medium text-ink">{cat.name}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{cat.slug}</td>
                  <td className="px-4 py-3 text-muted-foreground">{cat.description ?? '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                        cat.isActive
                          ? 'bg-olive/15 text-olive'
                          : 'bg-warm-muted text-muted-foreground'
                      }`}
                    >
                      {cat.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEditor(cat)}
                      className="mr-3 inline-flex min-h-11 items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
                      aria-label={`Edit kategori ${cat.name}`}
                    >
                      <Pencil className="size-3.5" aria-hidden />
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={toggling !== null}
                      onClick={() => handleToggleActive(cat)}
                      className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-ink disabled:opacity-50"
                    >
                      <Power className="h-3.5 w-3.5" aria-hidden />
                      {cat.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-md bg-paper border-warm-border">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Kategori Acara' : 'Tambah Kategori Acara'}</DialogTitle>
            <DialogDescription>
              Kategori aktif tampil di menu penjelajahan acara publik.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCategory} className="space-y-4 pt-2">
            <InlineError error={modalError} />

            <Field label="Nama Kategori" htmlFor="catName" required error={errors.name}>
              <Input
                id="catName"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Contoh: Musik / Teater / Workshop"
                required
              />
            </Field>

            <Field label="Slug URL" htmlFor="catSlug" required error={errors.slug}>
              <Input
                id="catSlug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="contoh: musik"
                required
              />
            </Field>

            <Field label="Deskripsi Singkat" htmlFor="catDesc">
              <Input
                id="catDesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Deskripsi kategori..."
              />
            </Field>

            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="outline" onClick={() => setOpenModal(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Tambah Kategori'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
