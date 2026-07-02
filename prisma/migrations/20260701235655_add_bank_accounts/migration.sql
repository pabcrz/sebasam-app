-- CreateTable
CREATE TABLE "BankAccount" (
    "id" SERIAL NOT NULL,
    "paymentSettingsId" INTEGER NOT NULL,
    "accountHolder" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "clabe" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- Migrate existing flat bank fields from PaymentSettings into BankAccount
INSERT INTO "BankAccount" ("paymentSettingsId", "accountHolder", "bankName", "accountNumber", "clabe", "sortOrder")
SELECT
    "id",
    "bankAccountHolder",
    "bankName",
    "bankAccountNumber",
    "bankClabe",
    0
FROM "PaymentSettings"
WHERE "bankAccountHolder" IS NOT NULL AND "bankAccountHolder" != '';

-- CreateIndex
CREATE INDEX "BankAccount_paymentSettingsId_idx" ON "BankAccount"("paymentSettingsId");

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_paymentSettingsId_fkey" FOREIGN KEY ("paymentSettingsId") REFERENCES "PaymentSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable — drop the flat bank fields
ALTER TABLE "PaymentSettings" DROP COLUMN "bankAccountHolder",
DROP COLUMN "bankAccountNumber",
DROP COLUMN "bankClabe",
DROP COLUMN "bankName";
