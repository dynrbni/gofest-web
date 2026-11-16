import { z } from 'zod';

export const cmsCollections = ['sections', 'banners', 'pages', 'navigation', 'settings'] as const;
export type CmsCollection = (typeof cmsCollections)[number];
export const collectionSchema = z.enum(cmsCollections);
const text = (max = 500) => z.string().trim().max(max).default('');
export const destination = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => {
    if (!value) return true;
    if (value.startsWith('/') && !value.startsWith('//') && !/[\\\s]/.test(value)) return true;
    try {
      return ['https:', 'http:'].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, 'Gunakan path internal /halaman atau URL http/https yang valid')
  .default('');
const image = z
  .string()
  .max(500)
  .regex(/^(?:[a-zA-Z0-9/_\-.]+)?$/, 'Gunakan gambar dari media uploader')
  .refine((value) => !value.includes('..'), 'Path gambar tidak valid')
  .default('');
const common = {
  visible: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(10000).default(0),
};
export const sectionSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    subtitle: text(),
    description: text(2000),
    ...common,
    kind: z.enum(['hero', 'events', 'categories', 'cities', 'promotion']),
    source: z.enum(['manual', 'upcoming', 'popular', 'latest']).default('upcoming'),
    limit: z.number().int().min(1).max(48).default(12),
    eventIds: z
      .array(z.string().min(1).max(100))
      .max(100)
      .default([])
      .refine((ids) => new Set(ids).size === ids.length, 'Event tidak boleh duplikat'),
    layout: z.enum(['grid', 'shelf']).default('grid'),
  })
  .strict();
export const bannerSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    subtitle: text(),
    description: text(2000),
    imageKey: image,
    mobileImageKey: image,
    ctaText: text(100),
    ctaUrl: destination,
    ...common,
  })
  .strict();
const reservedSlugs = new Set([
  'admin',
  'creator',
  'organizer',
  'account',
  'login',
  'register',
  'checkout',
  'order',
  'events',
  'staff',
  'api',
  'uploads',
  'cms',
  'pages',
]);
export const pageSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .refine((slug) => !reservedSlugs.has(slug), 'Slug ini digunakan sistem'),
    content: z.string().max(100000),
    seoTitle: text(200),
    seoDescription: text(500),
    visible: z.boolean().default(true),
  })
  .strict();
export const navigationSchema = z
  .object({
    label: z.string().trim().min(1).max(100),
    href: destination.refine(Boolean, 'Tujuan wajib diisi'),
    placement: z.enum(['HEADER', 'FOOTER']),
    external: z.boolean().default(false),
    ...common,
  })
  .strict();
const brandColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Gunakan warna hex 6 digit');
export const websiteSchema = z
  .object({
    websiteName: z.string().trim().min(1).max(100).default('Gofest'),
    description: text(2000),
    logoKey: image,
    faviconKey: image,
    primaryColor: brandColor.default('#2563eb'),
    secondaryColor: brandColor.default('#0f172a'),
    seoTitle: text(200),
    seoDescription: text(500),
    ogImageKey: image,
    siteUrl: destination.refine(
      (url) => !url || /^https?:\/\//.test(url),
      'Site URL harus absolut',
    ),
    email: z.string().email().or(z.literal('')).default(''),
    phone: text(40),
    whatsapp: text(40),
    instagram: destination,
    tiktok: destination,
    otherSocialUrl: destination,
    footerDescription: text(2000),
    footerLogoKey: image,
    copyright: text(500),
    maintenance: z.boolean().default(false),
    maintenanceMessage: text(2000),
    announcement: text(1000),
    defaultLanguage: z.enum(['id', 'en']).default('id'),
    timezone: z
      .string()
      .max(100)
      .default('Asia/Jakarta')
      .refine((value) => {
        try {
          new Intl.DateTimeFormat('id', { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, 'Timezone tidak valid'),
  })
  .strict();
export const documentSchemas = {
  sections: sectionSchema,
  banners: bannerSchema,
  pages: pageSchema,
  navigation: navigationSchema,
  settings: websiteSchema,
};
export const saveCmsSchema = z
  .object({
    key: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    document: z.record(z.unknown()),
    expectedVersion: z.number().int().positive().optional(),
  })
  .strict();
export const publishCmsSchema = z.object({ expectedVersion: z.number().int().positive() }).strict();
export type SectionDocument = z.infer<typeof sectionSchema>;
