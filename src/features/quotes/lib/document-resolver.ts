import { WorkOrderStatus } from "@/generated/prisma/enums";

export type ResolvableQuote = {
  number: string;
  folio?: string | null;
  workOrder?: {
    status?: WorkOrderStatus | string | null;
    folio?: string | null;
  } | null;
};

export type ResolvableWorkOrder = {
  status?: WorkOrderStatus | string | null;
  folio?: string | null;
  quote?: {
    number: string;
    folio?: string | null;
  } | null;
};

export type ResolvableDocument = ResolvableQuote | ResolvableWorkOrder;

export type DocumentPresentation = {
  documentType: "Cotización" | "Nota";
  documentTitle: "COTIZACIÓN" | "NOTA DE SERVICIO";
};

/**
 * Resolves the customer-facing document presentation without changing its
 * route or folio. Authorized, executing, and completed work are service notes;
 * quotes without work and non-active work remain quotations.
 */
export function resolveDocumentPresentation(
  doc: ResolvableDocument | null | undefined,
): DocumentPresentation {
  const status = doc
    ? "number" in doc
      ? doc.workOrder?.status
      : doc.status
    : null;
  const isNote =
    status === WorkOrderStatus.ASSIGNED ||
    status === WorkOrderStatus.IN_PROGRESS ||
    status === WorkOrderStatus.COMPLETED;

  return isNote
    ? { documentType: "Nota", documentTitle: "NOTA DE SERVICIO" }
    : { documentType: "Cotización", documentTitle: "COTIZACIÓN" };
}

/**
 * Resolves the customer-visible document identifier:
 * 1. Completed work order with N folio -> N folio (e.g. N-090926-01)
 * 2. Quote with C folio -> C folio (e.g. C-090926-01)
 * 3. Historical/null-folio record -> legacy Quote.number (e.g. 0626-001)
 */
export function resolveDocumentFolio(doc: ResolvableDocument | null | undefined): string {
  if (!doc) return "";

  // WorkOrder-shaped record
  if ("quote" in doc && doc.quote) {
    if (doc.status === WorkOrderStatus.COMPLETED && doc.folio) {
      return doc.folio;
    }
    if (doc.quote.folio) {
      return doc.quote.folio;
    }
    return doc.quote.number;
  }

  // Quote-shaped record
  if ("number" in doc) {
    if (doc.workOrder?.status === WorkOrderStatus.COMPLETED && doc.workOrder.folio) {
      return doc.workOrder.folio;
    }
    if (doc.folio) {
      return doc.folio;
    }
    return doc.number;
  }

  if ("folio" in doc && doc.folio) {
    return doc.folio;
  }

  return "";
}

/**
 * Returns the antecedent quote identifier for a completed note:
 * - If the antecedent quote has a C folio, returns C folio.
 * - Otherwise returns legacy Quote.number.
 */
export function resolveAntecedentQuoteFolio(
  input: ResolvableDocument | null | undefined,
): string {
  if (!input) return "";

  if ("quote" in input && input.quote) {
    return input.quote.folio ?? input.quote.number;
  }

  if ("number" in input) {
    return input.folio ?? input.number;
  }

  return "";
}
