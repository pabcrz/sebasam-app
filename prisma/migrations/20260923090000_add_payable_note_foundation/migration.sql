-- A payable note is the commercial target for captures, applications, and
-- ledger movements. Work-order notes retain their original ids so existing
-- routes and references remain valid while standalone notes use their own id.
CREATE TYPE "PayableNoteStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED');

CREATE TABLE "PayableNote" (
  "id" TEXT NOT NULL,
  "customerId" TEXT,
  "quoteId" TEXT,
  "workOrderId" TEXT,
  "referenceNumber" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtotalCents" INTEGER NOT NULL,
  "taxCents" INTEGER NOT NULL,
  "totalCents" INTEGER NOT NULL,
  "status" "PayableNoteStatus" NOT NULL DEFAULT 'DRAFT',
  "issuedAt" TIMESTAMP(3),
  "paymentDueDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayableNote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PayableNote_quoteId_key" ON "PayableNote"("quoteId");
CREATE UNIQUE INDEX "PayableNote_workOrderId_key" ON "PayableNote"("workOrderId");
CREATE UNIQUE INDEX "PayableNote_referenceNumber_key" ON "PayableNote"("referenceNumber");
CREATE INDEX "PayableNote_customerId_status_issuedAt_idx" ON "PayableNote"("customerId", "status", "issuedAt");
CREATE INDEX "PayableNote_workOrderId_idx" ON "PayableNote"("workOrderId");

-- Every existing work-order note gets a payable reference. Reusing the work
-- order id is deliberate compatibility, not a synthetic work order.
INSERT INTO "PayableNote" (
  "id", "customerId", "quoteId", "workOrderId", "referenceNumber", "title",
  "subtotalCents", "taxCents", "totalCents", "status", "issuedAt", "paymentDueDate", "createdAt", "updatedAt"
)
SELECT
  wo."id", q."customerId", q."id", wo."id", wo."number", q."title",
  COALESCE(q."subtotalCents", 0), COALESCE(q."taxCents", 0), COALESCE(q."totalCents", 0),
  CASE WHEN wo."status" = 'COMPLETED' THEN 'ISSUED'::"PayableNoteStatus" ELSE 'DRAFT'::"PayableNoteStatus" END,
  CASE WHEN wo."status" = 'COMPLETED' THEN COALESCE(wo."completedAt", wo."createdAt") ELSE NULL END,
  wo."paymentDueDate", wo."createdAt", wo."updatedAt"
FROM "WorkOrder" wo
JOIN "Quote" q ON q."id" = wo."quoteId";

ALTER TABLE "PaymentRequest" ADD COLUMN "payableNoteId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "payableNoteId" TEXT;
ALTER TABLE "PaymentApplication" ADD COLUMN "payableNoteId" TEXT;
ALTER TABLE "LedgerEntry" ADD COLUMN "payableNoteId" TEXT;
ALTER TABLE "PaymentCorrectionApplication" ADD COLUMN "payableNoteId" TEXT;
ALTER TABLE "QuoteCommercialCorrectionApplication" ADD COLUMN "payableNoteId" TEXT;

UPDATE "PaymentRequest" SET "payableNoteId" = "workOrderId" WHERE "workOrderId" IS NOT NULL;
UPDATE "PaymentApplication" SET "payableNoteId" = "workOrderId" WHERE "workOrderId" IS NOT NULL;
UPDATE "LedgerEntry" SET "payableNoteId" = "workOrderId" WHERE "workOrderId" IS NOT NULL;
UPDATE "PaymentCorrectionApplication" SET "payableNoteId" = "workOrderId" WHERE "workOrderId" IS NOT NULL;
UPDATE "QuoteCommercialCorrectionApplication" SET "payableNoteId" = "workOrderId" WHERE "workOrderId" IS NOT NULL;
-- A historical payment can have applications for several work orders. Only
-- backfill the direct reference when it has one distinct payable target;
-- otherwise applications remain the authoritative allocation ledger.
UPDATE "Payment" payment
SET "payableNoteId" = (
  SELECT MIN(application."payableNoteId")
  FROM "PaymentApplication" application
  WHERE application."paymentId" = payment."id"
)
WHERE (
  SELECT COUNT(DISTINCT application."payableNoteId")
  FROM "PaymentApplication" application
  WHERE application."paymentId" = payment."id"
) = 1;

CREATE INDEX "PaymentRequest_payableNoteId_idx" ON "PaymentRequest"("payableNoteId");
CREATE INDEX "Payment_payableNoteId_idx" ON "Payment"("payableNoteId");
CREATE INDEX "PaymentApplication_payableNoteId_idx" ON "PaymentApplication"("payableNoteId");
CREATE INDEX "LedgerEntry_payableNoteId_idx" ON "LedgerEntry"("payableNoteId");
CREATE INDEX "PaymentCorrectionApplication_payableNoteId_idx" ON "PaymentCorrectionApplication"("payableNoteId");

ALTER TABLE "PayableNote" ADD CONSTRAINT "PayableNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayableNote" ADD CONSTRAINT "PayableNote_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayableNote" ADD CONSTRAINT "PayableNote_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_payableNoteId_fkey" FOREIGN KEY ("payableNoteId") REFERENCES "PayableNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_payableNoteId_fkey" FOREIGN KEY ("payableNoteId") REFERENCES "PayableNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentApplication" ADD CONSTRAINT "PaymentApplication_payableNoteId_fkey" FOREIGN KEY ("payableNoteId") REFERENCES "PayableNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_payableNoteId_fkey" FOREIGN KEY ("payableNoteId") REFERENCES "PayableNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentCorrectionApplication" ADD CONSTRAINT "PaymentCorrectionApplication_payableNoteId_fkey" FOREIGN KEY ("payableNoteId") REFERENCES "PayableNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuoteCommercialCorrectionApplication" ADD CONSTRAINT "QuoteCommercialCorrectionApplication_payableNoteId_fkey" FOREIGN KEY ("payableNoteId") REFERENCES "PayableNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
