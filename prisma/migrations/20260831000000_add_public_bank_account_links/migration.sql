CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "BankAccount"
  ADD COLUMN "publicToken" TEXT NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN "isPubliclyShareable" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "BankAccount_publicToken_key" ON "BankAccount"("publicToken");
