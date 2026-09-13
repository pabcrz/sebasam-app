-- Quote commercial corrections were introduced before this migration was
-- versioned. A historical database may therefore already contain both tables.
-- Accept that state only when it is structurally identical to this migration;
-- a partial or divergent state must fail instead of being silently repaired.
DO $$
BEGIN
  IF to_regclass('public."QuoteCommercialCorrection"') IS NULL
     AND to_regclass('public."QuoteCommercialCorrectionApplication"') IS NULL THEN
    EXECUTE $sql$
      CREATE TABLE "QuoteCommercialCorrection" (
        "id" TEXT NOT NULL,
        "operationKey" TEXT NOT NULL,
        "quoteId" TEXT NOT NULL,
        "workOrderId" TEXT NOT NULL,
        "previousTotalCents" INTEGER NOT NULL,
        "newTotalCents" INTEGER NOT NULL,
        "previousAppliedCents" INTEGER NOT NULL,
        "newAppliedCents" INTEGER NOT NULL,
        "excessCreditCents" INTEGER NOT NULL DEFAULT 0,
        "reason" TEXT NOT NULL,
        "actorId" UUID NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "QuoteCommercialCorrection_pkey" PRIMARY KEY ("id")
      )
    $sql$;

    EXECUTE $sql$
      CREATE TABLE "QuoteCommercialCorrectionApplication" (
        "id" TEXT NOT NULL,
        "correctionId" TEXT NOT NULL,
        "originalApplicationId" TEXT NOT NULL,
        "reversalLedgerEntryId" TEXT NOT NULL,
        "replacementApplicationId" TEXT,
        "replacementLedgerEntryId" TEXT,
        "workOrderId" TEXT NOT NULL,
        "originalAmountCents" INTEGER NOT NULL,
        "reversalAmountCents" INTEGER NOT NULL,
        "replacementAmountCents" INTEGER NOT NULL DEFAULT 0,
        "releasedCreditCents" INTEGER NOT NULL DEFAULT 0,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "QuoteCommercialCorrectionApplication_pkey" PRIMARY KEY ("id")
      )
    $sql$;

    EXECUTE 'CREATE UNIQUE INDEX "QuoteCommercialCorrection_operationKey_key" ON "QuoteCommercialCorrection"("operationKey")';
    EXECUTE 'CREATE INDEX "QuoteCommercialCorrection_quoteId_createdAt_idx" ON "QuoteCommercialCorrection"("quoteId", "createdAt")';
    EXECUTE 'CREATE INDEX "QuoteCommercialCorrection_workOrderId_createdAt_idx" ON "QuoteCommercialCorrection"("workOrderId", "createdAt")';
    EXECUTE 'CREATE INDEX "QuoteCommercialCorrection_actorId_idx" ON "QuoteCommercialCorrection"("actorId")';
    EXECUTE 'CREATE UNIQUE INDEX "QuoteCommercialCorrectionApplication_correctionId_originalA_key" ON "QuoteCommercialCorrectionApplication"("correctionId", "originalApplicationId")';
    EXECUTE 'CREATE INDEX "QuoteCommercialCorrectionApplication_correctionId_idx" ON "QuoteCommercialCorrectionApplication"("correctionId")';
    EXECUTE 'CREATE INDEX "QuoteCommercialCorrectionApplication_workOrderId_idx" ON "QuoteCommercialCorrectionApplication"("workOrderId")';

    EXECUTE 'ALTER TABLE "QuoteCommercialCorrection" ADD CONSTRAINT "QuoteCommercialCorrection_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE';
    EXECUTE 'ALTER TABLE "QuoteCommercialCorrection" ADD CONSTRAINT "QuoteCommercialCorrection_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE';
    EXECUTE 'ALTER TABLE "QuoteCommercialCorrection" ADD CONSTRAINT "QuoteCommercialCorrection_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE';
    EXECUTE 'ALTER TABLE "QuoteCommercialCorrectionApplication" ADD CONSTRAINT "QuoteCommercialCorrectionApplication_correctionId_fkey" FOREIGN KEY ("correctionId") REFERENCES "QuoteCommercialCorrection"("id") ON DELETE CASCADE ON UPDATE CASCADE';
    EXECUTE 'ALTER TABLE "QuoteCommercialCorrectionApplication" ADD CONSTRAINT "QuoteCommercialCorrectionApplication_originalApplicationId_fkey" FOREIGN KEY ("originalApplicationId") REFERENCES "PaymentApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE';
    EXECUTE 'ALTER TABLE "QuoteCommercialCorrectionApplication" ADD CONSTRAINT "QuoteCommercialCorrectionApplication_reversalLedgerEntryId_fkey" FOREIGN KEY ("reversalLedgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE';
    EXECUTE 'ALTER TABLE "QuoteCommercialCorrectionApplication" ADD CONSTRAINT "QuoteCommercialCorrectionApplication_replacementApplicatio_fkey" FOREIGN KEY ("replacementApplicationId") REFERENCES "PaymentApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE';
    EXECUTE 'ALTER TABLE "QuoteCommercialCorrectionApplication" ADD CONSTRAINT "QuoteCommercialCorrectionApplication_replacementLedgerEntr_fkey" FOREIGN KEY ("replacementLedgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE';
    EXECUTE 'ALTER TABLE "QuoteCommercialCorrectionApplication" ADD CONSTRAINT "QuoteCommercialCorrectionApplication_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE';
  ELSIF to_regclass('public."QuoteCommercialCorrection"') IS NULL
     OR to_regclass('public."QuoteCommercialCorrectionApplication"') IS NULL THEN
    RAISE EXCEPTION 'Quote commercial correction tables are partially present; refusing to conceal schema drift';
  END IF;
