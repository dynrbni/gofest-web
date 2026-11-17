CREATE TABLE "cms_cities" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "draft" JSONB NOT NULL,
  "published" JSONB,
  "status" "CmsStatus" NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "publishedByUserId" TEXT,
  "publishedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "cms_cities_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cms_cities_key_key" ON "cms_cities"("key");
CREATE UNIQUE INDEX "cms_cities_slug_key" ON "cms_cities"("slug");
CREATE INDEX "cms_cities_status_updatedAt_idx" ON "cms_cities"("status", "updatedAt");

INSERT INTO "cms_cities" ("id","key","slug","draft","published","status","version","publishedAt","updatedAt")
SELECT 'cms-city-' || entry.slug, entry.slug, entry.slug, entry.document, entry.document, 'PUBLISHED'::"CmsStatus", 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('jakarta', '{"name":"Jakarta","slug":"jakarta","imageKey":"","accent":"coral","builtInIllustration":"jakarta","visible":true,"sortOrder":0}'::jsonb),
  ('bandung', '{"name":"Bandung","slug":"bandung","imageKey":"","accent":"blue","builtInIllustration":"bandung","visible":true,"sortOrder":1}'::jsonb),
  ('yogyakarta', '{"name":"Yogyakarta","slug":"yogyakarta","imageKey":"","accent":"gold","builtInIllustration":"yogyakarta","visible":true,"sortOrder":2}'::jsonb),
  ('surabaya', '{"name":"Surabaya","slug":"surabaya","imageKey":"","accent":"green","builtInIllustration":"surabaya","visible":true,"sortOrder":3}'::jsonb),
  ('denpasar', '{"name":"Denpasar","slug":"denpasar","imageKey":"","accent":"cyan","builtInIllustration":"denpasar","visible":true,"sortOrder":4}'::jsonb)
) AS entry(slug, document)
ON CONFLICT DO NOTHING;
