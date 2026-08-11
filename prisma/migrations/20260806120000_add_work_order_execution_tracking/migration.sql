ALTER TABLE "WorkOrder"
ADD COLUMN "workshopCapacityConfirmedAt" TIMESTAMP(3),
ADD COLUMN "masterAvailabilityConfirmedAt" TIMESTAMP(3);

ALTER TABLE "ExecutionRecord"
ADD COLUMN "notes" TEXT,
ADD COLUMN "progressPercent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "isExtra" BOOLEAN NOT NULL DEFAULT false;
