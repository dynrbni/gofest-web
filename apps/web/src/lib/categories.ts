const defaultNames: Record<string, { id: string; en: string }> = {
  musik: { id: 'Musik', en: 'Music' },
  film: { id: 'Film', en: 'Film' },
  komunitas: { id: 'Komunitas', en: 'Community' },
  workshop: { id: 'Workshop', en: 'Workshops' },
  'seni-pertunjukan': { id: 'Seni Pertunjukan', en: 'Performing arts' },
  religi: { id: 'Religi', en: 'Religion' },
  olahraga: { id: 'Olahraga', en: 'Sports' },
  pameran: { id: 'Pameran', en: 'Exhibitions' },
  wisata: { id: 'Wisata', en: 'Travel' },
  talkshow: { id: 'Talkshow', en: 'Talk shows' },
  kompetisi: { id: 'Kompetisi', en: 'Competitions' },
  kuliner: { id: 'Kuliner', en: 'Food & drink' },
};

export function categoryName(category: { slug: string; name: string }, language: string) {
  const name = defaultNames[category.slug];
  return language === 'en' && name?.id === category.name ? name.en : category.name;
}
