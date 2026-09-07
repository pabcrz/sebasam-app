-- Historical work capture (issue #473).
-- Business tables live next to the Prisma-managed operational tables. RLS is
-- enabled so Supabase-role clients cannot bypass the app's authorization;
-- Prisma connects as the table owner, which bypasses RLS by default.

-- Enable pgvector for item-level semantic embeddings (1536 dims).
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "historical_works" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "workRef" TEXT NOT NULL,
    "workDate" DATE NOT NULL,
    "customerName" TEXT,
    "plate" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "masterName" TEXT,
    "masterId" UUID,
    "source" TEXT NOT NULL DEFAULT 'text',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "historical_works_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historical_work_items" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "type" "QuoteItemType" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2),
    "customerPriceCents" INTEGER,
    "payrollBaseCents" INTEGER,
    "ratePercent" INTEGER,
    "includeInPayroll" BOOLEAN NOT NULL DEFAULT false,
    "isKit" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "embedding" vector(1536) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "historical_work_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "historical_works_batchId_workRef_key" ON "historical_works"("batchId", "workRef");

-- CreateIndex
CREATE INDEX "historical_works_workDate_idx" ON "historical_works"("workDate");

-- CreateIndex
CREATE UNIQUE INDEX "historical_work_items_contentHash_key" ON "historical_work_items"("contentHash");

-- CreateIndex
CREATE INDEX "historical_work_items_workId_idx" ON "historical_work_items"("workId");

-- CreateIndex
CREATE INDEX "historical_work_items_type_description_idx" ON "historical_work_items"("type", "description");

-- AddForeignKey
ALTER TABLE "historical_work_items" ADD CONSTRAINT "historical_work_items_workId_fkey" FOREIGN KEY ("workId") REFERENCES "historical_works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security: authenticated app roles may read/write, service_role has
-- full access. Table-owner connections (Prisma) bypass RLS.
ALTER TABLE "historical_works" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "historical_work_items" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "historical_works_authenticated_select" ON "historical_works" FOR SELECT TO authenticated USING (true);
CREATE POLICY "historical_works_authenticated_insert" ON "historical_works" FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "historical_works_authenticated_update" ON "historical_works" FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "historical_works_service_all" ON "historical_works" FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "historical_work_items_authenticated_select" ON "historical_work_items" FOR SELECT TO authenticated USING (true);
CREATE POLICY "historical_work_items_authenticated_insert" ON "historical_work_items" FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "historical_work_items_authenticated_update" ON "historical_work_items" FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "historical_work_items_service_all" ON "historical_work_items" FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Semantic search over item embeddings. Sequential scan by design: this data
-- set is small and no ivfflat/hnsw index is created (issue #473 scope).
CREATE OR REPLACE FUNCTION match_historical_work_items(
  query_embedding vector(1536),
  match_threshold real DEFAULT 0.5,
  match_count int DEFAULT 5,
  filter_type text DEFAULT NULL,
  filter_brand text DEFAULT NULL,
  filter_model text DEFAULT NULL
)
RETURNS TABLE (
  item_id text,
  work_id text,
  work_ref text,
  work_date date,
  customer_name text,
  plate text,
  brand text,
  model text,
  master_name text,
  item_type text,
  description text,
  quantity numeric,
  customer_price_cents integer,
  payroll_base_cents integer,
  rate_percent integer,
  include_in_payroll boolean,
  is_kit boolean,
  content_hash text,
  metadata jsonb,
  similarity real
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id::text AS item_id,
    w.id::text AS work_id,
    w."workRef" AS work_ref,
    w."workDate" AS work_date,
    w."customerName" AS customer_name,
    w."plate" AS plate,
    w."brand" AS brand,
    w."model" AS model,
    w."masterName" AS master_name,
    i.type::text AS item_type,
    i.description AS description,
    i.quantity AS quantity,
    i."customerPriceCents" AS customer_price_cents,
    i."payrollBaseCents" AS payroll_base_cents,
    i."ratePercent" AS rate_percent,
    i."includeInPayroll" AS include_in_payroll,
    i."isKit" AS is_kit,
    i."contentHash" AS content_hash,
    i.metadata AS metadata,
    1 - (i.embedding <=> query_embedding) AS similarity
  FROM "historical_work_items" i
  JOIN "historical_works" w ON w.id = i."workId"
  WHERE (filter_type IS NULL OR i.type::text = filter_type)
    AND (filter_brand IS NULL OR w."brand" ILIKE '%' || filter_brand || '%')
    AND (filter_model IS NULL OR w."model" ILIKE '%' || filter_model || '%')
    AND (1 - (i.embedding <=> query_embedding)) >= match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Exact aggregation over real columns (sums/averages/counts). Commission is
-- never stored; it is derived as payroll_base_cents * rate_percent / 100.
CREATE OR REPLACE FUNCTION aggregate_historical_items(
  filter_type text DEFAULT NULL,
  filter_brand text DEFAULT NULL,
  filter_model text DEFAULT NULL,
  filter_master text DEFAULT NULL,
  date_from date DEFAULT NULL,
  date_to date DEFAULT NULL,
  group_by text DEFAULT 'all'
)
RETURNS TABLE (
  group_key text,
  item_count bigint,
  work_count bigint,
  total_customer_cents bigint,
  total_payroll_base_cents bigint,
  total_commission_cents bigint,
  avg_customer_cents numeric,
  avg_commission_cents numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE group_by
      WHEN 'type' THEN i.type::text
      WHEN 'brand' THEN COALESCE(w."brand", '(sin marca)')
      WHEN 'model' THEN COALESCE(w."model", '(sin modelo)')
      WHEN 'master' THEN COALESCE(w."masterName", '(sin maestro)')
      WHEN 'month' THEN to_char(w."workDate", 'YYYY-MM')
      ELSE 'all'
    END AS group_key,
    COUNT(*)::bigint AS item_count,
    COUNT(DISTINCT w.id)::bigint AS work_count,
    COALESCE(SUM(i."customerPriceCents"), 0)::bigint AS total_customer_cents,
    COALESCE(SUM(i."payrollBaseCents"), 0)::bigint AS total_payroll_base_cents,
    COALESCE(SUM(ROUND(i."payrollBaseCents"::numeric * i."ratePercent" / 100.0)), 0)::bigint AS total_commission_cents,
    COALESCE(AVG(i."customerPriceCents"), 0)::numeric AS avg_customer_cents,
    COALESCE(AVG(ROUND(i."payrollBaseCents"::numeric * i."ratePercent" / 100.0)), 0)::numeric AS avg_commission_cents
  FROM "historical_work_items" i
  JOIN "historical_works" w ON w.id = i."workId"
  WHERE (filter_type IS NULL OR i.type::text = filter_type)
    AND (filter_brand IS NULL OR w."brand" ILIKE '%' || filter_brand || '%')
    AND (filter_model IS NULL OR w."model" ILIKE '%' || filter_model || '%')
    AND (filter_master IS NULL OR w."masterName" ILIKE '%' || filter_master || '%')
    AND (date_from IS NULL OR w."workDate" >= date_from)
    AND (date_to IS NULL OR w."workDate" <= date_to)
  GROUP BY CASE group_by
    WHEN 'type' THEN i.type::text
    WHEN 'brand' THEN COALESCE(w."brand", '(sin marca)')
    WHEN 'model' THEN COALESCE(w."model", '(sin modelo)')
    WHEN 'master' THEN COALESCE(w."masterName", '(sin maestro)')
    WHEN 'month' THEN to_char(w."workDate", 'YYYY-MM')
    ELSE 'all'
  END
  ORDER BY group_key;
END;
$$;