-- CheckConstraint
-- Ensures every PaymentRequest is linked to at least one operation: a quote or a work order.
ALTER TABLE "PaymentRequest" DROP CONSTRAINT IF EXISTS "PaymentRequest_operation_link_check";
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_operation_link_check" CHECK ("quoteId" IS NOT NULL OR "workOrderId" IS NOT NULL);
