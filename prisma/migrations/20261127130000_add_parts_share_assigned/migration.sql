-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "partsShareAssigned" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: an existing expense whose split differs from its category's original proposal was set by the owner.
UPDATE "Expense" SET "partsShareAssigned" = true
WHERE "partsSharePercent" <> CASE "category"
  WHEN 'PARTS_PURCHASE' THEN 100
  WHEN 'MATERIALS_PURCHASE' THEN 100
  WHEN 'FUEL_TRANSPORT' THEN 50
  ELSE 0
END;
