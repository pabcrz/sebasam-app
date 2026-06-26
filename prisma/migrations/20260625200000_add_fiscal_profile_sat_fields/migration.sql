-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('INDIVIDUAL', 'BUSINESS');

-- AlterTable
ALTER TABLE "CustomerFiscalProfile" ADD COLUMN "personType" "PersonType" NOT NULL DEFAULT 'INDIVIDUAL',
ADD COLUMN "taxRegime" TEXT,
ADD COLUMN "cfdiUse" TEXT;
