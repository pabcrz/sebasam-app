-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "resultingBalanceCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LedgerEntry_amountCents_positive_check" CHECK ("amountCents" > 0),
    CONSTRAINT "LedgerEntry_resultingBalanceCents_nonnegative_check" CHECK ("resultingBalanceCents" >= 0)
);

-- Backfill successful payments with the customer's approved debt after each payment.
WITH approved_charges AS (
    SELECT "customerId", SUM("totalCents") AS "chargedCents"
    FROM "Quote"
    WHERE "status" = 'APPROVED'::"QuoteStatus"
    GROUP BY "customerId"
), successful_payments AS (
    SELECT
        p."id",
        p."amountCents",
        p."createdAt",
        q."customerId",
        q."status" AS "quoteStatus"
    FROM "Payment" p
    JOIN "Quote" q ON q."id" = p."quoteId"
    WHERE p."status" = 'PAID'::"PaymentStatus"
), snapshots AS (
    SELECT
        p.*,
        COALESCE(c."chargedCents", 0) - SUM(
            CASE WHEN p."quoteStatus" = 'APPROVED'::"QuoteStatus" THEN p."amountCents" ELSE 0 END
        ) OVER (
            PARTITION BY p."customerId"
            ORDER BY p."createdAt", p."id"
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS "resultingBalanceCents"
    FROM successful_payments p
    LEFT JOIN approved_charges c ON c."customerId" = p."customerId"
)
INSERT INTO "LedgerEntry" ("id", "customerId", "paymentId", "type", "amountCents", "resultingBalanceCents", "createdAt")
SELECT
    md5('ledger:' || p."id"),
    p."customerId",
    p."id",
    'CREDIT'::"LedgerEntryType",
    p."amountCents",
    p."resultingBalanceCents",
    p."createdAt"
FROM snapshots p;

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_paymentId_key" ON "LedgerEntry"("paymentId");

-- CreateIndex
CREATE INDEX "LedgerEntry_customerId_createdAt_idx" ON "LedgerEntry"("customerId", "createdAt");

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
