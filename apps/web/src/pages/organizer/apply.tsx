import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { api, fieldErrors, ApiError } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import { Field, InlineError } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function OrganizerApplyPage() {
  useDocumentTitle('Daftar Sebagai Organizer');
  const { refreshMe } = useAuth();
  const navigate = useNavigate();

  const [orgName, setOrgName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  function autoSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  function handleNameChange(value: string) {
    setOrgName(value);
    if (!slug || slug === autoSlug(orgName)) {
      setSlug(autoSlug(value));
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    setGeneralError(null);

    if (!orgName.trim()) {
      setErrors({ organizationName: 'Nama organisasi wajib diisi' });
      return;
    }

    setSubmitting(true);
    try {
      await api('/organizer/account/apply', {
        method: 'POST',
        body: {
          organizationName: orgName.trim(),
          slug: slug.trim() || autoSlug(orgName),
          description: description.trim() || undefined,
        },
      });
      await refreshMe();
      toast.success('Pendaftaran organizer berhasil!');
      navigate('/organizer');
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setErrors(fieldErrors(err));
      } else {
        setGeneralError(err);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container max-w-2xl py-12">
      <div className="space-y-2 border-b border-warm-border pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-olive">Workspace Penyelenggara</p>
        <h1 className="font-display text-4xl tracking-tightest sm:text-5xl">Mulai Membuat Acara di Gofest</h1>
        <p className="text-sm text-muted-foreground">
          Daftarkan profil organisasimu untuk mulai menerbitkan acara, mengatur tiket, dan memantau kehadiran.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-5 rounded-md border border-warm-border bg-card p-6 sm:p-8">
        <InlineError error={generalError} />

        <Field
          label="Nama Organisasi / Komunitas / Promotor"
          htmlFor="organizationName"
          required
          error={errors.organizationName}
        >
          <Input
            id="organizationName"
            value={orgName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Contoh: Soundwave Entertainment"
            required
          />
        </Field>

        <Field
          label="Slug URL Organisasi"
          htmlFor="slug"
          hint="Digunakan pada tautan profil publik: gofest.id/organizers/slug-kamu"
          required
          error={errors.slug}
        >
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="contoh: soundwave-ent"
            required
          />
        </Field>

        <Field
          label="Deskripsi Singkat"
          htmlFor="description"
          hint="Ceritakan singkat tentang jenis acara yang kamu selenggarakan"
          error={errors.description}
        >
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Penyelenggara festival musik dan workshop kreatif independen..."
            rows={4}
          />
        </Field>

        <div className="pt-3">
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? 'Mendaftarkan...' : 'Daftarkan Organizer'}
          </Button>
        </div>
      </form>
    </main>
  );
}
