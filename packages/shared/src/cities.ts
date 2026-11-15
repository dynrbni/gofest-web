export const CITY_SLUGS = ['jakarta', 'bandung', 'yogyakarta', 'surabaya', 'denpasar'] as const;

export type CitySlug = (typeof CITY_SLUGS)[number];

export const EVENT_CITIES = [
  {
    slug: 'jakarta',
    name: 'Jakarta',
    landmark: 'Monas',
    landmarkPosition: '0% center',
    aliases: [
      'Jakarta',
      'Kota Jakarta',
      'DKI Jakarta',
      'Daerah Khusus Jakarta',
      'Jakarta Pusat',
      'Jakarta Barat',
      'Jakarta Selatan',
      'Jakarta Timur',
      'Jakarta Utara',
      'Kota Jakarta Pusat',
      'Kota Jakarta Barat',
      'Kota Jakarta Selatan',
      'Kota Jakarta Timur',
      'Kota Jakarta Utara',
    ],
  },
  {
    slug: 'bandung',
    name: 'Bandung',
    landmark: 'Gedung Sate',
    landmarkPosition: '25% center',
    aliases: ['Bandung', 'Kota Bandung'],
  },
  {
    slug: 'yogyakarta',
    name: 'Yogyakarta',
    landmark: 'Tugu Yogyakarta',
    landmarkPosition: '50% center',
    aliases: ['Yogyakarta', 'Kota Yogyakarta', 'Jogja', 'Jogjakarta'],
  },
  {
    slug: 'surabaya',
    name: 'Surabaya',
    landmark: 'Patung Sura dan Baya',
    landmarkPosition: '75% center',
    aliases: ['Surabaya', 'Kota Surabaya'],
  },
  {
    slug: 'denpasar',
    name: 'Denpasar',
    landmark: 'Pura di Denpasar',
    landmarkPosition: '100% center',
    aliases: ['Denpasar', 'Kota Denpasar'],
  },
] as const satisfies readonly {
  slug: CitySlug;
  name: string;
  landmark: string;
  landmarkPosition: string;
  aliases: readonly string[];
}[];

export function findEventCity(slug: string | undefined) {
  return EVENT_CITIES.find((city) => city.slug === slug);
}
