-- Fix existing drift: the SharedQuote token index was added after the original
-- migration was applied. Using IF NOT EXISTS keeps this idempotent.
CREATE INDEX IF NOT EXISTS "SharedQuote_token_idx" ON "SharedQuote"("token");

-- AlterTable
ALTER TABLE "PaymentSettings" ADD COLUMN "hours" JSONB NOT NULL DEFAULT '{"weekdays":"Lunes a viernes de 9:00 a 18:00","saturday":"Sábados de 9:00 a 15:00"}',
ADD COLUMN "services" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "products" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
