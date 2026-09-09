-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN "paymentDueDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "WorkOrder_status_paymentDueDate_idx" ON "WorkOrder"("status", "paymentDueDate");
