ALTER TABLE "Quote" ADD COLUMN "submissionKey" TEXT,
ADD COLUMN "submissionHash" TEXT;

CREATE UNIQUE INDEX "Quote_submissionKey_key" ON "Quote"("submissionKey");
