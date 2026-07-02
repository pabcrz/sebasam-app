import type { QuoteStatus, WorkOrderStatus } from "@prisma/client";

type QuoteForEditability = {
  status: QuoteStatus;
  validUntil: Date | null;
  workOrder: { status: WorkOrderStatus } | null;
};

/**
 * Determines if a quote can be edited based on its status, validity, and work order state.
 *
 * Editable when:
 * - Status is DRAFT, SENT, APPROVED, or REJECTED
 * - NOT expired (validUntil >= now)
 * - WorkOrder is NOT COMPLETED or CANCELLED
 */
export function isQuoteEditable(quote: QuoteForEditability, now: Date = new Date()): boolean {
  const editableStatuses: QuoteStatus[] = ["DRAFT", "SENT", "APPROVED", "REJECTED"];

  if (!editableStatuses.includes(quote.status)) {
    return false;
  }

  if (quote.validUntil && quote.validUntil < now) {
    return false;
  }

  if (quote.workOrder) {
    const blockedWorkOrderStatuses: WorkOrderStatus[] = ["COMPLETED", "CANCELLED"];
    if (blockedWorkOrderStatuses.includes(quote.workOrder.status)) {
      return false;
    }
  }

  return true;
}
