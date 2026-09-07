-- AlterTable
ALTER TABLE "UserProfile"
  ADD COLUMN "fixedWeeklyPayCents" INTEGER,
  ADD COLUMN "fixedDailyPayCents" INTEGER;

-- CreateTable
CREATE TABLE "HelperPayrollWeek" (
  "id" TEXT NOT NULL,
  "workerId" UUID NOT NULL,
  "weekStart" DATE NOT NULL,
  "weeklyRateCents" INTEGER NOT NULL,
  "dailyRateCents" INTEGER NOT NULL,
  "absenceDays" INTEGER NOT NULL DEFAULT 0,
  "manualCommissionCents" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "HelperPayrollWeek_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HelperPayrollWeek_workerId_weekStart_key" ON "HelperPayrollWeek"("workerId", "weekStart");
CREATE INDEX "HelperPayrollWeek_weekStart_idx" ON "HelperPayrollWeek"("weekStart");

-- AddForeignKey
ALTER TABLE "HelperPayrollWeek"
  ADD CONSTRAINT "HelperPayrollWeek_workerId_fkey"
  FOREIGN KEY ("workerId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Keep operational payroll records inaccessible through public database roles.
ALTER TABLE "HelperPayrollWeek" ENABLE ROW LEVEL SECURITY;
