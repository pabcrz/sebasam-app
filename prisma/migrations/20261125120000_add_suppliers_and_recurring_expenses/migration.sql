-- CreateTable
CREATE TABLE "ExpenseSupplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "usuallyInvoiced" BOOLEAN NOT NULL DEFAULT false,
    "category" "ExpenseCategory",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringExpense" (
    "id" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "invoiceStatus" "ExpenseInvoiceStatus" NOT NULL,
    "supplier" TEXT,
    "paymentMethod" TEXT,
    "dayOfMonth" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringExpense_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RecurringExpense_amountCents_positive" CHECK ("amountCents" > 0),
    CONSTRAINT "RecurringExpense_dayOfMonth_range" CHECK ("dayOfMonth" BETWEEN 1 AND 28)
);

-- CreateTable
CREATE TABLE "RecurringExpenseSkip" (
    "recurringExpenseId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringExpenseSkip_pkey" PRIMARY KEY ("recurringExpenseId","month")
);

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "supplierId" TEXT, ADD COLUMN "recurringExpenseId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseSupplier_name_key" ON "ExpenseSupplier"("name");

-- CreateIndex
CREATE INDEX "Expense_recurringExpenseId_spentAt_idx" ON "Expense"("recurringExpenseId", "spentAt");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "ExpenseSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_recurringExpenseId_fkey" FOREIGN KEY ("recurringExpenseId") REFERENCES "RecurringExpense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpenseSkip" ADD CONSTRAINT "RecurringExpenseSkip_recurringExpenseId_fkey" FOREIGN KEY ("recurringExpenseId") REFERENCES "RecurringExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every distinct supplier text already registered (exact match) becomes a catalog entry
-- that remembers the invoice status and category of its latest expense, and the expenses point to it.
INSERT INTO "ExpenseSupplier" ("id", "name", "usuallyInvoiced", "category", "updatedAt")
SELECT 'sup_' || md5("supplier"), "supplier",
       (array_agg("invoiceStatus" ORDER BY "spentAt" DESC, "createdAt" DESC))[1] = 'INVOICED',
       (array_agg("category" ORDER BY "spentAt" DESC, "createdAt" DESC))[1],
       CURRENT_TIMESTAMP
FROM "Expense"
WHERE "supplier" IS NOT NULL AND "deletedAt" IS NULL
GROUP BY "supplier";

UPDATE "Expense" SET "supplierId" = 'sup_' || md5("supplier") WHERE "supplier" IS NOT NULL AND "deletedAt" IS NULL;

-- Row level security: only the server (service role / direct connection) reads or writes them.
ALTER TABLE "ExpenseSupplier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecurringExpense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecurringExpenseSkip" ENABLE ROW LEVEL SECURITY;
