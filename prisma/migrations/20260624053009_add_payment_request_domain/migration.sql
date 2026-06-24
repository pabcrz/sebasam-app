-- CreateEnum
CREATE TYPE "PaymentRequestStatus" AS ENUM ('PENDING', 'VIEWED', 'FISCAL_DATA_REQUIRED', 'READY_TO_PAY', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "CustomerFiscalProfile" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "zipCode" TEXT,
    "address" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerFiscalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRequest" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "PaymentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "customerId" TEXT NOT NULL,
    "quoteId" TEXT,
    "workOrderId" TEXT,
    "requiresInvoice" BOOLEAN NOT NULL DEFAULT false,
    "customerFiscalProfileId" TEXT,
    "fiscalSnapshot" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "viewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerFiscalProfile_customerId_idx" ON "CustomerFiscalProfile"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerFiscalProfile_customerId_taxId_key" ON "CustomerFiscalProfile"("customerId", "taxId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRequest_token_key" ON "PaymentRequest"("token");

-- CreateIndex
CREATE INDEX "PaymentRequest_customerId_idx" ON "PaymentRequest"("customerId");

-- CreateIndex
CREATE INDEX "PaymentRequest_quoteId_idx" ON "PaymentRequest"("quoteId");

-- CreateIndex
CREATE INDEX "PaymentRequest_workOrderId_idx" ON "PaymentRequest"("workOrderId");

-- CreateIndex
CREATE INDEX "PaymentRequest_token_idx" ON "PaymentRequest"("token");

-- AddForeignKey
ALTER TABLE "CustomerFiscalProfile" ADD CONSTRAINT "CustomerFiscalProfile_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_customerFiscalProfileId_fkey" FOREIGN KEY ("customerFiscalProfileId") REFERENCES "CustomerFiscalProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- PartialUniqueIndex
-- Prevent more than one active payment request per quote or work order.
CREATE UNIQUE INDEX "PaymentRequest_active_quoteId_key" ON "PaymentRequest"("quoteId") WHERE "quoteId" IS NOT NULL AND "status" IN ('PENDING', 'VIEWED', 'FISCAL_DATA_REQUIRED', 'READY_TO_PAY');

-- PartialUniqueIndex
CREATE UNIQUE INDEX "PaymentRequest_active_workOrderId_key" ON "PaymentRequest"("workOrderId") WHERE "workOrderId" IS NOT NULL AND "status" IN ('PENDING', 'VIEWED', 'FISCAL_DATA_REQUIRED', 'READY_TO_PAY');
