import { useState, useEffect, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useOrganizerProfile } from '@/lib/queries';
import { api, fieldErrors, ApiError } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import { Field, InlineError, LoadingState, ErrorState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function OrganizerSettingsPage() {
  useDocumentTitle('Pengaturan Organisasi');
  const queryClient = useQueryClient();
  const profileQuery = useOrganizerProfile();
  const profile = profileQuery.data?.organizer;

  const [orgName, setOrgName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setOrgName(profile.organizationName);
      setSlug(profile.slug);
      setDescription(profile.description ?? '');
    }
  }, [profile]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    setGeneralError(null);

    if (!orgName.trim()) {
      setErrors({ organizationName: 'Nama organisasi wajib diisi' });
      return;
    }

    setSaving(true);
    try {
      await api('/organizer/account/profile', {
        method: 'PATCH',
        body: {
          organizationName: orgName.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ['organizer-profile'] });
      toast.success('Profil organisasi berhasil diperbarui');
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setErrors(fieldErrors(err));
      } else {
        setGeneralError(err);
      }
    } finally {
      setSaving(false);
    }
  }

  if (profileQuery.isLoading) {
    return <LoadingState rows={4} label="Memuat profil organisasi" />;
  }

  if (profileQuery.isError || !profile) {
    return (
      <ErrorState
        error={profileQuery.error ?? new Error('Profil tidak ditemukan')}
        onRetry={() => void profileQuery.refetch()}
      />
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="border-b border-warm-border pb-4">
        <h1 className="font-display text-3xl font-bold tracking-tightest">Profil Organisasi</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Kelola identitas publik organisasimu yang ditampilkan pada halaman acara
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 rounded-md border border-warm-border bg-card p-6">
        <InlineError error={generalError} />

        <div className="flex items-center gap-2 rounded bg-warm-muted/50 p-3 text-xs text-muted-foreground">
          <span>Status verifikasi:</span>
          <span className="font-bold text-ink uppercase tracking-wider">{profile.status}</span>
        </div>

        <Field
          label="Nama Organisasi / Komunitas"
          htmlFor="orgName"
          required
          error={errors.organizationName}
        >
          <Input
            id="orgName"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Nama organisasi"
            required
          />
        </Field>

        <Field
          label="Slug URL Organisasi"
          htmlFor="orgSlug"
          hint={`Tautan profil publik: /organizers/${slug}`}
          required
          error={errors.slug}
        >
          <Input
            id="orgSlug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="slug-organisasi"
            required
          />
        </Field>

        <Field label="Deskripsi Profil" htmlFor="orgDesc" hint="Profil singkat promotor">
          <Textarea
            id="orgDesc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan tentang organisasimu..."
            rows={4}
          />
        </Field>

        <div className="pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      </form>
    </div>
  );
}

