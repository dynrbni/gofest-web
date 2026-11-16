export type CmsModule = 'sections' | 'banners' | 'pages' | 'navigation' | 'settings';
export interface SectionDocument {
  title: string;
  subtitle: string;
  description: string;
  visible: boolean;
  sortOrder: number;
  source: 'manual' | 'upcoming' | 'popular' | 'latest';
  limit: number;
  eventIds: string[];
  kind: 'hero' | 'events' | 'categories' | 'cities' | 'promotion';
  layout: 'grid' | 'shelf';
}
export interface BannerDocument {
  title: string;
  subtitle: string;
  description: string;
  imageKey: string;
  mobileImageKey: string;
  ctaText: string;
  ctaUrl: string;
  visible: boolean;
  sortOrder: number;
}
export interface PageDocument {
  title: string;
  slug: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  visible: boolean;
}
export interface NavigationDocument {
  label: string;
  href: string;
  placement: 'HEADER' | 'FOOTER';
  visible: boolean;
  sortOrder: number;
  external: boolean;
}
export interface SettingsDocument {
  websiteName: string;
  description: string;
  logoKey: string;
  faviconKey: string;
  primaryColor: string;
  secondaryColor: string;
  seoTitle: string;
  seoDescription: string;
  ogImageKey: string;
  siteUrl: string;
  email: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  tiktok: string;
  otherSocialUrl: string;
  footerDescription: string;
  footerLogoKey: string;
  copyright: string;
  maintenance: boolean;
  maintenanceMessage: string;
  announcement: string;
  defaultLanguage: 'id' | 'en';
  timezone: string;
}
export type CmsDocument =
  SectionDocument | BannerDocument | PageDocument | NavigationDocument | SettingsDocument;
export interface CmsRecord {
  id: string;
  key: string;
  status: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';
  draft: CmsDocument;
  published: CmsDocument | null;
  version: number;
  publishedAt: string | null;
  updatedAt: string;
}
export interface CmsEvent {
  id: string;
  title: string;
  coverKey: string | null;
  organizer: { organizationName: string };
  category: { name: string } | null;
  startsAt: string;
  city: string | null;
  status: string;
}
export const MODULES: { key: CmsModule | 'overview'; label: string; description: string }[] = [
  {
    key: 'overview',
    label: 'Ringkasan',
    description: 'Status website dan aktivitas publikasi terbaru.',
  },
  {
    key: 'sections',
    label: 'Homepage',
    description: 'Atur susunan, sumber acara, dan bagian yang tampil di beranda.',
  },
  {
    key: 'banners',
    label: 'Banner',
    description: 'Kelola gambar desktop dan mobile, pesan promosi, serta tautan tujuan.',
  },
  {
    key: 'pages',
    label: 'Halaman',
    description: 'Tulis halaman informasi dengan konten dan metadata pencarian.',
  },
  { key: 'navigation', label: 'Navigasi', description: 'Susun tautan header dan footer website.' },
  {
    key: 'settings',
    label: 'Branding & pengaturan',
    description: 'Atur identitas, SEO, footer, kontak, dan mode maintenance.',
  },
];
export function defaultDocument(module: CmsModule): CmsDocument {
  switch (module) {
    case 'sections':
      return {
        title: '',
        subtitle: '',
        description: '',
        visible: true,
        sortOrder: 0,
        source: 'manual',
        limit: 8,
        eventIds: [],
        kind: 'events',
        layout: 'grid',
      };
    case 'banners':
      return {
        title: '',
        subtitle: '',
        description: '',
        imageKey: '',
        mobileImageKey: '',
        ctaText: '',
        ctaUrl: '',
        visible: true,
        sortOrder: 0,
      };
    case 'pages':
      return { title: '', slug: '', content: '', seoTitle: '', seoDescription: '', visible: true };
    case 'navigation':
      return {
        label: '',
        href: '',
        placement: 'HEADER',
        visible: true,
        sortOrder: 0,
        external: false,
      };
    case 'settings':
      return {
        websiteName: 'GOFEST',
        description: '',
        logoKey: '',
        faviconKey: '',
        primaryColor: '#0052CC',
        secondaryColor: '#FF5A36',
        seoTitle: '',
        seoDescription: '',
        ogImageKey: '',
        siteUrl: '',
        email: '',
        phone: '',
        whatsapp: '',
        instagram: '',
        tiktok: '',
        otherSocialUrl: '',
        footerDescription: '',
        footerLogoKey: '',
        copyright: '',
        maintenance: false,
        maintenanceMessage: '',
        announcement: '',
        defaultLanguage: 'id',
        timezone: 'Asia/Jakarta',
      };
  }
}
export function recordTitle(record: CmsRecord) {
  if ('title' in record.draft) return record.draft.title || record.key;
  if ('label' in record.draft) return record.draft.label || record.key;
  return record.draft.websiteName;
}
