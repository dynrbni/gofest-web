import { EVENT_CITIES } from '@gofest/shared';
import type { CityDocument } from '@/pages/cms/cms-models';

export const CITY_ACCENTS: { value: CityDocument['accent']; label: string; color: string }[] = [
  { value: 'coral', label: 'Koral', color: '#ffab98' },
  { value: 'blue', label: 'Biru', color: '#a9c1ff' },
  { value: 'gold', label: 'Emas', color: '#f4d08a' },
  { value: 'green', label: 'Hijau', color: '#a2cbb6' },
  { value: 'cyan', label: 'Toska', color: '#bce8eb' },
];
export const FALLBACK_CITIES: CityDocument[] = EVENT_CITIES.map((city, index) => ({
  name: city.name,
  slug: city.slug,
  imageKey: '',
  accent: CITY_ACCENTS[index]!.value,
  builtInIllustration: city.slug,
  sortOrder: index,
  visible: true,
}));
