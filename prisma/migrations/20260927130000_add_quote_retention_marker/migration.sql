ALTER TABLE "Quote" ADD COLUMN "retentionStartedAt" TIMESTAMP(3);

-- Preserve previously auto-archived eligible quotes; manual archive actions write a lifecycle event.
UPDATE "Quote" AS quote
SET "retentionStartedAt" = quote."validUntil"
WHERE quote."status" = 'ARCHIVED'
  AND quote."validUntil" <= CURRENT_TIMESTAMP
  AND NOT EXISTS (SELECT 1 FROM "WorkOrder" AS work_order WHERE work_order."quoteId" = quote."id")
  AND NOT EXISTS (SELECT 1 FROM "PayableNote" AS note WHERE note."quoteId" = quote."id")
  AND NOT EXISTS (
    SELECT 1 FROM "QuoteLifecycleEvent" AS event
    WHERE event."quoteId" = quote."id" AND event."nextState" = 'ARCHIVED'
  );

CREATE INDEX "Quote_status_deletedAt_retentionStartedAt_idx"
ON "Quote"("status", "deletedAt", "retentionStartedAt");
