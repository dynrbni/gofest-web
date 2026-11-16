import { useState, useEffect, useRef, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useOrganizerProfile } from '@/lib/queries';
import { api, fieldErrors, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useDocumentTitle } from '@/lib/hooks';
import { Field, InlineError, LoadingState, ErrorState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageUploader } from '@/components/common/image-uploader';

const contactFields = [
  ['contactEmail', 'Email kontak', 'email'],
  ['contactPhone', 'Telepon kontak', 'tel'],
  ['location', 'Lokasi organisasi', 'text'],
  ['websiteUrl', 'Website', 'url'],
  ['instagramUrl', 'Instagram URL', 'url'],
  ['tiktokUrl', 'TikTok URL', 'url'],
] as const;
type ContactField = (typeof contactFields)[number][0];
const emptyContacts: Record<ContactField, string> = {
  contactEmail: '',
  contactPhone: '',
  location: '',
  websiteUrl: '',
  instagramUrl: '',
  tiktokUrl: '',
};

export function OrganizerSettingsPage() {
  useDocumentTitle('Profil Kreator');
  const queryClient = useQueryClient();
  const { user, refreshMe } = useAuth();
  const profileQuery = useOrganizerProfile();
  const profile = profileQuery.data?.organizer;
  const [orgName, setOrgName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [logoKey, setLogoKey] = useState<string | null>(null);
  const [bannerKey, setBannerKey] = useState<string | null>(null);
  const [avatarKey, setAvatarKey] = useState<string | null>(user?.avatarKey ?? null);
  const [contacts, setContacts] = useState(emptyContacts);
  const [uploads, setUploads] = useState<Record<string, boolean>>({});
  const initializedProfile = useRef<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const uploading = Object.values(uploads).some(Boolean);
  useEffect(() => {
    if (profile && initializedProfile.current !== profile.id) {
      initializedProfile.current = profile.id;
      setOrgName(profile.organizationName);
      setSlug(profile.slug);
      setDescription(profile.description ?? '');
      setLogoKey(profile.logoKey);
      setBannerKey(profile.bannerKey ?? null);
      setContacts(
        Object.fromEntries(contactFields.map(([key]) => [key, profile[key] ?? ''])) as Record<
          ContactField,
          string
        >,
      );
    }
  }, [profile]);
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (uploading || saving || !user) return;
    setErrors({});
    setGeneralError(null);
    setSaving(true);
    try {
      await Promise.all([
        api('/organizer/account/profile', {
          method: 'PATCH',
          body: {
            organizationName: orgName.trim(),
            slug: slug.trim(),
            description: description.trim(),
            logoKey,
            bannerKey,
            ...contacts,
          },
        }),
        api('/auth/profile', {
          method: 'PATCH',
          body: { name: user.name, phone: user.phone ?? undefined, avatarKey },
        }),
      ]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['organizer-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['public-organizer'] }),
        queryClient.invalidateQueries({ queryKey: ['public-events'] }),
        refreshMe(),
      ]);
      toast.success('Profil kreator berhasil diperbarui');
    } catch (error) {
      if (error instanceof ApiError && error.details) setErrors(fieldErrors(error));
      else setGeneralError(error);
    } finally {
      setSaving(false);
    }
  }
  if (profileQuery.isLoading) return <LoadingState rows={4} label="Memuat profil kreator" />;
  if (profileQuery.isError || !profile)
    return (
      <ErrorState
        error={profileQuery.error ?? new Error('Profil tidak ditemukan')}
        onRetry={() => void profileQuery.refetch()}
      />
    );
  return (
    <div className="max-w-3xl space-y-6">
      <header className="border-b border-warm-border pb-4">
        <h1 className="font-display text-3xl font-semibold tracking-tightest">Profil Kreator</h1>
        <p className="mt-2 text-sm text-slate-600">
          Kelola foto akun dan informasi yang tampil pada profil publik organisasi.
        </p>
      </header>
      <form
        onSubmit={onSubmit}
        className="space-y-6 rounded-md border border-warm-border bg-card p-5 sm:p-6"
      >
        <InlineError error={generalError} />
        <p className="rounded bg-blue-50 p-3 text-sm text-blue-900">
          Status verifikasi: <strong>{profile.status}</strong>
        </p>
        <fieldset disabled={saving} className="space-y-5">
          <legend className="mb-3 text-base font-semibold">Gambar akun dan organisasi</legend>
          <ImageUploader
            label="Foto profil akun"
            folder="avatars"
            value={avatarKey}
            onChange={setAvatarKey}
            onUploadingChange={(busy) => setUploads((current) => ({ ...current, avatar: busy }))}
            hint="Rekomendasi rasio 1:1. Foto ini ditampilkan pada topbar akun."
          />
          <ImageUploader
            label="Logo organisasi"
            folder="organizers"
            value={logoKey}
            onChange={setLogoKey}
            onUploadingChange={(busy) => setUploads((current) => ({ ...current, logo: busy }))}
            hint="Gunakan gambar persegi untuk identitas profil publik."
          />
          <ImageUploader
            label="Banner organisasi"
            folder="organizers"
            value={bannerKey}
            onChange={setBannerKey}
            onUploadingChange={(busy) => setUploads((current) => ({ ...current, banner: busy }))}
            hint="Rekomendasi 1500 × 500 px, rasio 3:1."
          />
          <p className="text-xs text-slate-600">
            Gambar diterapkan setelah Simpan Perubahan. Hapus gambar untuk memakai tampilan
            pengganti.
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
            onChange={(event) => setOrgName(event.target.value)}
            required
            maxLength={120}
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
            onChange={(event) => setSlug(event.target.value)}
            required
          />
        </Field>
        <Field label="Deskripsi Profil" htmlFor="orgDesc" error={errors.description}>
          <Textarea
            id="orgDesc"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            maxLength={3000}
          />
        </Field>
        <fieldset className="grid gap-4 sm:grid-cols-2" disabled={saving}>
          <legend className="mb-3 text-base font-semibold">Kontak dan media sosial publik</legend>
          {contactFields.map(([key, label, type]) => (
            <Field key={key} label={label} htmlFor={`org-${key}`} error={errors[key]}>
              <Input
                id={`org-${key}`}
                type={type}
                value={contacts[key]}
                onChange={(event) =>
                  setContacts((current) => ({ ...current, [key]: event.target.value }))
                }
                placeholder={type === 'url' ? 'https://' : undefined}
              />
            </Field>
          ))}
        </fieldset>
        <Button type="submit" disabled={saving || uploading}>
          {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
        </Button>
      </form>
    </div>
  );
}
