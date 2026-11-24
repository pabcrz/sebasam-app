-- CreateTable
CREATE TABLE "ExpenseCategoryShare" (
    "category" "ExpenseCategory" NOT NULL,
    "partsSharePercent" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseCategoryShare_pkey" PRIMARY KEY ("category"),
    CONSTRAINT "ExpenseCategoryShare_partsSharePercent_range" CHECK ("partsSharePercent" BETWEEN 0 AND 100)
);

-- Row level security: only the server (service role / direct connection) reads or writes it.
ALTER TABLE "ExpenseCategoryShare" ENABLE ROW LEVEL SECURITY;
