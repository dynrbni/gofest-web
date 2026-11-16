import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/common/states';
import { CmsEventSelector } from './cms-events';
import { CmsMedia } from './cms-media';
import type {
  BannerDocument,
  CmsDocument,
  CmsModule,
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
  type?: 'text' | 'email' | 'url' | 'color';
  hint?: string;
}) {
  const id = `cms-${label.replaceAll(' ', '-').toLowerCase()}`;
  return (
    <Field label={label} htmlFor={id} required={required} hint={hint}>
      {multiline ? (
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          required={required}
          maxLength={100000}
        />
      ) : (
        <Input
          id={id}
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
    <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-slate-700">
      <input
        type="checkbox"
        className="h-4 w-4 accent-blue-700"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 10000,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  const id = `cms-${label.replaceAll(' ', '-').toLowerCase()}`;
  return (
    <Field label={label} htmlFor={id}>
      <Input
        id={id}
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
function SectionFields({
  document,
  onChange,
  featured,
}: {
  document: SectionDocument;
  onChange: (document: SectionDocument) => void;
  featured: boolean;
}) {
  const set = <K extends keyof SectionDocument>(key: K, value: SectionDocument[K]) =>
    onChange({ ...document, [key]: value });
  return (
    <div className="space-y-5">
      <TextField
        label="Judul section"
        required
        value={document.title}
        onChange={(value) => set('title', value)}
      />
      <TextField
        label="Subtitle"
        value={document.subtitle}
        onChange={(value) => set('subtitle', value)}
      />
      <TextField
        label="Deskripsi section"
        multiline
        value={document.description}
        onChange={(value) => set('description', value)}
      />
      <Toggle
        label="Tampilkan section"
        checked={document.visible}
        onChange={(value) => set('visible', value)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Urutan section"
          value={document.sortOrder}
          onChange={(value) => set('sortOrder', value)}
        />
        <NumberField
          label="Maksimal acara tampil"
          value={document.limit}
          min={1}
          max={48}
          onChange={(value) => set('limit', value)}
        />
        {!featured ? (
          <label className="grid gap-2 text-sm font-medium">
            Jenis section
            <select
              className="h-11 rounded-lg border border-slate-300 bg-white px-3"
              value={document.kind}
              onChange={(event) => set('kind', event.target.value as SectionDocument['kind'])}
            >
              <option value="events">Daftar acara</option>
              <option value="hero">Hero acara</option>
              <option value="categories">Kategori acara</option>
              <option value="cities">Kota pilihan</option>
              <option value="promotion">Promosi / CTA</option>
            </select>
          </label>
        ) : null}
        <label className="grid gap-2 text-sm font-medium">
          Tampilan
          <select
            className="h-11 rounded-lg border border-slate-300 bg-white px-3"
            value={document.layout}
            onChange={(event) => set('layout', event.target.value as SectionDocument['layout'])}
          >
            <option value="grid">Grid</option>
            <option value="shelf">Baris horizontal</option>
          </select>
        </label>
      </div>
      {['hero', 'events'].includes(document.kind) ? (
        <>
          <label className="grid gap-2 text-sm font-medium">
            Sumber acara
            <select
              className="h-11 rounded-lg border border-slate-300 bg-white px-3"
              value={document.source}
              onChange={(event) => set('source', event.target.value as SectionDocument['source'])}
            >
              <option value="manual">Pilih manual</option>
              <option value="upcoming">Acara terdekat</option>
              <option value="popular">Acara populer berdasarkan penjualan</option>
              <option value="latest">Acara terbaru</option>
            </select>
          </label>
          {document.source === 'manual' ? (
            <CmsEventSelector
              value={document.eventIds}
              onChange={(value) => set('eventIds', value)}
            />
          ) : (
            <p className="rounded-lg bg-blue-50 p-4 text-sm leading-6 text-blue-900">
              Daftar acara diperbarui otomatis dari acara publik yang aktif. Pilihan manual tetap
              tersimpan ketika sumber diubah.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
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
    <div className="space-y-5">
      <TextField
        label="Judul banner"
        required
        value={document.title}
        onChange={(value) => set('title', value)}
      />
      <TextField
        label="Subtitle"
        value={document.subtitle}
        onChange={(value) => set('subtitle', value)}
      />
      <TextField
        label="Deskripsi banner"
        multiline
        value={document.description}
        onChange={(value) => set('description', value)}
      />
      <CmsMedia
        label="Gambar desktop"
        value={document.imageKey}
        onChange={(value) => set('imageKey', value)}
        onBusy={onBusy}
      />
      <CmsMedia
        label="Gambar mobile"
        value={document.mobileImageKey}
        onChange={(value) => set('mobileImageKey', value)}
        onBusy={onBusy}
      />
      <TextField
        label="Teks tombol"
        value={document.ctaText}
        onChange={(value) => set('ctaText', value)}
      />
      <TextField
        label="Tautan tujuan banner"
        value={document.ctaUrl}
        hint="Path seperti /events atau URL https://"
        onChange={(value) => set('ctaUrl', value)}
      />
      <NumberField
        label="Urutan banner"
        value={document.sortOrder}
        onChange={(value) => set('sortOrder', value)}
      />
      <Toggle
        label="Tampilkan banner"
        checked={document.visible}
        onChange={(value) => set('visible', value)}
      />
    </div>
  );
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
        onChange={(value) => set('title', value)}
      />
      <TextField
        label="Slug halaman"
        required
        value={document.slug}
        hint="Huruf kecil, angka, dan tanda hubung. Contoh: tentang-kami."
        onChange={(value) => set('slug', value)}
      />
      <TextField
        label="Isi halaman"
        multiline
        required
        value={document.content}
        hint="Mendukung Markdown: heading, daftar, penekanan, dan tautan. Preview website menampilkan hasil akhir."
        onChange={(value) => set('content', value)}
      />
      <TextField
        label="Judul SEO halaman"
        value={document.seoTitle}
        onChange={(value) => set('seoTitle', value)}
      />
      <TextField
        label="Deskripsi SEO halaman"
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
}: {
  document: NavigationDocument;
  onChange: (document: NavigationDocument) => void;
}) {
  const set = <K extends keyof NavigationDocument>(key: K, value: NavigationDocument[K]) =>
    onChange({ ...document, [key]: value });
  return (
    <div className="space-y-5">
      <TextField
        label="Label menu"
        required
        value={document.label}
        onChange={(value) => set('label', value)}
      />
      <TextField
        label="Tujuan menu"
        required
        value={document.href}
        hint="Path internal seperti /events atau URL https://"
        onChange={(value) => set('href', value)}
      />
      <label className="grid gap-2 text-sm font-medium">
        Posisi menu
        <select
          className="h-11 rounded-lg border border-slate-300 bg-white px-3"
          value={document.placement}
          onChange={(event) =>
            set('placement', event.target.value as NavigationDocument['placement'])
          }
        >
          <option value="HEADER">Header</option>
          <option value="FOOTER">Footer</option>
        </select>
      </label>
      <NumberField
        label="Urutan menu"
        value={document.sortOrder}
        onChange={(value) => set('sortOrder', value)}
      />
      <Toggle
        label="Tampilkan menu"
        checked={document.visible}
        onChange={(value) => set('visible', value)}
      />
      <Toggle
        label="Buka tautan eksternal di tab baru"
        checked={document.external}
        onChange={(value) => set('external', value)}
      />
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
    <div className="space-y-8">
      <section className="space-y-4">
        <h3 className="font-semibold text-slate-900">Identitas website</h3>
        {text('websiteName', 'Nama website')}
        {text('description', 'Deskripsi website', true)}
        {media('logoKey', 'Logo website')}
        {media('faviconKey', 'Favicon')}
        <div className="grid gap-4 sm:grid-cols-2">
          {text('primaryColor', 'Warna utama', false, 'color')}
          {text('secondaryColor', 'Warna sekunder', false, 'color')}
        </div>
      </section>
      <section className="space-y-4 border-t pt-6">
        <h3 className="font-semibold text-slate-900">SEO</h3>
        {text('seoTitle', 'Judul SEO default')}
        {text('seoDescription', 'Deskripsi SEO default', true)}
        {text('siteUrl', 'URL website', false, 'url')}
        {media('ogImageKey', 'Gambar OG default')}
      </section>
      <section className="space-y-4 border-t pt-6">
        <h3 className="font-semibold text-slate-900">Kontak & media sosial</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {text('email', 'Email', false, 'email')}
          {text('phone', 'Nomor telepon')}
          {text('whatsapp', 'WhatsApp')}
          {text('instagram', 'Instagram', false, 'url')}
          {text('tiktok', 'TikTok', false, 'url')}
          {text('otherSocialUrl', 'Tautan sosial lainnya', false, 'url')}
        </div>
      </section>
      <section className="space-y-4 border-t pt-6">
        <h3 className="font-semibold text-slate-900">Footer</h3>
        {media('footerLogoKey', 'Logo footer')}
        {text('footerDescription', 'Deskripsi footer', true)}
        {text('copyright', 'Teks copyright')}
        <p className="text-sm text-slate-600">
          Tautan footer diatur melalui modul Navigasi dengan posisi Footer.
        </p>
      </section>
      <section className="space-y-4 border-t pt-6">
        <h3 className="font-semibold text-slate-900">Konfigurasi website</h3>
        {text('announcement', 'Pengumuman website')}
        <label className="grid gap-2 text-sm font-medium">
          Bahasa default
          <select
            className="h-11 rounded-lg border border-slate-300 bg-white px-3"
            value={document.defaultLanguage}
            onChange={(event) =>
              set('defaultLanguage', event.target.value as SettingsDocument['defaultLanguage'])
            }
          >
            <option value="id">Bahasa Indonesia</option>
            <option value="en">English</option>
          </select>
        </label>
        {text('timezone', 'Zona waktu')}
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <Toggle
            label="Aktifkan maintenance website publik"
            checked={document.maintenance}
            onChange={(value) => set('maintenance', value)}
          />
          <p className="text-xs leading-5 text-amber-900">
            Mode maintenance berlaku setelah pengaturan dipublikasikan. Dashboard dan login tetap
            dapat diakses.
          </p>
          {text('maintenanceMessage', 'Pesan maintenance', true)}
        </div>
      </section>
    </div>
  );
}
export function CmsFields({
  module,
  document,
  onChange,
  featured,
  onBusy,
}: {
  module: CmsModule;
  document: CmsDocument;
  onChange: (document: CmsDocument) => void;
  featured: boolean;
  onBusy: (busy: boolean) => void;
}) {
  switch (module) {
    case 'sections':
      return (
        <SectionFields
          document={document as SectionDocument}
          onChange={onChange}
          featured={featured}
        />
      );
    case 'banners':
      return (
        <BannerFields document={document as BannerDocument} onChange={onChange} onBusy={onBusy} />
      );
    case 'pages':
      return <PageFields document={document as PageDocument} onChange={onChange} />;
    case 'navigation':
      return <NavigationFields document={document as NavigationDocument} onChange={onChange} />;
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
