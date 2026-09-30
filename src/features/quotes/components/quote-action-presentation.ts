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
  hasSharedQuote: boolean;
};

export type QuoteActionPresentation = {
  primary: QuoteActionId | null;
  sharePrimary: boolean;
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
  hasSharedQuote,
}: QuoteActionPresentationInput): QuoteActionPresentation {
  const available = new Set<QuoteActionId>(["print", "duplicate"]);

  if (editable) available.add("edit");
  if (status !== "CANCELLED") {
    available.add("share");
  }
  if (status === "SENT") available.add("authorize");
  if ((status === "APPROVED" || status === "REJECTED") && !hasWorkOrder) available.add("correctDecision");
  if (status === "DRAFT" || status === "SENT" || status === "APPROVED") available.add("workOrder");
  if (paymentAvailable) available.add("paymentLink");
  if (status === "DRAFT" || status === "SENT") available.add("cancel");
  if (status === "ARCHIVED") available.add("restore");
  if (status === "DRAFT" || status === "SENT" || status === "REJECTED" || status === "CANCELLED") {
    available.add("archive");
  }
  if (status !== "APPROVED") available.add("delete");

  // The mobile card always keeps the flow, Edit, Share, and Print in the same
  // slots. `hasSharedQuote` only selects the flow/Share color treatment.
  const primary: QuoteActionId = "workOrder";
  const frequent: QuoteActionId[] = ["edit", "share", "print"];
  const overflow = actionOrder.filter(
    (action) => available.has(action) && action !== primary && !frequent.includes(action),
  );

  return {
    primary,
    sharePrimary: !hasSharedQuote,
    frequent,
    overflow,
    destructive: available.has("delete") ? "delete" : null,
  };
}
