import { useState, useEffect, useRef, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOrganizerProfile, usePublicOrganizer } from '@/lib/queries';
import { api, fieldErrors, ApiError } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import { Field, InlineError, LoadingState, ErrorState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageUploader } from '@/components/common/image-uploader';
import { OrganizerProfileHeader } from '@/components/common/organizer-profile-header';
import { Status } from '@/pages/workspace/workspace-components';

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
  const profileQuery = useOrganizerProfile();
  const profile = profileQuery.data?.organizer;
  const publicSlug = profile?.status === 'ACTIVE' ? profile.slug : undefined;
  const publicProfile = usePublicOrganizer(publicSlug, { period: 'active', page: 1 }).data
    ?.organizer;
  const [orgName, setOrgName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [logoKey, setLogoKey] = useState<string | null>(null);
  const [bannerKey, setBannerKey] = useState<string | null>(null);
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
    if (uploading || saving) return;
    setErrors({});
    setGeneralError(null);
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
          ...contacts,
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['organizer-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['public-organizer'] }),
        queryClient.invalidateQueries({ queryKey: ['public-events'] }),
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
    <div className="space-y-6">
      <header className="border-b border-warm-border pb-4">
        <h1 className="font-display text-3xl font-semibold tracking-tightest">Profil Kreator</h1>
        <p className="mt-2 text-sm text-slate-600">
          Atur foto, banner, dan informasi yang tampil di halaman publik organizer.
        </p>
        <a
          href="#profile-preview"
          className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline xl:hidden"
        >
          Lihat pratinjau profil
        </a>
      </header>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <form
          onSubmit={onSubmit}
          className="min-w-0 space-y-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
        >
          <InlineError error={generalError} />
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 text-sm">
            <span className="font-medium">Status verifikasi</span>
            <Status value={profile.status} />
          </div>
          <fieldset disabled={saving} className="space-y-5">
            <legend className="mb-3 text-base font-semibold">Foto dan banner</legend>
            <ImageUploader
              label="Foto profil organizer"
              hidePreview
              folder="organizers"
              value={logoKey}
              onChange={setLogoKey}
              onUploadingChange={(busy) => setUploads((current) => ({ ...current, logo: busy }))}
              hint="Gunakan gambar persegi. Foto ini tampil di profil publik dan kartu event."
            />
            <ImageUploader
              label="Banner organisasi"
              hidePreview
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
        <aside
          id="profile-preview"
          className="min-w-0 scroll-mt-32 rounded-xl border border-slate-200 bg-white p-5 xl:sticky xl:top-24"
          aria-labelledby="profile-preview-heading"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <h2 id="profile-preview-heading" className="font-semibold">
              Pratinjau profil publik
            </h2>
            {publicSlug && (
              <Link
                className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                to={`/organizers/${publicSlug}`}
                target="_blank"
                rel="noreferrer"
              >
                Buka profil <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            )}
          </div>
          <OrganizerProfileHeader
            preview
            organizer={{
              ...profile,
              ...contacts,
              organizationName: orgName.trim() || 'Nama organizer',
              description: description.trim(),
              logoKey,
              bannerKey,
              fallbackBannerKey: publicProfile?.fallbackBannerKey,
              eventCounts: publicProfile?.eventCounts,
            }}
          />
        </aside>
      </div>
    </div>
  );
}
