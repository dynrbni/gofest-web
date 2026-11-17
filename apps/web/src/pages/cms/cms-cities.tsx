import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { assetUrl } from '@/lib/assets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, InlineError } from '@/components/common/states';
import { ImageUploader } from '@/components/common/image-uploader';
import { CityCard } from '@/components/discovery/city-destinations';
import { CITY_ACCENTS } from '@/components/discovery/city-presentation';
import { Panel, QueryState } from '../workspace/workspace-components';
import { CmsAutoEditor } from './cms-autosave';
import { setCmsPending, useCmsPending } from './cms-state';
import { useCmsRecords, useCmsUpdate } from './cms-data';
import { CmsItemMenu, CmsOrderButtons } from './cms-controls';
import type { CityDocument, CmsDocument, CmsRecord, SectionDocument } from './cms-models';

function blankCity(order: number): CityDocument {
  return { name: '', slug: '', imageKey: '', accent: 'blue', visible: true, sortOrder: order };
}
function citySlug(name: string) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function CmsCitiesPage() {
  const query = useCmsRecords('cities');
  const sections = useCmsRecords('sections');
  const update = useCmsUpdate();
  const pending = useCmsPending();
  const [selected, setSelected] = useState<string | null>(null);
  const records = (query.data?.items ?? [])
    .slice()
    .sort((a, b) => (a.draft as CityDocument).sortOrder - (b.draft as CityDocument).sortOrder);
  const editing = records.find((record) => record.id === selected);
  const citySection = sections.data?.items.find((record) => record.key === 'cities');
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/admin/cms/sections"
            className="text-sm font-medium text-blue-700 hover:underline"
          >
            Kembali ke Beranda
          </Link>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Susun kota yang tampil di beranda. Ilustrasi boleh dikosongkan; kartu tetap dapat
            diterbitkan.
          </p>
        </div>
        {editing ? (
          <Button variant="outline" disabled={pending > 0} onClick={() => setSelected(null)}>
            <Plus className="mr-2 size-4" aria-hidden />
            Tambah kota
          </Button>
        ) : null}
      </div>
      <QueryState query={sections}>
        {citySection ? (
          <Panel title="Tampilan bagian kota di beranda">
            <CmsAutoEditor key={citySection.id} module="sections" record={citySection}>
              {({ document, onChange, busy }) => {
                const section = document as SectionDocument;
                return (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Judul bagian" htmlFor="city-section-title">
                      <Input
                        id="city-section-title"
                        value={section.title}
                        disabled={busy}
                        maxLength={200}
                        onChange={(event) => onChange({ ...section, title: event.target.value })}
                      />
                    </Field>
                    <Field label="Jumlah maksimal kota" htmlFor="city-section-limit">
                      <Input
                        id="city-section-limit"
                        type="number"
                        min={1}
                        max={48}
                        value={section.limit}
                        disabled={busy}
                        onChange={(event) => {
                          const limit = Number(event.target.value);
                          if (Number.isInteger(limit) && limit >= 1 && limit <= 48)
                            onChange({ ...section, limit });
                        }}
                      />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Deskripsi bagian" htmlFor="city-section-description">
                        <Textarea
                          id="city-section-description"
                          rows={2}
                          maxLength={2000}
                          value={section.description}
                          disabled={busy}
                          onChange={(event) =>
                            onChange({ ...section, description: event.target.value })
                          }
                        />
                      </Field>
                    </div>
                  </div>
                );
              }}
            </CmsAutoEditor>
          </Panel>
        ) : null}
      </QueryState>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        <Panel
          title="Daftar kota"
          description="Urutan dan visibilitas di bawah diterapkan setelah diterbitkan."
        >
          <QueryState query={query}>
            <InlineError error={update.error} />
            {records.length ? (
              <ul className="space-y-2">
                {records.map((record) => {
                  const city = record.draft as CityDocument;
                  return (
                    <li
                      key={record.id}
                      className={`min-w-0 rounded-lg border border-slate-200 border-l-[3px] p-3 ${selected === record.id ? 'border-l-blue-600 bg-blue-50/60' : 'border-l-transparent'}`}
                    >
                      <div className="flex items-start gap-3">
                        <CityThumbnail city={city} />
                        <div className="min-w-0 flex-1">
                          <h2 className="break-words text-sm font-semibold text-slate-900">
                            {city.name}
                          </h2>
                          <p className="mt-1 text-xs leading-5 text-slate-600">
                            {city.imageKey || city.builtInIllustration
                              ? 'Ilustrasi terpasang'
                              : 'Belum ada ilustrasi, kartu tampil polos'}
                          </p>
                        </div>
                        <CmsItemMenu module="cities" record={record} />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <CmsOrderButtons module="cities" record={record} items={records} />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            aria-pressed={city.visible}
                            aria-label={`${city.visible ? 'Sembunyikan' : 'Tampilkan'} ${city.name}`}
                            disabled={update.isPending || pending > 0}
                            onClick={() =>
                              update.mutate({
                                module: 'cities',
                                record,
                                document: { ...city, visible: !city.visible },
                              })
                            }
                          >
                            {city.visible ? 'Tampil' : 'Tersembunyi'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={pending > 0}
                            onClick={() => setSelected(record.id)}
                            aria-label={`Ubah ${city.name}`}
                          >
                            Ubah
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-6 text-sm text-slate-600">
                Belum ada kota. Tambahkan kota pertama melalui form di samping.
              </p>
            )}
          </QueryState>
        </Panel>
        {editing ? (
          <CmsAutoEditor key={editing.id} module="cities" record={editing}>
            {({ document, onChange, onBusy, busy }) => (
              <Panel
                title={`Ubah ${(document as CityDocument).name || 'kota'}`}
                description="Perubahan tersimpan otomatis sebagai draft."
              >
                <CityFields
                  document={document as CityDocument}
                  onChange={(next) => onChange(next as CmsDocument)}
                  onBusy={onBusy}
                  busy={busy}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="mt-5"
                  disabled={busy || pending > 0}
                  onClick={() => setSelected(null)}
                >
                  Selesai mengubah
                </Button>
              </Panel>
            )}
          </CmsAutoEditor>
        ) : (
          <NewCity
            key="new-city"
            order={
              Math.max(-1, ...records.map((record) => (record.draft as CityDocument).sortOrder)) + 1
            }
            onCreated={(record) => setSelected(record.id)}
          />
        )}
      </div>
    </div>
  );
}

function NewCity({ order, onCreated }: { order: number; onCreated: (record: CmsRecord) => void }) {
  const client = useQueryClient();
  const [document, setDocument] = useState(() => blankCity(order));
  const [uploading, setUploading] = useState(false);
  const [generation, setGeneration] = useState(0);
  const create = useMutation({
    mutationFn: () =>
      api<{ item: CmsRecord }>('/admin/cms/cities', {
        method: 'POST',
        body: { key: `cities-${crypto.randomUUID()}`, document: { ...document, sortOrder: order } },
      }),
    onSuccess: ({ item: record }) => {
      void client.invalidateQueries({ queryKey: ['cms'] });
      toast.success('Kota ditambahkan sebagai draft');
      onCreated(record);
    },
  });
  const pendingToken = useRef({});
  useEffect(() => {
    const token = pendingToken.current;
    setCmsPending(token, uploading || create.isPending);
    return () => setCmsPending(token, false);
  }, [uploading, create.isPending]);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!uploading && !create.isPending && document.name.trim()) create.mutate();
  }
  return (
    <Panel
      title="Tambah kota"
      description="Nama dan ilustrasi akan muncul pada kartu kota di website."
    >
      <form key={generation} onSubmit={submit} className="space-y-5">
        <InlineError error={create.error} />
        <CityFields
          document={document}
          onChange={setDocument}
          onBusy={setUploading}
          busy={create.isPending}
        />
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={uploading || create.isPending}
            onClick={() => {
              setDocument(blankCity(order));
              setGeneration((current) => current + 1);
              create.reset();
            }}
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={uploading || create.isPending || document.name.trim().length < 2}
          >
            {create.isPending ? 'Menambahkan…' : 'Tambah kota'}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function CityFields({
  document,
  onChange,
  onBusy,
  busy,
}: {
  document: CityDocument;
  onChange: (document: CityDocument) => void;
  onBusy: (busy: boolean) => void;
  busy: boolean;
}) {
  return (
    <div className="space-y-5">
      <Field label="Nama kota" htmlFor="cms-city-name" required>
        <Input
          id="cms-city-name"
          value={document.name}
          maxLength={100}
          minLength={2}
          required
          disabled={busy}
          onChange={(event) =>
            onChange({ ...document, name: event.target.value, slug: citySlug(event.target.value) })
          }
        />
      </Field>
      <ImageUploader
        label="Ilustrasi kota (opsional)"
        folder="cms-cities"
        value={document.imageKey || null}
        disabled={busy}
        onUploadingChange={onBusy}
        onChange={(key) =>
          onChange({ ...document, imageKey: key ?? '', builtInIllustration: undefined })
        }
        hint="Tarik gambar ke sini atau pilih file."
      />
      {document.builtInIllustration && !document.imageKey ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-600">Menggunakan ilustrasi bawaan GOFEST.</p>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onChange({ ...document, builtInIllustration: undefined })}
          >
            Hapus ilustrasi
          </Button>
        </div>
      ) : null}
      <fieldset disabled={busy}>
        <legend className="mb-3 text-sm font-medium">Warna aksen</legend>
        <div className="flex flex-wrap gap-2">
          {CITY_ACCENTS.map((accent) => (
            <button
              key={accent.value}
              type="button"
              aria-label={`Warna ${accent.label.toLowerCase()}`}
              aria-pressed={document.accent === accent.value}
              onClick={() => onChange({ ...document, accent: accent.value })}
              className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${document.accent === accent.value ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              <span
                className="size-4 rounded-full border border-black/10"
                style={{ backgroundColor: accent.color }}
                aria-hidden
              />
              {accent.label}
            </button>
          ))}
        </div>
      </fieldset>
      <section aria-label="Pratinjau kartu kota">
        <h3 className="mb-3 text-sm font-medium">Pratinjau kartu</h3>
        <div className="max-w-[280px] pb-3">
          <CityCard city={document} preview />
        </div>
        <p className="mt-3 text-xs text-slate-600">
          Tautan pencarian acara dibuat otomatis dari nama kota.
        </p>
      </section>
    </div>
  );
}
function CityThumbnail({ city }: { city: CityDocument }) {
  const builtin = city.builtInIllustration;
  return (
    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white">
      {city.imageKey ? (
        <img
          src={assetUrl(city.imageKey)!}
          alt=""
          width={48}
          height={48}
          className="h-full w-full object-contain"
        />
      ) : builtin ? (
        <span
          className="block h-12 w-8 bg-no-repeat"
          style={{
            backgroundImage: "url('/images/city-landmarks.webp')",
            backgroundSize: '500% 100%',
            backgroundPosition:
              (
                {
                  jakarta: '0%',
                  bandung: '25%',
                  yogyakarta: '50%',
                  surabaya: '75%',
                  denpasar: '100%',
                } as const
              )[builtin] + ' center',
          }}
          aria-hidden
        />
      ) : (
        <MapPin className="size-5 text-slate-500" aria-hidden />
      )}
    </div>
  );
}
