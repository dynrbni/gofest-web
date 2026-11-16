-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EventStatus" ADD VALUE 'NEEDS_REVISION';
ALTER TYPE "EventStatus" ADD VALUE 'APPROVED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'SUPERADMIN';
ALTER TYPE "UserRole" ADD VALUE 'CREATOR';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "feeTypeSnapshot" TEXT,
ADD COLUMN     "feeValueSnapshot" INTEGER;

-- CreateTable
CREATE TABLE "organizer_wallets" (
    "organizerId" TEXT NOT NULL,
    "available" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "pending" INTEGER NOT NULL DEFAULT 0,
    "withdrawn" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "organizer_wallets_pkey" PRIMARY KEY ("organizerId")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountHolder" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_requests" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "bankSnapshot" JSONB NOT NULL,
    "note" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payout_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_transactions" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'INTERNAL',
    "providerReference" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "status" "PayoutStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_ledger" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT,
    "orderId" TEXT,
    "payoutId" TEXT,
    "transactionType" TEXT NOT NULL,
    "debit" TEXT NOT NULL,
    "credit" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "referenceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "ticketAmount" INTEGER NOT NULL,
    "feeAmount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMPTZ(3),
    "note" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'INTERNAL_SIMULATION',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT,
    "readAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_items" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "targetUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "content_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reply" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "permission" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bank_accounts_organizerId_isActive_idx" ON "bank_accounts"("organizerId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_organizerId_bankName_accountNumber_key" ON "bank_accounts"("organizerId", "bankName", "accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payout_requests_idempotencyKey_key" ON "payout_requests"("idempotencyKey");

-- CreateIndex
CREATE INDEX "payout_requests_organizerId_createdAt_idx" ON "payout_requests"("organizerId", "createdAt");

-- CreateIndex
CREATE INDEX "payout_requests_status_createdAt_idx" ON "payout_requests"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payout_transactions_providerReference_key" ON "payout_transactions"("providerReference");

-- CreateIndex
CREATE UNIQUE INDEX "payout_transactions_idempotencyKey_key" ON "payout_transactions"("idempotencyKey");

-- CreateIndex
CREATE INDEX "payout_transactions_payoutId_createdAt_idx" ON "payout_transactions"("payoutId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "financial_ledger_referenceId_key" ON "financial_ledger"("referenceId");

-- CreateIndex
CREATE INDEX "financial_ledger_organizerId_createdAt_idx" ON "financial_ledger"("organizerId", "createdAt");

-- CreateIndex
CREATE INDEX "financial_ledger_orderId_idx" ON "financial_ledger"("orderId");

-- CreateIndex
CREATE INDEX "financial_ledger_payoutId_idx" ON "financial_ledger"("payoutId");

-- CreateIndex
CREATE INDEX "financial_ledger_transactionType_createdAt_idx" ON "financial_ledger"("transactionType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_idempotencyKey_key" ON "refunds"("idempotencyKey");

-- CreateIndex
CREATE INDEX "refunds_orderId_status_idx" ON "refunds"("orderId", "status");

-- CreateIndex
CREATE INDEX "refunds_status_createdAt_idx" ON "refunds"("status", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "content_items_kind_isActive_sortOrder_idx" ON "content_items"("kind", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "support_tickets_userId_createdAt_idx" ON "support_tickets"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "support_tickets_status_createdAt_idx" ON "support_tickets"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_permission_key" ON "role_permissions"("role", "permission");

-- AddForeignKey
ALTER TABLE "organizer_wallets" ADD CONSTRAINT "organizer_wallets_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "organizer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "organizer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "organizer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_transactions" ADD CONSTRAINT "payout_transactions_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "payout_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_ledger" ADD CONSTRAINT "financial_ledger_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "organizer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_ledger" ADD CONSTRAINT "financial_ledger_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_ledger" ADD CONSTRAINT "financial_ledger_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "payout_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "organizer_wallets" ADD CONSTRAINT "wallet_nonnegative"
  CHECK (available >= 0 AND reserved >= 0 AND pending >= 0 AND withdrawn >= 0);
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_positive" CHECK (amount > 0);
ALTER TABLE "financial_ledger" ADD CONSTRAINT "ledger_nonnegative" CHECK (amount >= 0);
ALTER TABLE "refunds" ADD CONSTRAINT "refund_allocation_valid"
  CHECK (amount > 0 AND "ticketAmount" >= 0 AND "feeAmount" >= 0 AND amount = "ticketAmount" + "feeAmount");

-- Preserve legacy fee amounts. Unknown historical rates remain null rather than being guessed.
INSERT INTO financial_ledger (id, "organizerId", "orderId", "transactionType", debit, credit, amount, "referenceId", description, "createdAt")
SELECT 'legacy-sale-' || o.id, e."organizerId", o.id, 'TICKET_SALE', 'PAYMENT_CLEARING', 'ORGANIZER_AVAILABLE',
  o.subtotal - o.discount, 'sale:' || o.id, 'Saldo awal dari order terbayar sebelum migrasi', COALESCE(o."paidAt", o."createdAt")
FROM orders o JOIN events e ON e.id = o."eventId"
WHERE o."paidAt" IS NOT NULL AND o.status::text IN ('PAID', 'REFUND_PENDING', 'PARTIALLY_REFUNDED')
ON CONFLICT ("referenceId") DO NOTHING;

INSERT INTO financial_ledger (id, "organizerId", "orderId", "transactionType", debit, credit, amount, "referenceId", description, "createdAt")
SELECT 'legacy-fee-' || o.id, e."organizerId", o.id, 'SERVICE_FEE', 'PAYMENT_CLEARING', 'PLATFORM_FEE_REVENUE',
  o."platformFee", 'fee:' || o.id, 'Service fee historis sesuai snapshot order', COALESCE(o."paidAt", o."createdAt")
FROM orders o JOIN events e ON e.id = o."eventId"
WHERE o."paidAt" IS NOT NULL AND o.status::text IN ('PAID', 'REFUND_PENDING', 'PARTIALLY_REFUNDED') AND o."platformFee" > 0
ON CONFLICT ("referenceId") DO NOTHING;

INSERT INTO organizer_wallets ("organizerId", available, reserved, pending, withdrawn, "updatedAt")
SELECT p.id, COALESCE(SUM(l.amount), 0)::int, 0, 0, 0, now()
FROM organizer_profiles p LEFT JOIN financial_ledger l ON l."organizerId" = p.id AND l."transactionType" = 'TICKET_SALE'
GROUP BY p.id ON CONFLICT ("organizerId") DO NOTHING;
