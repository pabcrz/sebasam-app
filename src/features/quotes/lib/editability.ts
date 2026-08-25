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
