-- AlterTable
ALTER TABLE "refresh_sessions" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT md5(random()::text || clock_timestamp()::text),
ADD COLUMN "rotatedToId" TEXT,
ADD COLUMN "revocationReason" TEXT,
ADD COLUMN "lastReauthAt" TIMESTAMPTZ(3),
ADD COLUMN "deviceInfo" TEXT;

-- CreateIndex
CREATE INDEX "refresh_sessions_familyId_idx" ON "refresh_sessions"("familyId");
