-- DropIndex
DROP INDEX IF EXISTS "Vehicle_plate_key";

-- AlterTable
ALTER TABLE "Vehicle" ALTER COLUMN "brand" DROP NOT NULL,
ALTER COLUMN "plate" DROP NOT NULL;
