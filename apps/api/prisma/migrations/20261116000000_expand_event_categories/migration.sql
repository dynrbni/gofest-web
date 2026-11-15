INSERT INTO "event_categories" ("id", "name", "slug", "description", "updatedAt")
VALUES
  ('category_religi', 'Religi', 'religi', 'Kajian, perayaan, dan pertemuan keagamaan.', CURRENT_TIMESTAMP),
  ('category_olahraga', 'Olahraga', 'olahraga', 'Pertandingan, latihan, dan kegiatan olahraga.', CURRENT_TIMESTAMP),
  ('category_pameran', 'Pameran', 'pameran', 'Pameran seni, produk, dan karya kreatif.', CURRENT_TIMESTAMP),
  ('category_wisata', 'Wisata', 'wisata', 'Tur, perjalanan, dan pengalaman di destinasi wisata.', CURRENT_TIMESTAMP),
  ('category_talkshow', 'Talkshow', 'talkshow', 'Diskusi dan bincang bersama narasumber.', CURRENT_TIMESTAMP),
  ('category_kompetisi', 'Kompetisi', 'kompetisi', 'Lomba dan kompetisi lintas bidang.', CURRENT_TIMESTAMP),
  ('category_kuliner', 'Kuliner', 'kuliner', 'Festival makanan, bazar, dan pengalaman kuliner.', CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
