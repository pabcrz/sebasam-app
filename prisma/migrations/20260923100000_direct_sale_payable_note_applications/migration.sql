-- #666 enables standalone sale allocations after the application code
-- supports payable notes that are not backed by a work order.
UPDATE "PaymentApplication"
SET "payableNoteId" = "workOrderId"
WHERE "payableNoteId" IS NULL
  AND "workOrderId" IS NOT NULL;

UPDATE "PaymentCorrectionApplication"
SET "payableNoteId" = "workOrderId"
WHERE "payableNoteId" IS NULL
  AND "workOrderId" IS NOT NULL;

ALTER TABLE "PaymentApplication"
  ALTER COLUMN "payableNoteId" SET NOT NULL,
  ALTER COLUMN "workOrderId" DROP NOT NULL;

ALTER TABLE "PaymentCorrectionApplication"
  ALTER COLUMN "payableNoteId" SET NOT NULL,
  ALTER COLUMN "workOrderId" DROP NOT NULL;
