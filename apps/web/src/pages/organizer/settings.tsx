import { useState, useEffect, useRef, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useOrganizerProfile } from '@/lib/queries';
import { api, fieldErrors, ApiError } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import { Field, InlineError, LoadingState, ErrorState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { assetUrl } from '@/lib/assets';
import { Textarea } from '@/components/ui/textarea';

export function OrganizerSettingsPage() {
  useDocumentTitle('Pengaturan Organisasi');
  const queryClient = useQueryClient();
  const profileQuery = useOrganizerProfile();
  const profile = profileQuery.data?.organizer;

  const [orgName, setOrgName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [logoKey, setLogoKey] = useState<string | null>(null);
  const [bannerKey, setBannerKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState<'logo' | 'banner' | null>(null);
  const initializedProfile = useRef<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile && initializedProfile.current !== profile.id) {
      initializedProfile.current = profile.id;
      setOrgName(profile.organizationName);
      setSlug(profile.slug);
      setDescription(profile.description ?? '');
      setLogoKey(profile.logoKey);
      setBannerKey(profile.bannerKey ?? null);
    }
  }, [profile]);

  async function uploadImage(file: File, kind: 'logo' | 'banner') {
    setUploading(kind);
    setGeneralError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('folder', 'organizers');
      const result = await api<{ key: string }>('/uploads', { method: 'POST', body });
      if (kind === 'logo') setLogoKey(result.key);
      else setBannerKey(result.key);
    } catch (error) {
      setGeneralError(error);
    } finally {
      setUploading(null);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (uploading) return;
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
          description: description.trim(),
          logoKey,
          bannerKey,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ['organizer-profile'] });
      await queryClient.invalidateQueries({ queryKey: ['public-organizer'] });
      await queryClient.invalidateQueries({ queryKey: ['public-events'] });
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
        <h1 className="font-display text-3xl font-semibold tracking-tightest">Profil Organisasi</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Kelola identitas publik organisasimu yang ditampilkan pada halaman acara
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-md border border-warm-border bg-card p-6"
      >
        <InlineError error={generalError} />

        <div className="flex items-center gap-2 rounded bg-warm-muted/50 p-3 text-xs text-muted-foreground">
          <span>Status verifikasi:</span>
          <span className="font-medium text-ink uppercase tracking-wider">{profile.status}</span>
        </div>

        <fieldset className="space-y-5" disabled={saving || uploading !== null}>
          <legend className="mb-3 font-medium">Logo dan banner kreator</legend>
          {(['logo', 'banner'] as const).map((kind) => {
            const key = kind === 'logo' ? logoKey : bannerKey;
            return (
              <div key={kind} className="space-y-3">
                <Field
                  label={kind === 'logo' ? 'Logo kreator' : 'Banner kreator'}
                  htmlFor={`creator-${kind}`}
                  hint={
                    kind === 'logo'
                      ? 'Gunakan gambar persegi dalam format JPG, PNG atau WebP.'
                      : 'Gunakan gambar lebar (rasio sekitar 7:2), JPG, PNG atau WebP.'
                  }
                >
                  <Input
                    id={`creator-${kind}`}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (file) void uploadImage(file, kind);
                    }}
                    className="h-auto py-2"
                  />
                </Field>
                {key ? (
                  <div className="space-y-2">
                    <img
                      src={assetUrl(key)!}
                      alt={kind === 'logo' ? 'Pratinjau logo kreator' : 'Pratinjau banner kreator'}
                      className={
                        kind === 'logo'
                          ? 'size-24 rounded-full border border-slate-200 object-contain'
                          : 'aspect-[7/2] w-full rounded-xl bg-blue-50 object-cover'
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => (kind === 'logo' ? setLogoKey(null) : setBannerKey(null))}
                    >
                      Hapus {kind}
                    </Button>
                  </div>
                ) : null}
                {uploading === kind ? (
                  <p role="status" className="text-sm text-slate-600">
                    Mengunggah {kind}...
                  </p>
                ) : null}
              </div>
            );
          })}
          <p className="text-xs leading-5 text-slate-500">
            Tekan Simpan Perubahan untuk menerapkan logo dan banner pada profil publik.
          </p>
        </fieldset>

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
          <Button type="submit" disabled={saving || uploading !== null}>
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      </form>
    </div>
  );
}
