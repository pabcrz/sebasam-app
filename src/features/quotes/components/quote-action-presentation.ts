import type { QuoteStatus } from "@prisma/client";

export type QuoteActionId =
  | "print"
  | "edit"
  | "share"
  | "authorize"
  | "workOrder"
  | "paymentLink"
  | "correctDecision"
  | "duplicate"
  | "cancel"
  | "archive"
  | "restore"
  | "delete";

type QuoteActionPresentationInput = {
  status: QuoteStatus;
  editable: boolean;
  hasWorkOrder: boolean;
  paymentAvailable: boolean;
};

export type QuoteActionPresentation = {
  primary: QuoteActionId | null;
  frequent: QuoteActionId[];
  overflow: QuoteActionId[];
  destructive: QuoteActionId | null;
};

const actionOrder: QuoteActionId[] = [
  "print",
  "edit",
  "share",
  "authorize",
  "workOrder",
  "paymentLink",
  "correctDecision",
  "duplicate",
  "cancel",
  "archive",
  "restore",
];

/**
 * Reorganizes controls that are already permitted by the quote card. This is
 * presentation-only: server actions and their conditions remain authoritative.
 */
export function resolveQuoteActionPresentation({
  status,
  editable,
  hasWorkOrder,
  paymentAvailable,
}: QuoteActionPresentationInput): QuoteActionPresentation {
  const available = new Set<QuoteActionId>(["print", "duplicate"]);

  if (editable) available.add("edit");
  if (status !== "CANCELLED") {
    available.add("share");
  }
  if (status === "DRAFT" || status === "SENT") available.add("authorize");
  if ((status === "APPROVED" || status === "REJECTED") && !hasWorkOrder) available.add("correctDecision");
  if (status === "DRAFT" || status === "SENT" || status === "APPROVED") available.add("workOrder");
  if (paymentAvailable) available.add("paymentLink");
  if (status === "DRAFT" || status === "SENT") available.add("cancel");
  if (status === "ARCHIVED") available.add("restore");
  if (status === "DRAFT" || status === "SENT" || status === "REJECTED" || status === "CANCELLED") {
    available.add("archive");
  }
  if (status !== "APPROVED") available.add("delete");

  // Keep the primary quote action and compact action slots stable on every card.
  const primary: QuoteActionId = status === "DRAFT" && !hasWorkOrder ? "authorize" : "workOrder";
  const frequent: QuoteActionId[] = ["edit", "print", "share"];
  const overflow = actionOrder.filter(
    (action) => available.has(action) && action !== primary && !frequent.includes(action),
  );

  return {
    primary,
    frequent,
    overflow,
    destructive: available.has("delete") ? "delete" : null,
  };
}
