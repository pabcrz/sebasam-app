-- CreateEnum
CREATE TYPE "PayrollPeriodStatus" AS ENUM ('OPEN', 'CLOSED', 'PAID', 'ARCHIVED');

-- AlterTable
ALTER TABLE "QuoteItem" ADD COLUMN "payrollConfigLockedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "WorkOrderLaborAdvance" (
  "id" TEXT NOT NULL,
  "workOrderId" TEXT NOT NULL,
  "quoteItemId" TEXT NOT NULL,
  "workerId" UUID NOT NULL,
  "weekStart" DATE NOT NULL,
  "advanceBaseCents" INTEGER NOT NULL,
  "advancePercentage" INTEGER NOT NULL,
  "commissionRatePercent" INTEGER NOT NULL,
  "commissionCents" INTEGER NOT NULL,
  "notes" TEXT,
  "createdById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WorkOrderLaborAdvance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollWeekControl" (
  "id" TEXT NOT NULL,
  "weekStart" DATE NOT NULL,
  "status" "PayrollPeriodStatus" NOT NULL DEFAULT 'CLOSED',
  "closedAt" TIMESTAMP(3),
  "closedById" UUID,
  "reopenedAt" TIMESTAMP(3),
  "reopenedById" UUID,
  "reopenReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PayrollWeekControl_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderLaborAdvance_quoteItemId_weekStart_key" ON "WorkOrderLaborAdvance"("quoteItemId", "weekStart");
CREATE INDEX "WorkOrderLaborAdvance_workOrderId_weekStart_idx" ON "WorkOrderLaborAdvance"("workOrderId", "weekStart");
CREATE INDEX "WorkOrderLaborAdvance_workerId_weekStart_idx" ON "WorkOrderLaborAdvance"("workerId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollWeekControl_weekStart_key" ON "PayrollWeekControl"("weekStart");

-- AddForeignKey
ALTER TABLE "WorkOrderLaborAdvance" ADD CONSTRAINT "WorkOrderLaborAdvance_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrderLaborAdvance" ADD CONSTRAINT "WorkOrderLaborAdvance_quoteItemId_fkey" FOREIGN KEY ("quoteItemId") REFERENCES "QuoteItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrderLaborAdvance" ADD CONSTRAINT "WorkOrderLaborAdvance_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrderLaborAdvance" ADD CONSTRAINT "WorkOrderLaborAdvance_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollWeekControl" ADD CONSTRAINT "PayrollWeekControl_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayrollWeekControl" ADD CONSTRAINT "PayrollWeekControl_reopenedById_fkey" FOREIGN KEY ("reopenedById") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Keep operational payroll records inaccessible through public database roles.
ALTER TABLE "WorkOrderLaborAdvance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PayrollWeekControl" ENABLE ROW LEVEL SECURITY;
