-- Add the business calendar date independently from the audit timestamp.
ALTER TABLE "Quote" ADD COLUMN "operationalDate" DATE;

-- Preserve historical records using their existing creation calendar date.
UPDATE "Quote"
SET "operationalDate" = "createdAt"::date
WHERE "operationalDate" IS NULL;

ALTER TABLE "Quote" ALTER COLUMN "operationalDate" SET NOT NULL;

CREATE INDEX "Quote_operationalDate_idx" ON "Quote"("operationalDate");
