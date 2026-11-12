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

/** Shortcuts for the sheet's date choice; weeks run Monday to Sunday. */
export const quoteDateShortcuts = ["today", "week", "month", "previousMonth"] as const;
export type QuoteDateShortcut = (typeof quoteDateShortcuts)[number];

export const quoteDateShortcutLabels: Record<QuoteDateShortcut, string> = {
  today: "Hoy",
  week: "Esta semana",
  month: "Este mes",
  previousMonth: "Mes pasado",
};

export type QuoteFilterState = ReturnType<typeof parseOperationalQuoteParams>;

export type QuoteFilterChipId =
  | "number"
  | "dates"
  | "hasWorkOrder"
  | "kind"
  | "customerId"
  | "concept"
  | "plate"
  | "economicNumber"
  | "showCancelled"
  | "showArchived";

export type QuoteFilterChip = { id: QuoteFilterChipId; label: string };

/** Calendar day in the operational time zone as YYYY-MM-DD, independent of the server or browser zone. */
export function todayInOperationalTimeZone(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function shiftDateValue(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function monthRange(value: string, monthOffset: number) {
  const [year, month] = value.split("-").map(Number);
  return {
    dateFrom: new Date(Date.UTC(year, month - 1 + monthOffset, 1)).toISOString().slice(0, 10),
    dateTo: new Date(Date.UTC(year, month + monthOffset, 0)).toISOString().slice(0, 10),
  };
}

export function quoteDateShortcutRange(shortcut: QuoteDateShortcut, today: string): { dateFrom: string; dateTo: string } {
  if (shortcut === "today") return { dateFrom: today, dateTo: today };
  if (shortcut === "month") return monthRange(today, 0);
  if (shortcut === "previousMonth") return monthRange(today, -1);
  const [year, month, day] = today.split("-").map(Number);
  const daysSinceMonday = (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
  return { dateFrom: shiftDateValue(today, -daysSinceMonday), dateTo: shiftDateValue(today, 6 - daysSinceMonday) };
}

export function matchDateShortcut(range: { dateFrom?: Date; dateTo?: Date }, today: string): QuoteDateShortcut | undefined {
  const from = formatDateValue(range.dateFrom);
  const to = formatDateValue(range.dateTo);
  if (!from || !to) return undefined;
  return quoteDateShortcuts.find((shortcut) => {
    const expected = quoteDateShortcutRange(shortcut, today);
    return expected.dateFrom === from && expected.dateTo === to;
  });
}

/**
 * Removable chips for every criterion except the status, which the tabs already show.
 * The explicit cancelled/archived inclusions only exist while no status is selected.
 */
export function getQuoteFilterChips(filters: QuoteFilterState, customers: QuoteFiltersCustomer[], today: string): QuoteFilterChip[] {
  const chips: QuoteFilterChip[] = [];
  if (filters.number) chips.push({ id: "number", label: `Folio: ${filters.number}` });
  if (filters.dateFrom || filters.dateTo) {
    const shortcut = matchDateShortcut(filters, today);
    const from = formatDateValue(filters.dateFrom);
    const to = formatDateValue(filters.dateTo);
    let label = `Desde: ${from}`;
    if (shortcut) label = `Fecha: ${quoteDateShortcutLabels[shortcut]}`;
    else if (from && to) label = `Fecha: ${from} – ${to}`;
    else if (!from) label = `Hasta: ${to}`;
    chips.push({ id: "dates", label });
  }
  if (filters.hasWorkOrder !== undefined) chips.push({ id: "hasWorkOrder", label: filters.hasWorkOrder ? "Con orden de trabajo" : "Sin orden de trabajo" });
  if (filters.kind !== "all") chips.push({ id: "kind", label: `Tipo: ${filters.kind === "WORK" ? "Trabajo" : "Venta"}` });
  if (filters.customerId) chips.push({ id: "customerId", label: `Cliente: ${customers.find((customer) => customer.id === filters.customerId)?.name ?? filters.customerId}` });
  if (filters.concept) chips.push({ id: "concept", label: `Concepto: ${filters.concept}` });
  if (filters.plate) chips.push({ id: "plate", label: `Placas: ${filters.plate}` });
  if (filters.economicNumber) chips.push({ id: "economicNumber", label: `ECO: ${filters.economicNumber}` });
  if (!filters.status && filters.showCancelled) chips.push({ id: "showCancelled", label: "Incluye canceladas" });
  if (!filters.status && filters.showArchived) chips.push({ id: "showArchived", label: "Incluye archivadas" });
  return chips;
}

/** Clears one criterion and returns to the first page; the status and every other criterion stay. */
export function removeQuoteFilterChip(state: QuoteFilterState, id: QuoteFilterChipId): QuoteFilterState {
  const next: QuoteFilterState = { ...state, page: 1 };
  switch (id) {
    case "number": return { ...next, number: undefined };
    case "dates": return { ...next, dateFrom: undefined, dateTo: undefined };
    case "hasWorkOrder": return { ...next, hasWorkOrder: undefined };
    case "kind": return { ...next, kind: "all" };
    case "customerId": return { ...next, customerId: undefined };
    case "concept": return { ...next, concept: undefined };
    case "plate": return { ...next, plate: undefined };
    case "economicNumber": return { ...next, economicNumber: undefined };
    case "showCancelled": return { ...next, showCancelled: false };
    case "showArchived": return { ...next, showArchived: false };
  }
}
