UPDATE "PaymentRequest"
SET "status" = CASE
  WHEN "viewedAt" IS NULL THEN 'PENDING'::"PaymentRequestStatus"
  ELSE 'VIEWED'::"PaymentRequestStatus"
END
WHERE "status" = 'FISCAL_DATA_REQUIRED'::"PaymentRequestStatus";
