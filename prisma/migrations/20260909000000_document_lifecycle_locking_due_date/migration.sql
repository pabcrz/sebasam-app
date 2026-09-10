-- CreateEnum
CREATE TYPE "QuoteLifecycleEventType" AS ENUM ('STATUS_CHANGE', 'LOCK', 'UNLOCK', 'CONVERT_TO_NOTE', 'RETURN_TO_QUOTE');

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lockedAt" TIMESTAMP(3),
ADD COLUMN "lockedById" UUID,
ADD COLUMN "lockedReason" TEXT,
ADD COLUMN "paymentDueDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "QuoteLifecycleEvent" ADD COLUMN "eventType" "QuoteLifecycleEventType" NOT NULL DEFAULT 'STATUS_CHANGE';

-- CreateIndex
CREATE INDEX "Quote_lockedById_idx" ON "Quote"("lockedById");

-- CreateIndex
CREATE INDEX "QuoteLifecycleEvent_quoteId_eventType_idx" ON "QuoteLifecycleEvent"("quoteId", "eventType");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
