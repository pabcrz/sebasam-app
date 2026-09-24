ALTER TABLE "QuoteCommercialCorrection" ALTER COLUMN "workOrderId" DROP NOT NULL;
ALTER TABLE "QuoteCommercialCorrectionApplication" ALTER COLUMN "workOrderId" DROP NOT NULL;
ALTER TABLE "QuoteCommercialCorrectionApplication" ALTER COLUMN "payableNoteId" SET NOT NULL;
