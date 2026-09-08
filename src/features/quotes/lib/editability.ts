import type { QuoteStatus, WorkOrderStatus } from "@prisma/client";

type QuoteForEditability = {
  status: QuoteStatus;
  validUntil?: Date | null;
  workOrder?: { status: WorkOrderStatus } | null;
};

/**
 * Determines if a quote can be edited.
 *
 * Editable unless the quote is cancelled or its work order is completed.
 *
 */
export function isQuoteEditable(quote: QuoteForEditability): boolean {
  return quote.status !== "CANCELLED" && quote.workOrder?.status !== "COMPLETED";
}

/**
 * Determines if a completed work order's commercial data can be corrected.
 *
 * Correction is allowed only when the work order is completed and the caller
 * will verify at commit time that no active payment exists.
 */
export function isCompletedWorkCorrectable(quote: QuoteForEditability): boolean {
  return quote.workOrder?.status === "COMPLETED";
}
