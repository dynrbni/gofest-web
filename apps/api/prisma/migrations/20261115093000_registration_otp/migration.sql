ALTER TYPE "EmailTemplate" ADD VALUE 'REGISTRATION_OTP';
ALTER TABLE "users" ADD COLUMN "username" TEXT;
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

CREATE TABLE "registration_challenges" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "resendAt" TIMESTAMPTZ(3) NOT NULL,
  "verifiedAt" TIMESTAMPTZ(3),
  "proofHash" TEXT,
  "proofExpiresAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "registration_challenges_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "registration_challenges_attempts_check" CHECK ("attempts" >= 0)
);
CREATE UNIQUE INDEX "registration_challenges_email_key" ON "registration_challenges"("email");
CREATE UNIQUE INDEX "registration_challenges_proofHash_key" ON "registration_challenges"("proofHash");
CREATE INDEX "registration_challenges_expiresAt_idx" ON "registration_challenges"("expiresAt");
