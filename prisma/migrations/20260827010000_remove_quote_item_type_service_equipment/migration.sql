-- Remove any historical SERVICE concept if one remains (explicit user decision on #364).
-- The only record was already deleted; this keeps the migration self-contained.
DELETE FROM "QuoteItem" WHERE "type" = 'SERVICE';

-- Recreate the enum without SERVICE and EQUIPMENT, preserving REFACCIONES.
CREATE TYPE "QuoteItemType_new" AS ENUM ('LABOR', 'MATERIAL', 'REFACCIONES', 'OTHER');
ALTER TABLE "QuoteItem" ALTER COLUMN "type" TYPE "QuoteItemType_new" USING ("type"::text::"QuoteItemType_new");
DROP TYPE "QuoteItemType";
ALTER TYPE "QuoteItemType_new" RENAME TO "QuoteItemType";
