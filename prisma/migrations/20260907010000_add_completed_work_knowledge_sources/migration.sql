-- Durable semantic projection for completed operational work (issue #490).
-- This table intentionally stores source identity and retrieval material only;
-- financial and payroll values remain in their operational source tables.

CREATE TYPE "KnowledgeIndexState" AS ENUM ('PENDING', 'INDEXING', 'INDEXED', 'FAILED', 'INELIGIBLE');

CREATE TABLE "completed_work_knowledge_sources" (
    "id" TEXT NOT NULL,
    "originKey" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
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

    CONSTRAINT "completed_work_knowledge_sources_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "completed_work_knowledge_sources_originKey_key"
  ON "completed_work_knowledge_sources"("originKey");
CREATE UNIQUE INDEX "completed_work_knowledge_sources_workOrderId_quoteItemId_key"
  ON "completed_work_knowledge_sources"("workOrderId", "quoteItemId");
CREATE INDEX "completed_work_knowledge_sources_workOrderId_indexState_idx"
  ON "completed_work_knowledge_sources"("workOrderId", "indexState");

ALTER TABLE "completed_work_knowledge_sources"
  ADD CONSTRAINT "completed_work_knowledge_sources_workOrderId_fkey"
  FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "completed_work_knowledge_sources"
  ADD CONSTRAINT "completed_work_knowledge_sources_quoteItemId_fkey"
  FOREIGN KEY ("quoteItemId") REFERENCES "QuoteItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Prisma is the only operational data path. RLS prevents Supabase client roles
-- from reading or modifying projection rows directly.
ALTER TABLE "completed_work_knowledge_sources" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "completed_work_knowledge_sources" FROM anon, authenticated;
