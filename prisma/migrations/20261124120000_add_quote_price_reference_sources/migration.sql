-- Semantic projection of quote concepts, used only as price references (issue #489).
-- Stores source identity and retrieval material only; prices, totals and
-- eligibility are read from the live quote at query time.

CREATE TABLE "quote_price_reference_sources" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "quoteItemId" TEXT NOT NULL,
    "contextText" TEXT NOT NULL,
    "contextHash" TEXT NOT NULL,
    "embedding" vector(1536),
    "indexState" "KnowledgeIndexState" NOT NULL DEFAULT 'PENDING',
    "indexingAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastIndexError" TEXT,
    "lastAttemptedAt" TIMESTAMP(3),
    "indexedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_price_reference_sources_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "quote_price_reference_sources_quoteItemId_key"
  ON "quote_price_reference_sources"("quoteItemId");
CREATE INDEX "quote_price_reference_sources_quoteId_indexState_idx"
  ON "quote_price_reference_sources"("quoteId", "indexState");

ALTER TABLE "quote_price_reference_sources"
  ADD CONSTRAINT "quote_price_reference_sources_quoteId_fkey"
  FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quote_price_reference_sources"
  ADD CONSTRAINT "quote_price_reference_sources_quoteItemId_fkey"
  FOREIGN KEY ("quoteItemId") REFERENCES "QuoteItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Prisma is the only data path; RLS keeps Supabase client roles out.
ALTER TABLE "quote_price_reference_sources" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "quote_price_reference_sources" FROM anon, authenticated;
