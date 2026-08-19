-- CreateEnum
CREATE TYPE "OperationalWorkStatus" AS ENUM ('OPEN', 'CONVERTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "OperationalWork" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "OperationalWorkStatus" NOT NULL DEFAULT 'OPEN',
    "masterId" UUID NOT NULL,
    "customerId" TEXT,
    "plate" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "report" TEXT,
    "notes" TEXT,
    "convertedQuoteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationalWork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalConcept" (
    "id" TEXT NOT NULL,
    "operationalWorkId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OperationalConcept_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperationalWork_number_key" ON "OperationalWork"("number");
CREATE UNIQUE INDEX "OperationalWork_convertedQuoteId_key" ON "OperationalWork"("convertedQuoteId");
CREATE INDEX "OperationalWork_masterId_idx" ON "OperationalWork"("masterId");
CREATE INDEX "OperationalWork_customerId_idx" ON "OperationalWork"("customerId");
CREATE INDEX "OperationalWork_status_createdAt_idx" ON "OperationalWork"("status", "createdAt");
CREATE INDEX "OperationalConcept_operationalWorkId_sortOrder_idx" ON "OperationalConcept"("operationalWorkId", "sortOrder");

-- AddForeignKey
ALTER TABLE "OperationalWork" ADD CONSTRAINT "OperationalWork_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalWork" ADD CONSTRAINT "OperationalWork_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OperationalWork" ADD CONSTRAINT "OperationalWork_convertedQuoteId_fkey" FOREIGN KEY ("convertedQuoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OperationalConcept" ADD CONSTRAINT "OperationalConcept_operationalWorkId_fkey" FOREIGN KEY ("operationalWorkId") REFERENCES "OperationalWork"("id") ON DELETE CASCADE ON UPDATE CASCADE;
