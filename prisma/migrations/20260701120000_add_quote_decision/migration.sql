-- CreateEnum
CREATE TYPE "QuoteDecisionOrigin" AS ENUM ('CUSTOMER', 'ADMIN');

-- CreateTable
CREATE TABLE "QuoteDecision" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL,
    "origin" "QuoteDecisionOrigin" NOT NULL,
    "actorId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuoteDecision_quoteId_idx" ON "QuoteDecision"("quoteId");

-- AddForeignKey
ALTER TABLE "QuoteDecision" ADD CONSTRAINT "QuoteDecision_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
