-- CreateIndex
CREATE INDEX "WorkOrder_status_completedAt_idx" ON "WorkOrder"("status", "completedAt");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");
