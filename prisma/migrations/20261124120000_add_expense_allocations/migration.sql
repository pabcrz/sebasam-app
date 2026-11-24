-- CreateTable
CREATE TABLE "ExpenseAllocation" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "payableNoteId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseAllocation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ExpenseAllocation_amountCents_positive" CHECK ("amountCents" > 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseAllocation_expenseId_payableNoteId_key" ON "ExpenseAllocation"("expenseId", "payableNoteId");

-- CreateIndex
CREATE INDEX "ExpenseAllocation_payableNoteId_idx" ON "ExpenseAllocation"("payableNoteId");

-- AddForeignKey
ALTER TABLE "ExpenseAllocation" ADD CONSTRAINT "ExpenseAllocation_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseAllocation" ADD CONSTRAINT "ExpenseAllocation_payableNoteId_fkey" FOREIGN KEY ("payableNoteId") REFERENCES "PayableNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row level security: only the server (service role / direct connection) reads or writes it.
ALTER TABLE "ExpenseAllocation" ENABLE ROW LEVEL SECURITY;
