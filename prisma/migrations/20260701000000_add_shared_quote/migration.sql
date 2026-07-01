-- CreateTable
CREATE TABLE "SharedQuote" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedQuote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SharedQuote_token_key" ON "SharedQuote"("token");

-- CreateIndex
CREATE INDEX "SharedQuote_quoteId_idx" ON "SharedQuote"("quoteId");

-- AddForeignKey
ALTER TABLE "SharedQuote" ADD CONSTRAINT "SharedQuote_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
