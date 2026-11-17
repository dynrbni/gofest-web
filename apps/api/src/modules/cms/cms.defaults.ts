import { sectionSchema, websiteSchema, citySchema } from './cms.schemas';

export const defaultWebsite = websiteSchema.parse({
  websiteName: 'Gofest',
  description: 'Temukan konser, festival dan pengalaman seru di Gofest.',
  footerDescription:
    'Tempat menemukan acara, bertemu orang baru, dan membawa pulang cerita. Pilih pengalamanmu berikutnya di Gofest.',
  copyright: 'Gofest Indonesia.',
});
export const defaultSections = [
  { key: 'hero', kind: 'hero', title: 'Temukan pengalaman berikutnya', sortOrder: 0 },
  { key: 'promotions', kind: 'promotion', title: 'Informasi dan promosi GOFEST', sortOrder: 1 },
  { key: 'events-for-you', kind: 'events', title: 'Event Seru Untukmu', sortOrder: 2 },
  { key: 'categories', kind: 'categories', title: 'Kategori Event', sortOrder: 3 },
  { key: 'cities', kind: 'cities', title: 'Jelajahi Event di Kotamu', sortOrder: 4 },
].map(({ key, ...document }) => ({ key, ...sectionSchema.parse(document) }));

export const defaultCities = [
  { name: 'Jakarta', slug: 'jakarta', accent: 'coral' },
  { name: 'Bandung', slug: 'bandung', accent: 'blue' },
  { name: 'Yogyakarta', slug: 'yogyakarta', accent: 'gold' },
  { name: 'Surabaya', slug: 'surabaya', accent: 'green' },
  { name: 'Denpasar', slug: 'denpasar', accent: 'cyan' },
].map((city, sortOrder) => ({
  key: city.slug,
  ...citySchema.parse({
    ...city,
    imageKey: '',
    builtInIllustration: city.slug,
    visible: true,
    sortOrder,
  }),
}));
