CREATE TYPE "SettlementAgreementStatus" AS ENUM ('ACTIVE', 'CANCELLED');

CREATE TABLE "SettlementAgreement" (
  "id" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "status" "SettlementAgreementStatus" NOT NULL DEFAULT 'ACTIVE',
  "nominalSubtotalCents" INTEGER NOT NULL,
  "nominalTaxCents" INTEGER NOT NULL,
  "nominalTotalCents" INTEGER NOT NULL,
  "settlementBaseCents" INTEGER NOT NULL,
  "settlementTaxCents" INTEGER NOT NULL,
  "settlementTotalCents" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "actorId" UUID NOT NULL,
  "cancelledAt" TIMESTAMP(3),
  "cancelledById" UUID,
  "cancellationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SettlementAgreement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SettlementAgreementRevision" (
  "id" TEXT NOT NULL,
  "settlementAgreementId" TEXT NOT NULL,
  "revisionNumber" INTEGER NOT NULL,
  "nominalSubtotalCents" INTEGER NOT NULL,
  "nominalTaxCents" INTEGER NOT NULL,
  "nominalTotalCents" INTEGER NOT NULL,
  "settlementBaseCents" INTEGER NOT NULL,
  "settlementTaxCents" INTEGER NOT NULL,
  "settlementTotalCents" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "actorId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SettlementAgreementRevision_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PaymentRequest" ADD COLUMN "payableSubtotalCents" INTEGER;
ALTER TABLE "PaymentRequest" ADD COLUMN "payableTaxCents" INTEGER;
ALTER TABLE "PaymentRequest" ADD COLUMN "payableTotalCents" INTEGER;
ALTER TABLE "PaymentRequest" ADD COLUMN "settlementAgreementId" TEXT;

CREATE UNIQUE INDEX "SettlementAgreement_quoteId_key" ON "SettlementAgreement"("quoteId");
CREATE INDEX "SettlementAgreement_status_idx" ON "SettlementAgreement"("status");
CREATE INDEX "SettlementAgreement_actorId_idx" ON "SettlementAgreement"("actorId");
CREATE UNIQUE INDEX "SettlementAgreementRevision_settlementAgreementId_revisionNumber_key" ON "SettlementAgreementRevision"("settlementAgreementId", "revisionNumber");
CREATE INDEX "SettlementAgreementRevision_settlementAgreementId_createdAt_idx" ON "SettlementAgreementRevision"("settlementAgreementId", "createdAt");

ALTER TABLE "SettlementAgreement" ADD CONSTRAINT "SettlementAgreement_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SettlementAgreement" ADD CONSTRAINT "SettlementAgreement_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SettlementAgreement" ADD CONSTRAINT "SettlementAgreement_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SettlementAgreementRevision" ADD CONSTRAINT "SettlementAgreementRevision_settlementAgreementId_fkey" FOREIGN KEY ("settlementAgreementId") REFERENCES "SettlementAgreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SettlementAgreementRevision" ADD CONSTRAINT "SettlementAgreementRevision_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SettlementAgreement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SettlementAgreementRevision" ENABLE ROW LEVEL SECURITY;
