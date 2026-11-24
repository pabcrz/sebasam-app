-- Additive: a new table and two enums; no existing data is read or changed.
-- Rollback: DROP TABLE "Expense"; DROP TYPE "ExpenseInvoiceStatus"; DROP TYPE "ExpenseCategory";

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('RENT', 'ELECTRICITY', 'WATER', 'PHONE_INTERNET', 'PARTS_PURCHASE', 'MATERIALS_PURCHASE', 'TOOLS_EQUIPMENT', 'FUEL_TRANSPORT', 'TAXES_FEES', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseInvoiceStatus" AS ENUM ('INVOICED', 'NOT_INVOICED');

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "spentAt" DATE NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "invoiceStatus" "ExpenseInvoiceStatus" NOT NULL,
    "partsSharePercent" INTEGER NOT NULL DEFAULT 0,
    "supplier" TEXT,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "createdById" UUID,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Expense_amountCents_positive" CHECK ("amountCents" > 0),
    CONSTRAINT "Expense_partsSharePercent_range" CHECK ("partsSharePercent" BETWEEN 0 AND 100)
);

-- CreateIndex
CREATE INDEX "Expense_spentAt_idx" ON "Expense"("spentAt");

-- CreateIndex
CREATE INDEX "Expense_deletedAt_spentAt_idx" ON "Expense"("deletedAt", "spentAt");

-- Row level security: only the server (service role / direct connection) reads or writes it.
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
