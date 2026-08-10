-- AlterEnum
ALTER TYPE "QuoteStatus" ADD VALUE 'ARCHIVED';

-- CreateTable
CREATE TABLE "QuoteLifecycleEvent" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "previousState" "QuoteStatus" NOT NULL,
    "nextState" "QuoteStatus" NOT NULL,
    "actorId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteLifecycleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuoteLifecycleEvent_quoteId_createdAt_idx" ON "QuoteLifecycleEvent"("quoteId", "createdAt");
CREATE INDEX "QuoteLifecycleEvent_actorId_idx" ON "QuoteLifecycleEvent"("actorId");

-- AddForeignKey
ALTER TABLE "QuoteLifecycleEvent" ADD CONSTRAINT "QuoteLifecycleEvent_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteLifecycleEvent" ADD CONSTRAINT "QuoteLifecycleEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
