import { useId, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Field } from '@/components/common/states';
import { cn } from '@/lib/utils';
import { CmsEventSelector } from './cms-events';
import { CmsMedia } from './cms-media';
import type {
  BannerDocument,
  CmsDocument,
  CmsModule,
  CmsRecord,
  NavigationDocument,
  PageDocument,
  SectionDocument,
  SettingsDocument,
} from './cms-models';

function TextField({
  label,
  value,
  onChange,
  multiline = false,
  required = false,
  type = 'text',
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  required?: boolean;
  type?: 'text' | 'email' | 'url' | 'color' | 'datetime-local';
  hint?: string;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} required={required} hint={hint}>
      {multiline ? (
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={5}
          required={required}
          maxLength={100000}
        />
      ) : (
        <Input
          id={id}
          className="min-h-11"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type={type}
          required={required}
          maxLength={2000}
        />
      )}
    </Field>
  );
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 w-full items-center justify-between gap-4 rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-medium text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
    >
      {label}
      <span
        aria-hidden
        className={cn(
          'flex h-6 w-11 shrink-0 items-center rounded-full p-1',
          checked ? 'justify-end bg-blue-700' : 'justify-start bg-slate-300',
        )}
      >
        <span className="size-4 rounded-full bg-white" />
      </span>
    </button>
  );
}
function NumberField({
  label,
  value,
  onChange,
  min = 1,
  max = 48,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <Input
        id={id}
        className="min-h-11"
        type="number"
        min={min}
        max={max}
        required
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </Field>
  );
}
function FieldTabs({
  tabs,
}: {
  tabs: Array<{ value: string; label: string; content: ReactNode }>;
}) {
  return (
    <Tabs defaultValue={tabs[0]?.value}>
      <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-slate-100 p-1">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="min-h-11 px-3">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="space-y-5 pt-5">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
const eventChoices: Array<{
  value: SectionDocument['source'];
  label: string;
  description: string;
}> = [
  { value: 'manual', label: 'Pilih sendiri', description: 'Tentukan event dan urutannya.' },
  {
    value: 'popular',
    label: 'Paling laris',
    description: 'Event dengan penjualan tiket terbanyak.',
  },
  { value: 'upcoming', label: 'Event terdekat', description: 'Urutkan berdasarkan tanggal acara.' },
  { value: 'latest', label: 'Terbaru', description: 'Event yang baru diterbitkan.' },
];
function SectionFields({
  document,
  onChange,
}: {
  document: SectionDocument;
  onChange: (document: SectionDocument) => void;
}) {
  const set = <K extends keyof SectionDocument>(key: K, value: SectionDocument[K]) =>
    onChange({ ...document, [key]: value });
  if (document.kind === 'hero')
    return (
      <div className="space-y-4">
        <p className="text-sm leading-6 text-slate-600">
          Gambar, pesan, dan periode tayang banner utama diatur pada halaman Banner.
        </p>
        <Button asChild variant="outline">
          <Link to="/admin/cms/banners">Kelola banner utama</Link>
        </Button>
      </div>
    );
  return (
    <div className="space-y-5">
      <TextField
        label="Judul bagian"
        required
        value={document.title}
        onChange={(value) => set('title', value)}
      />
      {document.kind !== 'categories' ? (
        <>
          <TextField
            label="Kalimat pengantar"
            value={document.subtitle}
            onChange={(value) => set('subtitle', value)}
          />
          <TextField
            label="Deskripsi"
            multiline
            value={document.description}
            onChange={(value) => set('description', value)}
          />
        </>
      ) : null}
      <Toggle
        label="Tampilkan di beranda"
        checked={document.visible}
        onChange={(value) => set('visible', value)}
      />
      {document.kind === 'events' ? (
        <>
          <fieldset>
            <legend className="mb-3 text-sm font-medium text-slate-800">
              Event yang ditampilkan
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {eventChoices.map((choice) => (
                <button
                  key={choice.value}
                  type="button"
                  aria-pressed={document.source === choice.value}
                  onClick={() => set('source', choice.value)}
                  className={cn(
                    'min-h-24 rounded-lg border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600',
                    document.source === choice.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-400',
                  )}
                >
                  <span className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-900">
                    {choice.label}
                    {document.source === choice.value ? (
                      <Check className="size-4 text-blue-700" aria-hidden />
                    ) : null}
                  </span>
                  <span className="mt-2 block text-xs leading-5 text-slate-600">
                    {choice.description}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
          <NumberField
            label="Jumlah maksimal event"
            value={document.limit}
            onChange={(value) => set('limit', value)}
          />
          {document.source === 'manual' ? (
            <CmsEventSelector
              value={document.eventIds}
              onChange={(value) => set('eventIds', value)}
            />
          ) : (
            <p className="text-sm leading-6 text-slate-600">
              Daftar diperbarui otomatis dari event aktif. Event yang pernah dipilih sendiri tetap
              tersimpan.
            </p>
          )}
        </>
      ) : document.kind === 'categories' ? (
        <>
          <NumberField
            label="Jumlah maksimal kategori"
            value={document.limit}
            onChange={(value) => set('limit', value)}
          />
          <p className="text-sm leading-6 text-slate-600">
            Kategori diambil dari daftar kategori event yang aktif.
          </p>
        </>
      ) : document.kind === 'cities' ? (
        <>
          <NumberField
            label="Jumlah maksimal kota"
            value={document.limit}
            onChange={(value) => set('limit', value)}
          />
          <Button asChild variant="outline">
            <Link to="/admin/cms/cities">Kelola kota dan ilustrasi</Link>
          </Button>
        </>
      ) : (
        <p className="text-sm leading-6 text-slate-600">
          Materi promosi mengikuti promosi aktif yang dikelola tim operasional.
        </p>
      )}
    </div>
  );
}
const systemDestinations = [
  { href: '/', label: 'Beranda' },
  { href: '/events', label: 'Semua event' },
  { href: '/cities', label: 'Jelajahi kota' },
  { href: '/terms', label: 'Syarat dan ketentuan' },
  { href: '/privacy', label: 'Kebijakan privasi' },
  { href: '/organizer/apply', label: 'Menjadi organizer' },
  { href: '/login', label: 'Masuk ke akun' },
  { href: '/register', label: 'Daftar akun' },
  { href: '/account/orders', label: 'Tiket dan pesanan saya' },
];
function DestinationField({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const id = useId();
  const [externalMode, setExternalMode] = useState(/^https?:\/\//i.test(value));
  const pages = useQuery({
    queryKey: ['cms', 'destination-pages'],
    queryFn: () => api<{ items: CmsRecord[] }>('/admin/cms/pages'),
    staleTime: 30_000,
  });
  const destinations = [
    ...systemDestinations,
    ...(pages.data?.items.flatMap((record) => {
      const page = record.published as PageDocument | null;
      return page?.visible ? [{ href: `/pages/${page.slug}`, label: page.title }] : [];
    }) ?? []),
  ];
  const external = externalMode || /^https?:\/\//i.test(value);
  const unknown = value.startsWith('/') && !destinations.some((item) => item.href === value);
  return (
    <div className="space-y-3">
      <Field label={label} htmlFor={id} required={required}>
        <select
          id={id}
          required={required}
          className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
          value={external ? '__external__' : value}
          onChange={(event) => {
            const nextExternal = event.target.value === '__external__';
            setExternalMode(nextExternal);
            onChange(nextExternal ? '' : event.target.value);
          }}
        >
          <option value="">{required ? 'Pilih halaman tujuan' : 'Tanpa tautan'}</option>
          <optgroup label="Halaman website">
            {destinations.map((item) => (
              <option key={item.href} value={item.href}>
                {item.label}
              </option>
            ))}
            {unknown ? <option value={value}>Halaman yang dipilih sebelumnya</option> : null}
          </optgroup>
          <option value="__external__">Tautan eksternal</option>
        </select>
      </Field>
      {external ? (
        <TextField
          label="Alamat website tujuan"
          value={value.startsWith('/') ? '' : value}
          onChange={onChange}
          type="url"
          required={required}
          hint="Masukkan alamat lengkap, misalnya https://contoh.com."
        />
      ) : null}
      {pages.isError ? (
        <div role="alert" className="text-sm text-red-700">
          Daftar halaman tambahan belum tersedia. {errorMessage(pages.error)}{' '}
          <Button variant="link" type="button" onClick={() => void pages.refetch()}>
            Muat ulang daftar
          </Button>
        </div>
      ) : pages.isLoading ? (
        <p role="status" className="text-xs text-slate-600">
          Memuat halaman tambahan…
        </p>
      ) : null}
    </div>
  );
}
function dateInput(value: string | undefined) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function BannerFields({
  document,
  onChange,
  onBusy,
}: {
  document: BannerDocument;
  onChange: (document: BannerDocument) => void;
  onBusy: (busy: boolean) => void;
}) {
  const set = <K extends keyof BannerDocument>(key: K, value: BannerDocument[K]) =>
    onChange({ ...document, [key]: value });
  return (
    <FieldTabs
      tabs={[
        {
          value: 'content',
          label: 'Konten',
          content: (
            <>
              <TextField
                label="Judul banner"
                required
                value={document.title}
                onChange={(value) => set('title', value)}
              />
              <TextField
                label="Kalimat pengantar"
                value={document.subtitle}
                onChange={(value) => set('subtitle', value)}
              />
              <TextField
                label="Deskripsi banner"
                multiline
                value={document.description}
                onChange={(value) => set('description', value)}
              />
              <TextField
                label="Teks tombol"
                value={document.ctaText}
                onChange={(value) => set('ctaText', value)}
              />
              <DestinationField
                label="Tujuan tombol"
                value={document.ctaUrl}
                onChange={(value) => set('ctaUrl', value)}
              />
            </>
          ),
        },
        {
          value: 'images',
          label: 'Gambar',
          content: (
            <>
              <CmsMedia
                label="Gambar desktop"
                value={document.imageKey}
                onChange={(value) => set('imageKey', value)}
                onBusy={onBusy}
              />
              <CmsMedia
                label="Gambar ponsel (opsional)"
                value={document.mobileImageKey}
                onChange={(value) => set('mobileImageKey', value)}
                onBusy={onBusy}
              />
              <p className="text-sm text-slate-600">
                Gambar desktop juga tampil di ponsel jika gambar ponsel belum ditambahkan.
              </p>
            </>
          ),
        },
        {
          value: 'display',
          label: 'Tampilan',
          content: (
            <>
              <Toggle
                label="Tampilkan banner"
                checked={document.visible}
                onChange={(value) => set('visible', value)}
              />
              <TextField
                label="Mulai tayang"
                type="datetime-local"
                value={dateInput(document.startsAt)}
                onChange={(value) => set('startsAt', value ? new Date(value).toISOString() : '')}
              />
              <TextField
                label="Selesai tayang"
                type="datetime-local"
                value={dateInput(document.endsAt)}
                onChange={(value) => set('endsAt', value ? new Date(value).toISOString() : '')}
              />
              <p className="text-sm leading-6 text-slate-600">
                Waktu mengikuti zona waktu perangkat Anda. Kosongkan periode untuk menampilkan
                banner tanpa batas waktu.
              </p>
              {document.startsAt && document.endsAt && document.endsAt <= document.startsAt ? (
                <p role="alert" className="text-sm text-red-700">
                  Waktu selesai harus setelah waktu mulai.
                </p>
              ) : null}
            </>
          ),
        },
      ]}
    />
  );
}
function pageAddress(title: string) {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
function PageFields({
  document,
  onChange,
}: {
  document: PageDocument;
  onChange: (document: PageDocument) => void;
}) {
  const set = <K extends keyof PageDocument>(key: K, value: PageDocument[K]) =>
    onChange({ ...document, [key]: value });
  return (
    <div className="space-y-5">
      <TextField
        label="Judul halaman"
        required
        value={document.title}
        onChange={(value) =>
          onChange({
            ...document,
            title: value,
            slug:
              !document.slug || document.slug === pageAddress(document.title)
                ? pageAddress(value)
                : document.slug,
          })
        }
      />
      <TextField
        label="Alamat halaman"
        required
        value={document.slug}
        onChange={(value) => set('slug', pageAddress(value))}
        hint={`Alamat website: /pages/${document.slug || 'nama-halaman'}. Dibuat otomatis dari judul dan dapat diubah.`}
      />
      <TextField
        label="Isi halaman"
        multiline
        required
        value={document.content}
        onChange={(value) => set('content', value)}
        hint="Gunakan # untuk judul, - untuk daftar, dan **teks** untuk penekanan. Periksa hasilnya melalui Pratinjau."
      />
      <TextField
        label="Judul di hasil pencarian"
        value={document.seoTitle}
        onChange={(value) => set('seoTitle', value)}
      />
      <TextField
        label="Deskripsi di hasil pencarian"
        multiline
        value={document.seoDescription}
        onChange={(value) => set('seoDescription', value)}
      />
      <Toggle
        label="Tampilkan halaman"
        checked={document.visible}
        onChange={(value) => set('visible', value)}
      />
    </div>
  );
}
function NavigationFields({
  document,
  onChange,
  placement,
}: {
  document: NavigationDocument;
  onChange: (document: NavigationDocument) => void;
  placement?: NavigationDocument['placement'];
}) {
  const set = <K extends keyof NavigationDocument>(key: K, value: NavigationDocument[K]) =>
    onChange({ ...document, [key]: value });
  return (
    <div className="space-y-5">
      <TextField
        label="Nama tautan"
        required
        value={document.label}
        onChange={(value) => set('label', value)}
      />
      <DestinationField
        label="Halaman tujuan"
        required
        value={document.href}
        onChange={(value) => set('href', value)}
      />
      {!placement ? (
        <label className="grid gap-2 text-sm font-medium">
          Letak tautan
          <select
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3"
            value={document.placement}
            onChange={(event) =>
              set('placement', event.target.value as NavigationDocument['placement'])
            }
          >
            <option value="HEADER">Bagian atas website</option>
            <option value="FOOTER">Bagian bawah website</option>
          </select>
        </label>
      ) : null}
      <Toggle
        label="Tampilkan tautan"
        checked={document.visible}
        onChange={(value) => set('visible', value)}
      />
      {/^https?:\/\//i.test(document.href) ? (
        <Toggle
          label="Buka di tab baru"
          checked={document.external}
          onChange={(value) => set('external', value)}
        />
      ) : null}
    </div>
  );
}
function SettingsFields({
  document,
  onChange,
  onBusy,
}: {
  document: SettingsDocument;
  onChange: (document: SettingsDocument) => void;
  onBusy: (busy: boolean) => void;
}) {
  const set = <K extends keyof SettingsDocument>(key: K, value: SettingsDocument[K]) =>
    onChange({ ...document, [key]: value });
  const text = (
    key: keyof SettingsDocument,
    label: string,
    multiline = false,
    type: 'text' | 'email' | 'url' | 'color' = 'text',
  ) => (
    <TextField
      key={key}
      label={label}
      value={String(document[key])}
      onChange={(value) => set(key, value)}
      multiline={multiline}
      type={type}
    />
  );
  const media = (key: 'logoKey' | 'faviconKey' | 'ogImageKey' | 'footerLogoKey', label: string) => (
    <CmsMedia
      label={label}
      value={document[key]}
      onChange={(value) => set(key, value)}
      onBusy={onBusy}
    />
  );
  return (
    <FieldTabs
      tabs={[
        {
          value: 'identity',
          label: 'Identitas',
          content: (
            <>
              {text('websiteName', 'Nama website')}
              {text('description', 'Deskripsi website', true)}
              {media('logoKey', 'Logo website')}
              {media('faviconKey', 'Ikon tab browser')}
              <div className="grid gap-4 sm:grid-cols-2">
                {text('primaryColor', 'Warna utama', false, 'color')}
                {text('secondaryColor', 'Warna pendamping', false, 'color')}
              </div>
              {text('announcement', 'Pengumuman website')}
              <label className="grid gap-2 text-sm font-medium">
                Bahasa awal
                <select
                  className="min-h-11 rounded-lg border border-slate-300 bg-white px-3"
                  value={document.defaultLanguage}
                  onChange={(event) =>
                    set(
                      'defaultLanguage',
                      event.target.value as SettingsDocument['defaultLanguage'],
                    )
                  }
                >
                  <option value="id">Bahasa Indonesia</option>
                  <option value="en">Bahasa Inggris</option>
                </select>
              </label>
              {text('timezone', 'Zona waktu')}
            </>
          ),
        },
        {
          value: 'contact',
          label: 'Kontak & Sosmed',
          content: (
            <>
              {text('email', 'Email', false, 'email')}
              {text('phone', 'Nomor telepon')}
              {text('whatsapp', 'WhatsApp')}
              {text('instagram', 'Instagram', false, 'url')}
              {text('tiktok', 'TikTok', false, 'url')}
              {text('otherSocialUrl', 'Media sosial lainnya', false, 'url')}
            </>
          ),
        },
        {
          value: 'footer',
          label: 'Footer link',
          content: (
            <>
              <p className="text-sm leading-6 text-slate-600">
                Atur logo, deskripsi, dan susunan tautan bagian bawah website melalui Menu & Footer.
              </p>
              <Button asChild variant="outline">
                <Link to="/admin/cms/navigation">Kelola Menu & Footer</Link>
              </Button>
              {text('copyright', 'Teks hak cipta')}
            </>
          ),
        },
        {
          value: 'seo',
          label: 'SEO',
          content: (
            <>
              {text('seoTitle', 'Judul di hasil pencarian')}
              {text('seoDescription', 'Deskripsi di hasil pencarian', true)}
              {text('siteUrl', 'Alamat utama website', false, 'url')}
              {media('ogImageKey', 'Gambar saat tautan dibagikan')}
            </>
          ),
        },
        {
          value: 'maintenance',
          label: 'Maintenance',
          content: (
            <>
              <Toggle
                label="Aktifkan pemeliharaan website"
                checked={document.maintenance}
                onChange={(value) => set('maintenance', value)}
              />
              <p className="text-sm leading-6 text-slate-600">
                Setelah diterbitkan, pengunjung melihat halaman pemeliharaan. Halaman masuk dan
                dashboard tetap dapat digunakan.
              </p>
              {text('maintenanceMessage', 'Pesan untuk pengunjung', true)}
            </>
          ),
        },
      ]}
    />
  );
}
export function CmsFields({
  module,
  document,
  onChange,
  onBusy,
  placement,
}: {
  module: CmsModule;
  document: CmsDocument;
  onChange: (document: CmsDocument) => void;
  featured: boolean;
  onBusy: (busy: boolean) => void;
  placement?: NavigationDocument['placement'];
}) {
  switch (module) {
    case 'sections':
      return <SectionFields document={document as SectionDocument} onChange={onChange} />;
    case 'banners':
      return (
        <BannerFields document={document as BannerDocument} onChange={onChange} onBusy={onBusy} />
      );
    case 'pages':
      return <PageFields document={document as PageDocument} onChange={onChange} />;
    case 'navigation':
      return (
        <NavigationFields
          document={document as NavigationDocument}
          onChange={onChange}
          placement={placement}
        />
      );
    case 'settings':
      return (
        <SettingsFields
          document={document as SettingsDocument}
          onChange={onChange}
          onBusy={onBusy}
        />
      );
  }
}
