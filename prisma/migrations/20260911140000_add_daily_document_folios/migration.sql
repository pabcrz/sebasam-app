-- AlterTable
ALTER TABLE "Quote" ADD COLUMN "folio" TEXT,
ADD COLUMN "issuedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN "folio" TEXT,
ADD COLUMN "issuedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DailyDocumentSequence" (
    "id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "businessDate" VARCHAR(10) NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyDocumentSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quote_folio_key" ON "Quote"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_folio_key" ON "WorkOrder"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "DailyDocumentSequence_documentType_businessDate_key" ON "DailyDocumentSequence"("documentType", "businessDate");
