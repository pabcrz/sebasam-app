-- CreateEnum
CREATE TYPE "LedgerMovementType" AS ENUM ('NOTE_CHARGE', 'PAYMENT_CAPTURE', 'PAYMENT_APPLICATION', 'PAYMENT_REVERSAL', 'APPLICATION_REVERSAL');

-- AlterTable Payment: add customerId and reversal tracking
ALTER TABLE "Payment" ADD COLUMN "customerId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "reversedAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "reversalReason" TEXT;
ALTER TABLE "Payment" ADD COLUMN "reversedById" UUID;

-- Backfill customerId from Quote
UPDATE "Payment" p
SET "customerId" = q."customerId"
FROM "Quote" q
WHERE p."quoteId" = q."id" AND p."customerId" IS NULL AND q."customerId" IS NOT NULL;

-- Make customerId NOT NULL
ALTER TABLE "Payment" ALTER COLUMN "customerId" SET NOT NULL;

-- Drop old foreign key on Payment and add restrictive foreign keys
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_quoteId_fkey";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create Indexes on Payment
CREATE INDEX "Payment_customerId_idx" ON "Payment"("customerId");
CREATE INDEX "Payment_reversedAt_idx" ON "Payment"("reversedAt");

-- CreateTable PaymentApplication
CREATE TABLE "PaymentApplication" (
    "id" TEXT NOT NULL,
    "operationKey" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "actorId" UUID,
    "reversedAt" TIMESTAMP(3),
    "reversalReason" TEXT,
    "reversedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentApplication_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PaymentApplication_amountCents_positive_check" CHECK ("amountCents" > 0)
);

-- CreateIndex for PaymentApplication
CREATE UNIQUE INDEX "PaymentApplication_operationKey_key" ON "PaymentApplication"("operationKey");
CREATE INDEX "PaymentApplication_paymentId_idx" ON "PaymentApplication"("paymentId");
CREATE INDEX "PaymentApplication_workOrderId_idx" ON "PaymentApplication"("workOrderId");
CREATE INDEX "PaymentApplication_reversedAt_idx" ON "PaymentApplication"("reversedAt");

-- AddForeignKey for PaymentApplication
ALTER TABLE "PaymentApplication" ADD CONSTRAINT "PaymentApplication_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentApplication" ADD CONSTRAINT "PaymentApplication_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentApplication" ADD CONSTRAINT "PaymentApplication_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentApplication" ADD CONSTRAINT "PaymentApplication_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable LedgerEntry
ALTER TABLE "LedgerEntry" DROP CONSTRAINT IF EXISTS "LedgerEntry_customerId_fkey";
ALTER TABLE "LedgerEntry" DROP CONSTRAINT IF EXISTS "LedgerEntry_paymentId_fkey";
DROP INDEX IF EXISTS "LedgerEntry_paymentId_key";

ALTER TABLE "LedgerEntry" ALTER COLUMN "paymentId" DROP NOT NULL;
ALTER TABLE "LedgerEntry" ALTER COLUMN "resultingBalanceCents" DROP NOT NULL;

ALTER TABLE "LedgerEntry" ADD COLUMN "movementType" "LedgerMovementType" NOT NULL DEFAULT 'PAYMENT_CAPTURE';
ALTER TABLE "LedgerEntry" ADD COLUMN "actorId" UUID;
ALTER TABLE "LedgerEntry" ADD COLUMN "reason" TEXT;
ALTER TABLE "LedgerEntry" ADD COLUMN "paymentApplicationId" TEXT;
ALTER TABLE "LedgerEntry" ADD COLUMN "workOrderId" TEXT;
ALTER TABLE "LedgerEntry" ADD COLUMN "reversedMovementId" TEXT;

ALTER TABLE "LedgerEntry" ALTER COLUMN "movementType" DROP DEFAULT;

-- CreateIndex on LedgerEntry
CREATE INDEX "LedgerEntry_paymentId_idx" ON "LedgerEntry"("paymentId");
CREATE INDEX "LedgerEntry_paymentApplicationId_idx" ON "LedgerEntry"("paymentApplicationId");
CREATE INDEX "LedgerEntry_workOrderId_idx" ON "LedgerEntry"("workOrderId");
CREATE UNIQUE INDEX "LedgerEntry_reversedMovementId_key" ON "LedgerEntry"("reversedMovementId");

-- AddForeignKey on LedgerEntry
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_paymentApplicationId_fkey" FOREIGN KEY ("paymentApplicationId") REFERENCES "PaymentApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_reversedMovementId_fkey" FOREIGN KEY ("reversedMovementId") REFERENCES "LedgerEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: For existing LedgerEntry, set movementType
UPDATE "LedgerEntry" SET "movementType" = 'PAYMENT_CAPTURE'::"LedgerMovementType" WHERE "movementType" IS NULL;

-- Backfill: Note charges for completed WorkOrders
INSERT INTO "LedgerEntry" ("id", "customerId", "workOrderId", "type", "movementType", "amountCents", "createdAt")
SELECT
    md5('ledger:note_charge:' || wo."id"),
    q."customerId",
    wo."id",
    'DEBIT'::"LedgerEntryType",
    'NOTE_CHARGE'::"LedgerMovementType",
    q."totalCents",
    COALESCE(wo."completedAt", wo."createdAt")
FROM "WorkOrder" wo
JOIN "Quote" q ON q."id" = wo."quoteId"
WHERE wo."status" = 'COMPLETED'::"WorkOrderStatus"
  AND q."customerId" IS NOT NULL
  AND q."totalCents" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

-- Backfill: PaymentApplication for existing payments linked to completed WorkOrders
INSERT INTO "PaymentApplication" ("id", "operationKey", "paymentId", "workOrderId", "amountCents", "createdAt")
SELECT
    md5('app:' || p."id" || ':' || wo."id"),
    'legacy-app:' || p."id",
    p."id",
    wo."id",
    p."amountCents",
    p."createdAt"
FROM "Payment" p
JOIN "WorkOrder" wo ON wo."quoteId" = p."quoteId" AND wo."status" = 'COMPLETED'::"WorkOrderStatus"
WHERE p."status" = 'PAID'::"PaymentStatus"
ON CONFLICT ("operationKey") DO NOTHING;

-- Backfill: PAYMENT_APPLICATION LedgerEntry
INSERT INTO "LedgerEntry" ("id", "customerId", "paymentId", "paymentApplicationId", "workOrderId", "type", "movementType", "amountCents", "createdAt")
SELECT
    md5('ledger:app:' || pa."id"),
    p."customerId",
    pa."paymentId",
    pa."id",
    pa."workOrderId",
    'CREDIT'::"LedgerEntryType",
    'PAYMENT_APPLICATION'::"LedgerMovementType",
    pa."amountCents",
    pa."createdAt"
FROM "PaymentApplication" pa
JOIN "Payment" p ON p."id" = pa."paymentId"
ON CONFLICT ("id") DO NOTHING;
