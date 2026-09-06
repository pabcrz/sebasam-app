-- Corrective migration: match_historical_work_items declared similarity as
-- REAL but computed `1 - (embedding <=> query_embedding)` which is double
-- precision. Cast the computed value to REAL so the function body matches its
-- declared result type (issue #473).

CREATE OR REPLACE FUNCTION public.match_historical_work_items(
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
    (1 - (i.embedding <=> query_embedding))::REAL AS similarity
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

REVOKE ALL ON FUNCTION public.match_historical_work_items(vector(1536), real, int, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_historical_work_items(vector(1536), real, int, text, text, text) TO authenticated, service_role;