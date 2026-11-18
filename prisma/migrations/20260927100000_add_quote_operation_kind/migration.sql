-- Existing quotations are workshop-intent drafts unless explicitly changed.
CREATE TYPE "QuoteOperationKind" AS ENUM ('WORK', 'SALE');

ALTER TABLE "Quote"
ADD COLUMN "operation" "QuoteOperationKind" NOT NULL DEFAULT 'WORK';

-- Keep the backfill explicit for databases where the column default was applied
-- during a rolling deployment before the application began writing the field.
UPDATE "Quote"
SET "operation" = 'WORK'
WHERE "operation" IS NULL;
