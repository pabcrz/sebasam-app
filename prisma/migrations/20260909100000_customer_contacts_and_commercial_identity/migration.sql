-- CreateEnum
CREATE TYPE "CustomerContactRole" AS ENUM ('DRIVER', 'CONTACT', 'BILLING');

-- CreateTable CustomerContact
CREATE TABLE "CustomerContact" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "CustomerContactRole" NOT NULL DEFAULT 'CONTACT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

-- AlterTable Customer
ALTER TABLE "Customer" ADD COLUMN "commercialName" TEXT;
ALTER TABLE "Customer" ADD COLUMN "legalName" TEXT;

-- AlterTable Vehicle
ALTER TABLE "Vehicle" ADD COLUMN "economicNumber" TEXT;

-- AlterTable Quote
ALTER TABLE "Quote" ADD COLUMN "customerContactId" TEXT;
ALTER TABLE "Quote" ADD COLUMN "customerFiscalProfileId" TEXT;
ALTER TABLE "Quote" ADD COLUMN "customerSnapshot" JSONB;
ALTER TABLE "Quote" ADD COLUMN "contactSnapshot" JSONB;

-- CreateIndex on Customer
CREATE INDEX "Customer_name_idx" ON "Customer"("name");
CREATE INDEX "Customer_commercialName_idx" ON "Customer"("commercialName");
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex on CustomerContact
CREATE INDEX "CustomerContact_customerId_idx" ON "CustomerContact"("customerId");
CREATE INDEX "CustomerContact_phone_idx" ON "CustomerContact"("phone");
CREATE INDEX "CustomerContact_name_idx" ON "CustomerContact"("name");
CREATE INDEX "CustomerContact_role_idx" ON "CustomerContact"("role");

-- CreateIndex on Vehicle
CREATE INDEX "Vehicle_economicNumber_idx" ON "Vehicle"("economicNumber");

-- CreateIndex on CustomerFiscalProfile
CREATE INDEX "CustomerFiscalProfile_businessName_idx" ON "CustomerFiscalProfile"("businessName");

-- CreateIndex on Quote
CREATE INDEX "Quote_customerContactId_idx" ON "Quote"("customerContactId");
CREATE INDEX "Quote_customerFiscalProfileId_idx" ON "Quote"("customerFiscalProfileId");

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerContactId_fkey" FOREIGN KEY ("customerContactId") REFERENCES "CustomerContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerFiscalProfileId_fkey" FOREIGN KEY ("customerFiscalProfileId") REFERENCES "CustomerFiscalProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enable RLS on CustomerContact
ALTER TABLE "CustomerContact" ENABLE ROW LEVEL SECURITY;

-- Backfill conservador de commercialName en Customer
UPDATE "Customer" SET "commercialName" = "name" WHERE "commercialName" IS NULL;

-- Backfill conservador de customerSnapshot en Quote para cotizaciones históricas asociadas a un cliente
UPDATE "Quote" q
SET "customerSnapshot" = json_build_object(
    'customerId', c.id,
    'name', c.name,
    'commercialName', COALESCE(c."commercialName", c.name),
    'legalName', c."legalName",
    'email', c.email,
    'phone', c.phone,
    'address', c.address
)
FROM "Customer" c
WHERE q."customerId" = c.id AND q."customerSnapshot" IS NULL;
