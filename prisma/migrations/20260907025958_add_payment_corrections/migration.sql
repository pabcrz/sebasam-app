-- CreateTable
CREATE TABLE "PaymentCorrection" (
    "id" TEXT NOT NULL,
    "operationKey" TEXT NOT NULL,
    "originalPaymentId" TEXT NOT NULL,
    "replacementPaymentId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "actorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentCorrectionApplication" (
    "id" TEXT NOT NULL,
    "paymentCorrectionId" TEXT NOT NULL,
    "originalApplicationId" TEXT NOT NULL,
    "replacementApplicationId" TEXT,
    "workOrderId" TEXT NOT NULL,
    "originalAmountCents" INTEGER NOT NULL,
    "replacementAmountCents" INTEGER NOT NULL,
    "shortfallCents" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentCorrectionApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentCorrection_operationKey_key" ON "PaymentCorrection"("operationKey");

-- CreateIndex
CREATE INDEX "PaymentCorrection_originalPaymentId_idx" ON "PaymentCorrection"("originalPaymentId");

-- CreateIndex
CREATE INDEX "PaymentCorrection_replacementPaymentId_idx" ON "PaymentCorrection"("replacementPaymentId");

-- CreateIndex
CREATE INDEX "PaymentCorrection_actorId_idx" ON "PaymentCorrection"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentCorrection_originalPaymentId_key" ON "PaymentCorrection"("originalPaymentId");

-- CreateIndex
CREATE INDEX "PaymentCorrectionApplication_paymentCorrectionId_idx" ON "PaymentCorrectionApplication"("paymentCorrectionId");

-- CreateIndex
CREATE INDEX "PaymentCorrectionApplication_workOrderId_idx" ON "PaymentCorrectionApplication"("workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentCorrectionApplication_paymentCorrectionId_originalAp_key" ON "PaymentCorrectionApplication"("paymentCorrectionId", "originalApplicationId");

-- AddForeignKey
ALTER TABLE "PaymentCorrection" ADD CONSTRAINT "PaymentCorrection_originalPaymentId_fkey" FOREIGN KEY ("originalPaymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentCorrection" ADD CONSTRAINT "PaymentCorrection_replacementPaymentId_fkey" FOREIGN KEY ("replacementPaymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentCorrection" ADD CONSTRAINT "PaymentCorrection_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentCorrectionApplication" ADD CONSTRAINT "PaymentCorrectionApplication_paymentCorrectionId_fkey" FOREIGN KEY ("paymentCorrectionId") REFERENCES "PaymentCorrection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentCorrectionApplication" ADD CONSTRAINT "PaymentCorrectionApplication_originalApplicationId_fkey" FOREIGN KEY ("originalApplicationId") REFERENCES "PaymentApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentCorrectionApplication" ADD CONSTRAINT "PaymentCorrectionApplication_replacementApplicationId_fkey" FOREIGN KEY ("replacementApplicationId") REFERENCES "PaymentApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentCorrectionApplication" ADD CONSTRAINT "PaymentCorrectionApplication_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
