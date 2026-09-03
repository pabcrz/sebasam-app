-- AlterTable
ALTER TABLE "QuoteItem"
  ADD COLUMN "includeInPayroll" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "customRatePercent" INTEGER;
