import { useWorkspace } from '@/pages/workspace/workspace-hooks';

import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { api, fieldErrors, ApiError } from '@/lib/api';
import { useCategories, useOrganizerEvent } from '@/lib/queries';
import { useDocumentTitle } from '@/lib/hooks';
import { Field, InlineError, LoadingState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { EventManage } from '@/lib/models';
import { ImageUploader } from '@/components/common/image-uploader';
import { EventFormSummary } from './event-summary';
import { toDateTimeInput, fromDateTimeInput } from '@/lib/format';

export function OrganizerEventFormPage({ isNew = false }: { isNew?: boolean }) {
  const { apiBase, base } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const categoriesQuery = useCategories();
  const categories = categoriesQuery.data?.categories ?? [];

  const eventQuery = useOrganizerEvent(isNew ? undefined : id, apiBase);
  const existingEvent = eventQuery.data?.event;
  const timezone = existingEvent?.timezone ?? 'Asia/Jakarta';

  useDocumentTitle(isNew ? 'Buat Acara Baru' : 'Edit Informasi Acara');

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState<'OFFLINE' | 'ONLINE'>('OFFLINE');
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [onlineUrl, setOnlineUrl] = useState('');
  const [onlineNote, setOnlineNote] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [salesStartAt, setSalesStartAt] = useState('');
  const [salesEndAt, setSalesEndAt] = useState('');
  const [rules, setRules] = useState('');
  const [refundPolicy, setRefundPolicy] = useState('');
  const [coverKey, setCoverKey] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (existingEvent) {
      setTitle(existingEvent.title);
      setSlug(existingEvent.slug);
      setSummary(existingEvent.summary);
      setDescription(existingEvent.description);
      setCategoryId(existingEvent.category?.id ?? '');
      setType(existingEvent.type);
      setVenueName(existingEvent.venueName ?? '');
      setAddress(existingEvent.address ?? '');
      setCity(existingEvent.city ?? '');
      setOnlineUrl(existingEvent.onlineAccessUrl ?? '');
      setOnlineNote(existingEvent.onlineAccessNote ?? '');
      setStartsAt(toDateTimeInput(existingEvent.startsAt, timezone));
      setEndsAt(toDateTimeInput(existingEvent.endsAt, timezone));
      setSalesStartAt(toDateTimeInput(existingEvent.salesStartAt, timezone));
      setSalesEndAt(toDateTimeInput(existingEvent.salesEndAt, timezone));
      setRules(existingEvent.rules ?? '');
      setRefundPolicy(existingEvent.refundPolicy ?? '');
      setCoverKey(existingEvent.coverKey);
    }
  }, [existingEvent, timezone]);

  function autoSlug(str: string) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  function handleTitleChange(val: string) {
    setTitle(val);
    if (isNew && (!slug || slug === autoSlug(title))) {
      setSlug(autoSlug(val));
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (uploading || saving) return;
    setErrors({});
    setGeneralError(null);

    const nextErrors: Record<string, string> = {};
    if (title.trim().length < 4) nextErrors.title = 'Judul minimal 4 karakter';
    if (!slug.trim()) nextErrors.slug = 'Slug wajib diisi';
    if (summary.trim().length < 20) nextErrors.summary = 'Ringkasan minimal 20 karakter';
    if (description.trim().length < 40) nextErrors.description = 'Deskripsi minimal 40 karakter';
    if (!categoryId) nextErrors.categoryId = 'Pilih kategori acara';
    if (!startsAt) nextErrors.startsAt = 'Waktu mulai wajib diisi';
    if (!endsAt) nextErrors.endsAt = 'Waktu selesai wajib diisi';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      summary: summary.trim(),
      description: description.trim(),
      categoryId,
      type,
      venueName: type === 'OFFLINE' ? venueName.trim() || null : null,
      address: type === 'OFFLINE' ? address.trim() || null : null,
      city: type === 'OFFLINE' ? city.trim() || null : null,
      onlineAccessUrl: type === 'ONLINE' ? onlineUrl.trim() || null : null,
      onlineAccessNote: type === 'ONLINE' ? onlineNote.trim() || null : null,
      startsAt: fromDateTimeInput(startsAt, timezone)!,
      endsAt: fromDateTimeInput(endsAt, timezone)!,
      salesStartAt: fromDateTimeInput(salesStartAt, timezone) || null,
      salesEndAt: fromDateTimeInput(salesEndAt, timezone) || null,
      rules: rules.trim() || null,
      refundPolicy: refundPolicy.trim() || null,
      coverKey: coverKey || null,
      timezone,
    };

    try {
      if (isNew) {
        const res = await api<{ event: EventManage }>(`${apiBase}/events`, {
          method: 'POST',
          body: payload,
        });
        await queryClient.invalidateQueries({ queryKey: ['organizer-events'] });
        toast.success('Acara berhasil dibuat dalam status draft');
        navigate(`${base}/events/${res.event.id}/tickets`);
      } else {
        await api(`${apiBase}/events/${id}`, {
          method: 'PATCH',
          body: payload,
        });
        await queryClient.invalidateQueries({ queryKey: ['organizer-event', id] });
        await queryClient.invalidateQueries({ queryKey: ['organizer-events'] });
        toast.success('Perubahan acara berhasil disimpan');
      }
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

  if (!isNew && eventQuery.isLoading) {
    return <LoadingState rows={5} label="Memuat form acara" />;
  }

  return (
    <div className="space-y-6">
      {isNew ? (
        <div className="border-b border-warm-border pb-6">
          <Link
            to={`${base}/events`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Kembali ke daftar acara
          </Link>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tightest">
            Buat Acara Baru
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Lengkapi informasi awal acara. Kamu dapat menambahkan jenis tiket dan kupon setelahnya.
          </p>
        </div>
      ) : null}

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <form
          onSubmit={onSubmit}
          className="min-w-0 space-y-6 rounded-md border border-warm-border bg-card p-6 sm:p-8"
        >
          <InlineError error={generalError} />

          <div className="space-y-4">
            <h2 className="text-base font-semibold text-ink">1. Informasi utama</h2>
            <ImageUploader
              label="Banner acara"
              folder="events"
              value={coverKey}
              onChange={setCoverKey}
              onUploadingChange={setUploading}
              disabled={saving}
              hint="Rekomendasi 1920 × 800 px. Gambar diterapkan setelah acara disimpan."
            />

            <Field label="Judul Acara" htmlFor="title" required error={errors.title}>
              <Input
                id="title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Contoh: Senandung Senja Live Concert 2026"
                required
              />
            </Field>

            <Field
              label="Slug Tautan Publik"
              htmlFor="slug"
              hint="Tautan URL acara: gofest.id/events/slug-ini"
              required
              error={errors.slug}
            >
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="contoh: senandung-senja-2026"
                required
              />
            </Field>

            <Field label="Kategori Acara" htmlFor="categoryId" required error={errors.categoryId}>
              <select
                id="categoryId"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="h-10 w-full rounded-md border border-ink/20 bg-card px-3 text-sm outline-none focus-visible:border-ink"
                required
              >
                <option value="">Pilih kategori...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Ringkasan Singkat"
              htmlFor="summary"
              hint="Satu atau dua kalimat pembuka untuk preview di halaman discovery (min. 20 karakter)"
              required
              error={errors.summary}
            >
              <Input
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Malam perayaan musik indie bersama 6 musisi pilihan di panggung terbuka..."
                required
              />
            </Field>

            <Field
              label="Deskripsi Lengkap"
              htmlFor="description"
              hint="Jelaskan detail line-up, susunan agenda, dan informasi penting bagi pengunjung (min. 40 karakter)"
              required
              error={errors.description}
            >
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tuliskan deskripsi lengkap acara..."
                rows={6}
                required
              />
            </Field>
          </div>

          <div className="space-y-4 border-t border-warm-border pt-6">
            <h2 className="text-base font-semibold text-ink">2. Format & lokasi acara</h2>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="radio"
                  name="type"
                  value="OFFLINE"
                  checked={type === 'OFFLINE'}
                  onChange={() => setType('OFFLINE')}
                />
                Acara Tatap Muka (Offline)
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="radio"
                  name="type"
                  value="ONLINE"
                  checked={type === 'ONLINE'}
                  onChange={() => setType('ONLINE')}
                />
                Acara Daring (Online)
              </label>
            </div>

            {type === 'OFFLINE' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Nama Tempat / Venue" htmlFor="venueName">
                    <Input
                      id="venueName"
                      value={venueName}
                      onChange={(e) => setVenueName(e.target.value)}
                      placeholder="Contoh: Hall Basket Gelora Bung Karno"
                    />
                  </Field>
                </div>

                <div>
                  <Field label="Kota" htmlFor="city">
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Contoh: Jakarta Pusat"
                    />
                  </Field>
                </div>

                <div>
                  <Field label="Alamat Lengkap" htmlFor="address">
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Jl. Pintu Satu Senayan No. 1"
                    />
                  </Field>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Field
                  label="URL Akses Online"
                  htmlFor="onlineUrl"
                  hint="Tautan webinar/streaming (Hanya diberikan kepada pemegang tiket valid)"
                >
                  <Input
                    id="onlineUrl"
                    value={onlineUrl}
                    onChange={(e) => setOnlineUrl(e.target.value)}
                    placeholder="https://zoom.us/j/..."
                  />
                </Field>

                <Field label="Catatan Akses Online" htmlFor="onlineNote">
                  <Input
                    id="onlineNote"
                    value={onlineNote}
                    onChange={(e) => setOnlineNote(e.target.value)}
                    placeholder="Password dan instruksi masuk akan dikirim 1 jam sebelum mulai"
                  />
                </Field>
              </div>
            )}
          </div>

          <div className="space-y-4 border-t border-warm-border pt-6">
            <h2 className="text-base font-semibold text-ink">3. Jadwal acara</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Waktu Mulai Acara" htmlFor="startsAt" required error={errors.startsAt}>
                <Input
                  id="startsAt"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  required
                />
              </Field>

              <Field label="Waktu Selesai Acara" htmlFor="endsAt" required error={errors.endsAt}>
                <Input
                  id="endsAt"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  required
                />
              </Field>
            </div>
          </div>

          <div className="space-y-4 border-t border-warm-border pt-6">
            <h2 className="text-base font-semibold text-ink">4. Ketentuan & aturan</h2>

            <Field
              label="Aturan Masuk / Catatan Pengunjung"
              htmlFor="rules"
              hint="Contoh: Dilarang membawa makanan luar, batas usia minimal 17 tahun"
            >
              <Textarea
                id="rules"
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder="Aturan umum masuk venue..."
                rows={3}
              />
            </Field>

            <Field
              label="Kebijakan Refund"
              htmlFor="refundPolicy"
              hint="Jelaskan ketentuan pengembalian dana jika acara dibatalkan atau dipindah tanggal"
            >
              <Textarea
                id="refundPolicy"
                value={refundPolicy}
                onChange={(e) => setRefundPolicy(e.target.value)}
                placeholder="Kebijakan pengembalian dana..."
                rows={3}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-3 border-t border-warm-border pt-6">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Batal
            </Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving ? 'Menyimpan...' : isNew ? 'Simpan & Lanjut ke Tiket' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
        <EventFormSummary
          title={title}
          coverKey={coverKey}
          type={type}
          venueName={venueName}
          address={address}
          city={city}
          startsAt={startsAt}
          endsAt={endsAt}
          timezone={timezone}
        />
      </div>
    </div>
  );
}
