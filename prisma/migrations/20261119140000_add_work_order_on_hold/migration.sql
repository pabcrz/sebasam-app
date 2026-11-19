-- Additive and reversible: nullable marker, no backfill, existing rows stay NULL (not on hold).
-- Rollback: ALTER TABLE "WorkOrder" DROP COLUMN "onHoldAt", DROP COLUMN "onHoldReason";
ALTER TABLE "WorkOrder" ADD COLUMN "onHoldAt" TIMESTAMP(3),
ADD COLUMN "onHoldReason" TEXT;
