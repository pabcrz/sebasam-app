import type { QuoteStatus, WorkOrderStatus } from "@prisma/client";

type QuoteForEditability = {
  status: QuoteStatus;
  validUntil?: Date | null;
  workOrder?: { status: WorkOrderStatus } | null;
};

/**
 * Determines if a quote can be edited.
 *
 * Editable in all active operational states (DRAFT, SENT, APPROVED)
 * including when a work order is active or completed, so that the admin
 * can add missing concepts, toggle IVA for invoices, or update details anytime.
 *
 * Only CANCELLED quotes are locked against editing.
 */
export function isQuoteEditable(quote: QuoteForEditability): boolean {
  return quote.status !== "CANCELLED";
}
