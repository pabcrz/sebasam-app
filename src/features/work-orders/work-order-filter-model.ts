import type { Prisma } from "@/generated/prisma/client";
import { operationalQuoteFilterSchema } from "@/features/quotes/schemas";
import { localDateToMexicoCityInstant } from "@/features/quotes/lib/operational-date";

export type OperationalFilterOptions = { operationalFilters?: boolean };
export type FilterParams = Record<string, unknown>;
const commonSchema = operationalQuoteFilterSchema.pick({ number: true, concept: true, customerId: true, plate: true, economicNumber: true, dateFrom: true, dateTo: true, showArchived: true, showCancelled: true });
const commonKeys = Object.keys(commonSchema.shape);

export function parsePage(value: unknown) {
  const page = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return typeof page === "number" && Number.isSafeInteger(page) && page > 0 && page <= Math.floor(Number.MAX_SAFE_INTEGER / 20) ? page : 1;
}

export function normalizeResponsible(value: unknown): string {
  if (value === "workshop") return value;
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value.toLowerCase() : "all";
}

export function dateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Calendar bounds are inclusive in URLs, half-open in queries; never add 24h across DST. */
export function dateBounds(from?: Date, to?: Date, instant = false) {
  function boundary(date: Date, nextDay: boolean) {
    const value = new Date(date);
    if (nextDay) value.setUTCDate(value.getUTCDate() + 1);
    return instant ? localDateToMexicoCityInstant(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate(), 0, 0, 0) : value;
  }
  return { ...(from ? { gte: boundary(from, false) } : {}), ...(to ? { lt: boundary(to, true) } : {}) };
}

export function parseCommonOperationalFilters(input: FilterParams) {
  const values = Object.fromEntries(commonKeys.map((key) => {
    const value = input[key];
    return [key, value instanceof Date ? dateValue(value) : key.startsWith("show") ? value === true || value === "true" : typeof value === "string" ? value : undefined];
  }));
  const parsed = commonSchema.parse(values);
  if (parsed.dateFrom && parsed.dateTo && parsed.dateFrom > parsed.dateTo) throw new RangeError("dateFrom must not be after dateTo.");
  return parsed;
}

export type CommonOperationalFilters = ReturnType<typeof parseCommonOperationalFilters>;

export function commonFilterParams(filters: CommonOperationalFilters) {
  const params = new URLSearchParams();
  for (const key of commonKeys) {
    const value = filters[key as keyof CommonOperationalFilters];
    if (value instanceof Date) params.set(key, dateValue(value));
    else if (value === true) params.set(key, "true");
    else if (typeof value === "string" && value) params.set(key, value);
  }
  return params;
}

/** Shared relational criteria; SQL Notes adapters mirror these before aggregation. */
export function operationalQuoteWhere(filters: CommonOperationalFilters): Prisma.QuoteWhereInput {
  const and: Prisma.QuoteWhereInput[] = [];
  const contains = (value: string) => ({ contains: value, mode: "insensitive" as const });
  if (filters.number) and.push({ OR: [{ number: contains(filters.number) }, { folio: contains(filters.number) }] });
  if (filters.concept) and.push({ OR: [{ title: contains(filters.concept) }, { description: contains(filters.concept) }, { items: { some: { description: contains(filters.concept) } } }] });
  for (const key of ["plate", "economicNumber"] as const) {
    const value = filters[key];
    if (value) and.push({ OR: [{ vehicle: { [key]: contains(value) } }, { vehicleSnapshot: { path: [key], string_contains: value, mode: "insensitive" } }] });
  }
  return {
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
    ...(filters.dateFrom || filters.dateTo ? { operationalDate: dateBounds(filters.dateFrom, filters.dateTo) } : {}),
    ...(and.length ? { AND: and } : {}),
  };
}

export function parseWorkOrderParams(input: FilterParams) {
  // Archive/cancellation visibility is inapplicable to the active-only execution queue.
  const common = parseCommonOperationalFilters({ ...input, showArchived: false, showCancelled: false });
  const scheduled = parseCommonOperationalFilters({ dateFrom: input.scheduledFrom });
  const scheduledTo = parseCommonOperationalFilters({ dateTo: input.scheduledTo }).dateTo;
  if (scheduled.dateFrom && scheduledTo && scheduled.dateFrom > scheduledTo) throw new RangeError("scheduledFrom must not be after scheduledTo.");
  const execution: "PLANNED" | "ASSIGNED" | "IN_PROGRESS" | undefined = input.execution === "PLANNED" || input.execution === "ASSIGNED" || input.execution === "IN_PROGRESS" ? input.execution : undefined;
  return { ...common, execution, assignee: normalizeResponsible(input.assignee), scheduledFrom: scheduled.dateFrom, scheduledTo, page: parsePage(input.page) };
}

export function workOrdersHref(state: ReturnType<typeof parseWorkOrderParams>) {
  const filters = parseWorkOrderParams(state);
  const params = commonFilterParams(filters);
  if (filters.execution) params.set("execution", filters.execution);
  if (filters.assignee !== "all") params.set("assignee", filters.assignee);
  if (filters.scheduledFrom) params.set("scheduledFrom", dateValue(filters.scheduledFrom));
  if (filters.scheduledTo) params.set("scheduledTo", dateValue(filters.scheduledTo));
  if (filters.page > 1) params.set("page", String(filters.page));
  return `/admin/work-orders${params.size ? `?${params}` : ""}`;
}