END $$;

-- Validate the pre-existing state (or the just-created state) from PostgreSQL's
-- catalogs. This is intentionally stricter than CREATE ... IF NOT EXISTS.
DO $$
DECLARE
  correction_oid oid := 'public."QuoteCommercialCorrection"'::regclass;
  application_oid oid := 'public."QuoteCommercialCorrectionApplication"'::regclass;
BEGIN
  IF (SELECT relkind FROM pg_class WHERE oid = correction_oid) <> 'r'
     OR (SELECT relkind FROM pg_class WHERE oid = application_oid) <> 'r' THEN
    RAISE EXCEPTION 'Quote commercial correction relations must be ordinary tables';
  END IF;

  IF (SELECT count(*) FROM pg_attribute WHERE attrelid = correction_oid AND attnum > 0 AND NOT attisdropped) <> 12
     OR (SELECT count(*) FROM pg_attribute WHERE attrelid = application_oid AND attnum > 0 AND NOT attisdropped) <> 13 THEN
    RAISE EXCEPTION 'Quote commercial correction table columns do not match the Prisma schema';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('id', 'text', true, NULL::text),
      ('operationKey', 'text', true, NULL::text),
      ('quoteId', 'text', true, NULL::text),
      ('workOrderId', 'text', true, NULL::text),
      ('previousTotalCents', 'integer', true, NULL::text),
      ('newTotalCents', 'integer', true, NULL::text),
      ('previousAppliedCents', 'integer', true, NULL::text),
      ('newAppliedCents', 'integer', true, NULL::text),
      ('excessCreditCents', 'integer', true, '0'::text),
      ('reason', 'text', true, NULL::text),
      ('actorId', 'uuid', true, NULL::text),
      ('createdAt', 'timestamp(3) without time zone', true, 'CURRENT_TIMESTAMP'::text)
    ) AS expected(name, data_type, not_null, default_expression)
    LEFT JOIN pg_attribute attribute ON attribute.attrelid = correction_oid AND attribute.attname = expected.name AND attribute.attnum > 0 AND NOT attribute.attisdropped
    LEFT JOIN pg_attrdef default_value ON default_value.adrelid = correction_oid AND default_value.adnum = attribute.attnum
    WHERE attribute.attname IS NULL
       OR attribute.atttypid::regtype::text <> expected.data_type
       OR attribute.attnotnull <> expected.not_null
       OR COALESCE(pg_get_expr(default_value.adbin, default_value.adrelid), '') <> COALESCE(expected.default_expression, '')
  ) THEN
    RAISE EXCEPTION 'QuoteCommercialCorrection columns, types, nullability, or defaults do not match the Prisma schema';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('id', 'text', true, NULL::text),
      ('correctionId', 'text', true, NULL::text),
      ('originalApplicationId', 'text', true, NULL::text),
      ('reversalLedgerEntryId', 'text', true, NULL::text),
      ('replacementApplicationId', 'text', false, NULL::text),
      ('replacementLedgerEntryId', 'text', false, NULL::text),
      ('workOrderId', 'text', true, NULL::text),
      ('originalAmountCents', 'integer', true, NULL::text),
      ('reversalAmountCents', 'integer', true, NULL::text),
      ('replacementAmountCents', 'integer', true, '0'::text),
      ('releasedCreditCents', 'integer', true, '0'::text),
      ('sortOrder', 'integer', true, '0'::text),
      ('createdAt', 'timestamp(3) without time zone', true, 'CURRENT_TIMESTAMP'::text)
    ) AS expected(name, data_type, not_null, default_expression)
    LEFT JOIN pg_attribute attribute ON attribute.attrelid = application_oid AND attribute.attname = expected.name AND attribute.attnum > 0 AND NOT attribute.attisdropped
    LEFT JOIN pg_attrdef default_value ON default_value.adrelid = application_oid AND default_value.adnum = attribute.attnum
    WHERE attribute.attname IS NULL
       OR attribute.atttypid::regtype::text <> expected.data_type
       OR attribute.attnotnull <> expected.not_null
       OR COALESCE(pg_get_expr(default_value.adbin, default_value.adrelid), '') <> COALESCE(expected.default_expression, '')
  ) THEN
    RAISE EXCEPTION 'QuoteCommercialCorrectionApplication columns, types, nullability, or defaults do not match the Prisma schema';
  END IF;

  IF (SELECT array_agg(attribute.attname ORDER BY key.ordinality)
      FROM pg_constraint constraint
      JOIN unnest(constraint.conkey) WITH ORDINALITY AS key(attnum, ordinality) ON true
      JOIN pg_attribute attribute ON attribute.attrelid = constraint.conrelid AND attribute.attnum = key.attnum
      WHERE constraint.conrelid = correction_oid AND constraint.contype = 'p') <> ARRAY['id']
     OR (SELECT array_agg(attribute.attname ORDER BY key.ordinality)
         FROM pg_constraint constraint
         JOIN unnest(constraint.conkey) WITH ORDINALITY AS key(attnum, ordinality) ON true
         JOIN pg_attribute attribute ON attribute.attrelid = constraint.conrelid AND attribute.attnum = key.attnum
         WHERE constraint.conrelid = application_oid AND constraint.contype = 'p') <> ARRAY['id'] THEN
    RAISE EXCEPTION 'Quote commercial correction primary keys do not match the Prisma schema';
  END IF;

  IF (SELECT count(*) FROM pg_constraint WHERE conrelid = correction_oid AND contype NOT IN ('p', 'f')) <> 0
     OR (SELECT count(*) FROM pg_constraint WHERE conrelid = application_oid AND contype NOT IN ('p', 'f')) <> 0 THEN
    RAISE EXCEPTION 'Quote commercial correction tables contain unexpected constraints';
  END IF;

  IF (SELECT count(*) FROM pg_index WHERE indrelid = correction_oid) <> 5
     OR (SELECT count(*) FROM pg_index WHERE indrelid = application_oid) <> 4 THEN
    RAISE EXCEPTION 'Quote commercial correction indexes do not match the Prisma schema';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_index WHERE indrelid = correction_oid AND indisunique AND indpred IS NULL AND indexprs IS NULL AND indnkeyatts = 1 AND (SELECT array_agg(attribute.attname ORDER BY key.ordinality) FROM unnest(indkey::smallint[]) WITH ORDINALITY AS key(attnum, ordinality) JOIN pg_attribute attribute ON attribute.attrelid = correction_oid AND attribute.attnum = key.attnum WHERE key.ordinality <= indnkeyatts) = ARRAY['operationKey'])
     OR NOT EXISTS (SELECT 1 FROM pg_index WHERE indrelid = correction_oid AND NOT indisunique AND indpred IS NULL AND indexprs IS NULL AND indnkeyatts = 2 AND (SELECT array_agg(attribute.attname ORDER BY key.ordinality) FROM unnest(indkey::smallint[]) WITH ORDINALITY AS key(attnum, ordinality) JOIN pg_attribute attribute ON attribute.attrelid = correction_oid AND attribute.attnum = key.attnum WHERE key.ordinality <= indnkeyatts) = ARRAY['quoteId', 'createdAt'])
     OR NOT EXISTS (SELECT 1 FROM pg_index WHERE indrelid = correction_oid AND NOT indisunique AND indpred IS NULL AND indexprs IS NULL AND indnkeyatts = 2 AND (SELECT array_agg(attribute.attname ORDER BY key.ordinality) FROM unnest(indkey::smallint[]) WITH ORDINALITY AS key(attnum, ordinality) JOIN pg_attribute attribute ON attribute.attrelid = correction_oid AND attribute.attnum = key.attnum WHERE key.ordinality <= indnkeyatts) = ARRAY['workOrderId', 'createdAt'])
     OR NOT EXISTS (SELECT 1 FROM pg_index WHERE indrelid = correction_oid AND NOT indisunique AND indpred IS NULL AND indexprs IS NULL AND indnkeyatts = 1 AND (SELECT array_agg(attribute.attname ORDER BY key.ordinality) FROM unnest(indkey::smallint[]) WITH ORDINALITY AS key(attnum, ordinality) JOIN pg_attribute attribute ON attribute.attrelid = correction_oid AND attribute.attnum = key.attnum WHERE key.ordinality <= indnkeyatts) = ARRAY['actorId'])
     OR NOT EXISTS (SELECT 1 FROM pg_index WHERE indrelid = application_oid AND indisunique AND indpred IS NULL AND indexprs IS NULL AND indnkeyatts = 2 AND (SELECT array_agg(attribute.attname ORDER BY key.ordinality) FROM unnest(indkey::smallint[]) WITH ORDINALITY AS key(attnum, ordinality) JOIN pg_attribute attribute ON attribute.attrelid = application_oid AND attribute.attnum = key.attnum WHERE key.ordinality <= indnkeyatts) = ARRAY['correctionId', 'originalApplicationId'])
     OR NOT EXISTS (SELECT 1 FROM pg_index WHERE indrelid = application_oid AND NOT indisunique AND indpred IS NULL AND indexprs IS NULL AND indnkeyatts = 1 AND (SELECT array_agg(attribute.attname ORDER BY key.ordinality) FROM unnest(indkey::smallint[]) WITH ORDINALITY AS key(attnum, ordinality) JOIN pg_attribute attribute ON attribute.attrelid = application_oid AND attribute.attnum = key.attnum WHERE key.ordinality <= indnkeyatts) = ARRAY['correctionId'])
     OR NOT EXISTS (SELECT 1 FROM pg_index WHERE indrelid = application_oid AND NOT indisunique AND indpred IS NULL AND indexprs IS NULL AND indnkeyatts = 1 AND (SELECT array_agg(attribute.attname ORDER BY key.ordinality) FROM unnest(indkey::smallint[]) WITH ORDINALITY AS key(attnum, ordinality) JOIN pg_attribute attribute ON attribute.attrelid = application_oid AND attribute.attnum = key.attnum WHERE key.ordinality <= indnkeyatts) = ARRAY['workOrderId']) THEN
    RAISE EXCEPTION 'Quote commercial correction unique constraints or indexes do not match the Prisma schema';
  END IF;

  IF (SELECT count(*) FROM pg_constraint WHERE conrelid = correction_oid AND contype = 'f') <> 3
     OR (SELECT count(*) FROM pg_constraint WHERE conrelid = application_oid AND contype = 'f') <> 6 THEN
    RAISE EXCEPTION 'Quote commercial correction foreign keys do not match the Prisma schema';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = correction_oid AND contype = 'f' AND confrelid = 'public."Quote"'::regclass AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = correction_oid AND attname = 'quoteId')] AND confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public."Quote"'::regclass AND attname = 'id')] AND confdeltype = 'r' AND confupdtype = 'c' AND convalidated)
     OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = correction_oid AND contype = 'f' AND confrelid = 'public."WorkOrder"'::regclass AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = correction_oid AND attname = 'workOrderId')] AND confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public."WorkOrder"'::regclass AND attname = 'id')] AND confdeltype = 'r' AND confupdtype = 'c' AND convalidated)
     OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = correction_oid AND contype = 'f' AND confrelid = 'public."UserProfile"'::regclass AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = correction_oid AND attname = 'actorId')] AND confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public."UserProfile"'::regclass AND attname = 'id')] AND confdeltype = 'r' AND confupdtype = 'c' AND convalidated)
     OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = application_oid AND contype = 'f' AND confrelid = correction_oid AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = application_oid AND attname = 'correctionId')] AND confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = correction_oid AND attname = 'id')] AND confdeltype = 'c' AND confupdtype = 'c' AND convalidated)
     OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = application_oid AND contype = 'f' AND confrelid = 'public."PaymentApplication"'::regclass AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = application_oid AND attname = 'originalApplicationId')] AND confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public."PaymentApplication"'::regclass AND attname = 'id')] AND confdeltype = 'r' AND confupdtype = 'c' AND convalidated)
     OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = application_oid AND contype = 'f' AND confrelid = 'public."LedgerEntry"'::regclass AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = application_oid AND attname = 'reversalLedgerEntryId')] AND confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public."LedgerEntry"'::regclass AND attname = 'id')] AND confdeltype = 'r' AND confupdtype = 'c' AND convalidated)
     OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = application_oid AND contype = 'f' AND confrelid = 'public."PaymentApplication"'::regclass AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = application_oid AND attname = 'replacementApplicationId')] AND confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public."PaymentApplication"'::regclass AND attname = 'id')] AND confdeltype = 'n' AND confupdtype = 'c' AND convalidated)
     OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = application_oid AND contype = 'f' AND confrelid = 'public."LedgerEntry"'::regclass AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = application_oid AND attname = 'replacementLedgerEntryId')] AND confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public."LedgerEntry"'::regclass AND attname = 'id')] AND confdeltype = 'n' AND confupdtype = 'c' AND convalidated)
     OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = application_oid AND contype = 'f' AND confrelid = 'public."WorkOrder"'::regclass AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = application_oid AND attname = 'workOrderId')] AND confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public."WorkOrder"'::regclass AND attname = 'id')] AND confdeltype = 'r' AND confupdtype = 'c' AND convalidated) THEN
    RAISE EXCEPTION 'Quote commercial correction foreign key definitions do not match the Prisma schema';
  END IF;
END $$;
