import { commonFilterParams, parseCommonOperationalFilters, parsePage, type FilterParams } from "@/features/work-orders/work-order-filter-model";
import type { QuoteStatus } from "@/generated/prisma/client";
import { operationalQuoteFilterSchema, type QuoteFilterInput } from "./schemas";

export const quoteStatusLabels: Record<QuoteStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  APPROVED: "Aceptada",
  REJECTED: "Declinada",
  CANCELLED: "Cancelada",
  ARCHIVED: "Archivada",
};

export const statusChips: Array<{ key: QuoteStatus | "ALL"; label: string }> = [
  { key: "ALL", label: "Todas" },
  { key: "DRAFT", label: "Borrador" },
  { key: "SENT", label: "Enviadas" },
  { key: "APPROVED", label: "Aceptadas" },
  { key: "REJECTED", label: "Declinadas" },
  { key: "CANCELLED", label: "Canceladas" },
  { key: "ARCHIVED", label: "Archivadas" },
];

export type QuoteFiltersCustomer = {
  id: string;
  name: string;
};

export function formatDateValue(date: Date | undefined): string {
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function isQuoteStatus(value: string): value is QuoteStatus {
  return Object.prototype.hasOwnProperty.call(quoteStatusLabels, value);
}

function getActiveFilterSummary(filters: QuoteFilterInput, customers: QuoteFiltersCustomer[]): string[] {
  const summary: string[] = [];
  const customer = customers.find((item) => item.id === filters.customerId);

  if (filters.status) {
    summary.push(`Estatus: ${isQuoteStatus(filters.status) ? quoteStatusLabels[filters.status] : filters.status}`);
  }
  if (filters.customerId) summary.push(`Cliente: ${customer?.name ?? filters.customerId}`);
  if (filters.number) summary.push(`Folio: ${filters.number}`);
  if (filters.plate) summary.push(`Placas: ${filters.plate}`);
  if (filters.dateFrom) summary.push(`Desde: ${formatDateValue(filters.dateFrom)}`);
  if (filters.dateTo) summary.push(`Hasta: ${formatDateValue(filters.dateTo)}`);
  if (filters.hasWorkOrder === true) summary.push("Con Orden");
  if (filters.hasWorkOrder === false) summary.push("Sin Orden");
  if (filters.showCancelled) summary.push("Mostrar canceladas");
  if (filters.showArchived) summary.push("Mostrar archivadas");

  return summary;
}

export function buildStatusFilterHref(currentFilters: QuoteFilterInput, targetStatus: QuoteStatus | "ALL"): string {
  const params = new URLSearchParams();

  if (targetStatus !== "ALL") {
    params.set("status", targetStatus);
  }

  if (currentFilters.customerId) params.set("customerId", currentFilters.customerId);
  if (currentFilters.number) params.set("number", currentFilters.number);
  if (currentFilters.plate) params.set("plate", currentFilters.plate);
  if (currentFilters.dateFrom) params.set("dateFrom", formatDateValue(currentFilters.dateFrom));
  if (currentFilters.dateTo) params.set("dateTo", formatDateValue(currentFilters.dateTo));
  if (currentFilters.hasWorkOrder !== undefined) params.set("hasWorkOrder", String(currentFilters.hasWorkOrder));

  const query = params.toString();
  return query ? `/admin/quotes?${query}` : "/admin/quotes";
}

export function getQuoteFilterModel(filters: QuoteFilterInput, customers: QuoteFiltersCustomer[]) {
  const hasFilters =
    Boolean(filters.status) ||
    Boolean(filters.customerId) ||
    Boolean(filters.number) ||
    Boolean(filters.plate) ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo) ||
    filters.hasWorkOrder !== undefined ||
    filters.showCancelled ||
    filters.showArchived;
  const activeFilterSummary = getActiveFilterSummary(filters, customers);

  const activeChipKey: QuoteStatus | "ALL" = filters.status && isQuoteStatus(filters.status)
    ? filters.status
    : filters.showCancelled && !filters.showArchived
      ? "CANCELLED"
      : filters.showArchived && !filters.showCancelled
        ? "ARCHIVED"
        : "ALL";

  return { hasFilters, activeFilterSummary, activeChipKey };
}

export function buildQuoteFilterFormHref(entries: Iterable<[string, unknown]>): string {
  const params = new URLSearchParams();

  for (const [key, value] of entries) {
    if (typeof value === "string" && value.trim() !== "") {
      params.set(key, value.trim());
    }
  }

  return `/admin/quotes?${params.toString()}`;
}


/** Additive queue contract; legacy form/chip URLs remain unchanged until UI migration. */
export function parseOperationalQuoteParams(input: FilterParams) {
  const common = parseCommonOperationalFilters(input);
  const status = typeof input.status === "string" && isQuoteStatus(input.status) ? input.status : undefined;
  const kind = operationalQuoteFilterSchema.shape.kind.parse(input.kind) ?? "all";
  const hasWorkOrder = input.hasWorkOrder === true || input.hasWorkOrder === "true" ? true : input.hasWorkOrder === false || input.hasWorkOrder === "false" ? false : undefined;
  return { ...common, status, kind, hasWorkOrder, page: parsePage(input.page) };
}

export function quotesHref(state: ReturnType<typeof parseOperationalQuoteParams>) {
  const filters = parseOperationalQuoteParams(state);
  const params = commonFilterParams(filters);
  if (filters.kind !== "all") params.set("kind", filters.kind);
  if (filters.status) params.set("status", filters.status);
  if (filters.hasWorkOrder !== undefined) params.set("hasWorkOrder", String(filters.hasWorkOrder));
  if (filters.page > 1) params.set("page", String(filters.page));
  return `/admin/quotes${params.size ? `?${params}` : ""}`;
}
