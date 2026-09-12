-- Add canonical link support and auditable revocation to SharedQuote
--
-- isCanonical = true marks a durable link for a completed Note (Nota).
--   These links do not expire automatically and are only invalidated
--   by explicit admin revocation.
--
-- revokedByUserId + revocationReason provide the audit trail for
--   administrative revocation (actor, date, reason).
--
-- Migration policy for existing eligible links:
-- For every completed Note that has one or more active, unexpired legacy links, promote
-- the oldest link to its canonical link and preserve its token. This maintains
-- existing public URLs (including legacy hex tokens) while making the selected
-- document link durable. Other legacy links remain non-canonical and retain
-- their current expiry/revocation behavior.

ALTER TABLE "SharedQuote"
  ADD COLUMN "isCanonical"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "revokedByUserId"  UUID,
  ADD COLUMN "revocationReason" TEXT;

WITH ranked_eligible_links AS (
  SELECT
    sq.id,
    row_number() OVER (
      PARTITION BY sq."quoteId"
      ORDER BY sq."createdAt" ASC, sq.id ASC
    ) AS rank
  FROM "SharedQuote" sq
  JOIN "WorkOrder" wo ON wo."quoteId" = sq."quoteId"
  WHERE wo.status = 'COMPLETED'
    AND sq."revokedAt" IS NULL
    AND sq."expiresAt" >= CURRENT_TIMESTAMP
)
UPDATE "SharedQuote" sq
SET
  "isCanonical" = true,
  "expiresAt" = TIMESTAMPTZ '2099-12-31 23:59:59+00'
FROM ranked_eligible_links ranked
WHERE sq.id = ranked.id
  AND ranked.rank = 1;

-- Composite index for efficient canonical link lookup per quote
CREATE INDEX "SharedQuote_quoteId_isCanonical_idx"
  ON "SharedQuote"("quoteId", "isCanonical");

-- Exactly one active canonical link may exist per Note. A revoked row is kept
-- as audit history and does not block a deliberate replacement link.
CREATE UNIQUE INDEX "SharedQuote_one_active_canonical_per_quote_unique"
  ON "SharedQuote"("quoteId")
  WHERE "isCanonical" = true AND "revokedAt" IS NULL;

-- Index for revocation actor lookups
CREATE INDEX "SharedQuote_revokedByUserId_idx"
  ON "SharedQuote"("revokedByUserId");

-- Foreign key constraint for revocation actor
ALTER TABLE "SharedQuote"
  ADD CONSTRAINT "SharedQuote_revokedByUserId_fkey"
  FOREIGN KEY ("revokedByUserId")
  REFERENCES "UserProfile"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
