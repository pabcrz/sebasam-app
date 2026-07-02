-- CreateTable
CREATE TABLE "PaymentSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL DEFAULT 'SEBASAM',
    "fullName" TEXT NOT NULL DEFAULT 'Servicio Básico a Suspensiones y Aire y Muelles',
    "address" TEXT NOT NULL DEFAULT 'Batalla de Casa Blanca 1719B, Leyes de Reforma, Iztapalapa, 09310 Ciudad de México, CDMX',
    "mapsUrl" TEXT NOT NULL DEFAULT 'https://maps.app.goo.gl/MYuGBKwabPGbea7y7',
    "bankAccountHolder" TEXT NOT NULL DEFAULT 'Federico Cruz',
    "bankName" TEXT NOT NULL DEFAULT 'Santander',
    "bankAccountNumber" TEXT NOT NULL DEFAULT '123456',
    "bankClabe" TEXT NOT NULL DEFAULT '4444 4444 4444 4444',
    "contactPhone" TEXT NOT NULL DEFAULT '5556007675',
    "contactWhatsapp" TEXT NOT NULL DEFAULT '5536239346',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSettings_pkey" PRIMARY KEY ("id")
);
