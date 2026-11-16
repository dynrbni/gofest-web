-- CreateEnum
CREATE TYPE "CmsStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED');

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'GENERAL';

-- AlterTable
ALTER TABLE "organizer_profiles" ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "instagramUrl" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "tiktokUrl" TEXT,
ADD COLUMN     "websiteUrl" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarKey" TEXT;

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
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

    CONSTRAINT "website_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_sections" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
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

    CONSTRAINT "cms_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_banners" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
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

    CONSTRAINT "cms_banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_pages" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
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

    CONSTRAINT "cms_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_navigation_items" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
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

    CONSTRAINT "cms_navigation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_revisions" (
    "id" TEXT NOT NULL,
    "collection" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "document" JSONB NOT NULL,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cms_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "featured_events" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "stage" "CmsStatus" NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "featured_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_key_key" ON "media_assets"("key");

-- CreateIndex
CREATE INDEX "media_assets_ownerId_folder_idx" ON "media_assets"("ownerId", "folder");

-- CreateIndex
CREATE UNIQUE INDEX "website_settings_key_key" ON "website_settings"("key");

-- CreateIndex
CREATE INDEX "website_settings_status_updatedAt_idx" ON "website_settings"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "cms_sections_key_key" ON "cms_sections"("key");

-- CreateIndex
CREATE INDEX "cms_sections_status_updatedAt_idx" ON "cms_sections"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "cms_banners_key_key" ON "cms_banners"("key");

-- CreateIndex
CREATE INDEX "cms_banners_status_updatedAt_idx" ON "cms_banners"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "cms_pages_key_key" ON "cms_pages"("key");

-- CreateIndex
CREATE INDEX "cms_pages_status_updatedAt_idx" ON "cms_pages"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "cms_navigation_items_key_key" ON "cms_navigation_items"("key");

-- CreateIndex
CREATE INDEX "cms_navigation_items_status_updatedAt_idx" ON "cms_navigation_items"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "cms_revisions_createdAt_idx" ON "cms_revisions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "cms_revisions_collection_entityId_version_key" ON "cms_revisions"("collection", "entityId", "version");

-- CreateIndex
CREATE INDEX "featured_events_eventId_idx" ON "featured_events"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "featured_events_sectionId_eventId_stage_key" ON "featured_events"("sectionId", "eventId", "stage");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_category_idx" ON "notifications"("userId", "readAt", "category");

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "featured_events" ADD CONSTRAINT "featured_events_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "cms_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "featured_events" ADD CONSTRAINT "featured_events_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "cms_sections" ("id","key","draft","published","status","version","publishedAt","updatedAt") VALUES ('cms-hero','hero','{"kind": "hero", "title": "Temukan pengalaman berikutnya", "visible": true, "sortOrder": 0, "source": "upcoming", "limit": 12, "eventIds": [], "layout": "grid"}'::jsonb,'{"kind": "hero", "title": "Temukan pengalaman berikutnya", "visible": true, "sortOrder": 0, "source": "upcoming", "limit": 12, "eventIds": [], "layout": "grid"}'::jsonb,'PUBLISHED',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT INTO "cms_sections" ("id","key","draft","published","status","version","publishedAt","updatedAt") VALUES ('cms-promotions','promotions','{"kind": "promotion", "title": "Informasi dan promosi GOFEST", "visible": true, "sortOrder": 1, "source": "upcoming", "limit": 12, "eventIds": [], "layout": "grid"}'::jsonb,'{"kind": "promotion", "title": "Informasi dan promosi GOFEST", "visible": true, "sortOrder": 1, "source": "upcoming", "limit": 12, "eventIds": [], "layout": "grid"}'::jsonb,'PUBLISHED',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT INTO "cms_sections" ("id","key","draft","published","status","version","publishedAt","updatedAt") VALUES ('cms-events-for-you','events-for-you','{"kind": "events", "title": "Event Seru Untukmu", "visible": true, "sortOrder": 2, "source": "upcoming", "limit": 12, "eventIds": [], "layout": "grid"}'::jsonb,'{"kind": "events", "title": "Event Seru Untukmu", "visible": true, "sortOrder": 2, "source": "upcoming", "limit": 12, "eventIds": [], "layout": "grid"}'::jsonb,'PUBLISHED',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT INTO "cms_sections" ("id","key","draft","published","status","version","publishedAt","updatedAt") VALUES ('cms-categories','categories','{"kind": "categories", "title": "Kategori Event", "visible": true, "sortOrder": 3, "source": "upcoming", "limit": 12, "eventIds": [], "layout": "grid"}'::jsonb,'{"kind": "categories", "title": "Kategori Event", "visible": true, "sortOrder": 3, "source": "upcoming", "limit": 12, "eventIds": [], "layout": "grid"}'::jsonb,'PUBLISHED',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT INTO "cms_sections" ("id","key","draft","published","status","version","publishedAt","updatedAt") VALUES ('cms-cities','cities','{"kind": "cities", "title": "Jelajahi Event di Kotamu", "visible": true, "sortOrder": 4, "source": "upcoming", "limit": 12, "eventIds": [], "layout": "grid"}'::jsonb,'{"kind": "cities", "title": "Jelajahi Event di Kotamu", "visible": true, "sortOrder": 4, "source": "upcoming", "limit": 12, "eventIds": [], "layout": "grid"}'::jsonb,'PUBLISHED',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT INTO "website_settings" ("id","key","draft","published","status","version","publishedAt","updatedAt") VALUES ('cms-general','general','{"websiteName": "Gofest", "description": "Temukan konser, festival dan pengalaman seru di Gofest.", "footerDescription": "Tempat menemukan acara, bertemu orang baru, dan membawa pulang cerita. Pilih pengalamanmu berikutnya di Gofest.", "copyright": "Gofest Indonesia."}'::jsonb,'{"websiteName": "Gofest", "description": "Temukan konser, festival dan pengalaman seru di Gofest.", "footerDescription": "Tempat menemukan acara, bertemu orang baru, dan membawa pulang cerita. Pilih pengalamanmu berikutnya di Gofest.", "copyright": "Gofest Indonesia."}'::jsonb,'PUBLISHED',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

UPDATE "notifications" SET "category" = CASE
 WHEN "href" LIKE '%events?status=PENDING_REVIEW%' THEN 'EVENT_REVIEW'
 WHEN "href" LIKE '%/events%' THEN 'EVENT'
 WHEN "href" LIKE '%/orders%' THEN 'ORDER'
 WHEN "href" LIKE '%/refunds%' THEN 'REFUND'
 WHEN "href" LIKE '%/support%' THEN 'SUPPORT'
 WHEN "href" LIKE '%/payouts%' THEN 'PAYOUT'
 WHEN "href" LIKE '%/organizers%' THEN 'ORGANIZER'
 WHEN "href" LIKE '%/check-in%' THEN 'CHECK_IN'
 ELSE 'GENERAL' END;
