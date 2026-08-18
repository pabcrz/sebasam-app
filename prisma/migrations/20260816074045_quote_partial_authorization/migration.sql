/*
  Warnings:

  - You are about to drop the column `masterAvailabilityConfirmedAt` on the `WorkOrder` table. All the data in the column will be lost.
  - You are about to drop the column `workshopCapacityConfirmedAt` on the `WorkOrder` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentMethod" ADD VALUE 'CREDIT_CARD';
ALTER TYPE "PaymentMethod" ADD VALUE 'DEBIT_CARD';

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "discountCents" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "validUntil" SET DEFAULT CURRENT_TIMESTAMP + INTERVAL '7 days';

-- AlterTable
ALTER TABLE "QuoteDecision" ADD COLUMN     "authorizedSectionIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "QuoteItem" ADD COLUMN     "sectionId" TEXT;

-- AlterTable
ALTER TABLE "WorkOrder" DROP COLUMN "masterAvailabilityConfirmedAt",
DROP COLUMN "workshopCapacityConfirmedAt",
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "isSpecial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "specialAssigneeName" TEXT;

-- CreateTable
CREATE TABLE "QuoteSection" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isAuthorized" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QuoteSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuoteSection_quoteId_idx" ON "QuoteSection"("quoteId");

-- CreateIndex
CREATE INDEX "QuoteItem_sectionId_idx" ON "QuoteItem"("sectionId");

-- AddForeignKey
ALTER TABLE "QuoteSection" ADD CONSTRAINT "QuoteSection_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "QuoteSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
