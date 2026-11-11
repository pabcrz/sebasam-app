import { describe, expect, it } from "vitest";
import type { QuoteFilterInput } from "./schemas";
import {
  buildQuoteFilterFormHref,
  quotesHref,
  parseOperationalQuoteParams,
  buildStatusFilterHref,
  formatDateValue,
  getQuoteFilterModel,
  getQuoteFilterChips,
  matchDateShortcut,
  quoteDateShortcutRange,
  removeQuoteFilterChip,
  todayInOperationalTimeZone,
} from "./quote-filter-model";

const defaults: QuoteFilterInput = { hasWorkOrder: undefined, showCancelled: false, showArchived: false };

describe("quote filter model", () => {
  it("keeps an empty model inactive and its all-status link query-free", () => {
    expect(getQuoteFilterModel(defaults, [])).toEqual({
      hasFilters: false, activeFilterSummary: [], activeChipKey: "ALL",
    });
    expect(buildStatusFilterHref(defaults, "ALL")).toBe("/admin/quotes");
  });

  it.each([true, false])("retains the explicit order filter %s without mutating input", (hasWorkOrder) => {
    const filters = Object.freeze({ ...defaults, hasWorkOrder });
    expect(getQuoteFilterModel(filters, [])).toEqual({
      hasFilters: true,
      activeFilterSummary: [hasWorkOrder ? "Con Orden" : "Sin Orden"],
      activeChipKey: "ALL",
    });
    expect(buildStatusFilterHref(filters, "APPROVED")).toBe(`/admin/quotes?status=APPROVED&hasWorkOrder=${hasWorkOrder}`);
    expect(filters).toEqual({ ...defaults, hasWorkOrder });
  });

  it("formats UTC calendar dates and preserves the empty invalid-date fallback", () => {
    expect(formatDateValue(new Date("2026-02-01T23:00:00-06:00"))).toBe("2026-02-02");
    expect(formatDateValue(new Date("invalid"))).toBe("");
    expect(formatDateValue(undefined)).toBe("");
  });

  it("preserves unknown statuses in summaries without selecting a status chip", () => {
    const filters = { ...defaults, status: "UNKNOWN" } as unknown as QuoteFilterInput;
    expect(getQuoteFilterModel(filters, [])).toEqual({
      hasFilters: true, activeFilterSummary: ["Estatus: UNKNOWN"], activeChipKey: "ALL",
    });
  });

  it("keeps form entry order, trimming, duplicate replacement and non-string omission", () => {
    expect(buildQuoteFilterFormHref([
      ["number", " old "], ["plate", "   "], ["number", " C-001 "],
      ["hasWorkOrder", "false"], ["attachment", { name: "ignored" }],
    ])).toBe("/admin/quotes?number=C-001&hasWorkOrder=false");
    expect(buildQuoteFilterFormHref([])).toBe("/admin/quotes?");
  });
});


describe("operational quote URLs", () => {
  it("preserves every effective criterion and page while dropping unrelated fields", () => {
    const state = parseOperationalQuoteParams({ number: " C-42 ", concept: "aceite", customerId: "c", plate: "ABC", economicNumber: "ECO", kind: "SALE", dateFrom: "2026-08-01", dateTo: "2026-08-31", hasWorkOrder: "false", showArchived: "true", showCancelled: "false", status: "APPROVED", page: "2", assignee: "workshop", payment: "paid" });
    expect(Object.fromEntries(new URL(quotesHref(state), "https://example.test").searchParams)).toEqual({ number: "C-42", concept: "aceite", customerId: "c", plate: "ABC", economicNumber: "ECO", dateFrom: "2026-08-01", dateTo: "2026-08-31", showArchived: "true", kind: "SALE", status: "APPROVED", hasWorkOrder: "false", page: "2" });
    expect(parseOperationalQuoteParams(Object.fromEntries(new URL(quotesHref(state), "https://example.test").searchParams))).toEqual(state);
  });
});

describe("quote date shortcuts", () => {
  it("reads today in the operational time zone, not UTC", () => {
    // 2026-11-11 03:00 UTC is still 2026-11-10 21:00 in Mexico City (UTC-6).
    expect(todayInOperationalTimeZone(new Date("2026-11-11T03:00:00Z"))).toBe("2026-11-10");
  });

  it.each([
    ["today", "2026-11-11", { dateFrom: "2026-11-11", dateTo: "2026-11-11" }],
    ["week", "2026-11-11", { dateFrom: "2026-11-09", dateTo: "2026-11-15" }],
    ["week", "2026-11-15", { dateFrom: "2026-11-09", dateTo: "2026-11-15" }],
    ["month", "2026-11-11", { dateFrom: "2026-11-01", dateTo: "2026-11-30" }],
    ["previousMonth", "2026-10-05", { dateFrom: "2026-09-01", dateTo: "2026-09-30" }],
    ["previousMonth", "2026-01-15", { dateFrom: "2025-12-01", dateTo: "2025-12-31" }],
  ] as const)("%s from %s covers Monday-to-Sunday weeks and whole calendar months", (shortcut, today, range) => {
    expect(quoteDateShortcutRange(shortcut, today)).toEqual(range);
  });

  it("recognizes a range that equals a shortcut and leaves custom ranges unnamed", () => {
    const today = "2026-11-11";
    const month = quoteDateShortcutRange("month", today);
    expect(matchDateShortcut({ dateFrom: new Date(month.dateFrom), dateTo: new Date(month.dateTo) }, today)).toBe("month");
    expect(matchDateShortcut({ dateFrom: new Date("2026-11-02T00:00:00Z"), dateTo: new Date("2026-11-05T00:00:00Z") }, today)).toBeUndefined();
  });
});

describe("quote filter chips", () => {
  const today = "2026-11-11";
  const customers = [{ id: "cust-1", name: "Constructora del Norte" }];

  it("names every legacy criterion as a removable chip and never names the status, which the tabs show", () => {
    const state = parseOperationalQuoteParams({ number: "C-001", customerId: "cust-1", plate: "ABC-123", economicNumber: "ECO-42", concept: "aceite", kind: "SALE", hasWorkOrder: "false", dateFrom: "2026-11-01", dateTo: "2026-11-30", status: "DRAFT", showArchived: "true" });
    expect(getQuoteFilterChips(state, customers, today)).toEqual([
      { id: "number", label: "Folio: C-001" },
      { id: "dates", label: "Fecha: Este mes" },
      { id: "hasWorkOrder", label: "Sin orden de trabajo" },
      { id: "kind", label: "Tipo: Venta" },
      { id: "customerId", label: "Cliente: Constructora del Norte" },
      { id: "concept", label: "Concepto: aceite" },
      { id: "plate", label: "Placas: ABC-123" },
      { id: "economicNumber", label: "ECO: ECO-42" },
    ]);
  });

  it("keeps the explicit cancelled and archived inclusions reachable only while all statuses are shown", () => {
    const all = parseOperationalQuoteParams({ showCancelled: "true", showArchived: "true" });
    expect(getQuoteFilterChips(all, customers, today)).toEqual([
      { id: "showCancelled", label: "Incluye canceladas" },
      { id: "showArchived", label: "Incluye archivadas" },
    ]);
    const statusSelected = parseOperationalQuoteParams({ status: "ARCHIVED", showCancelled: "true" });
    expect(getQuoteFilterChips(statusSelected, customers, today)).toEqual([]);
  });

  it("shows a date range as the shortcut name when it matches, otherwise as explicit dates", () => {
    expect(getQuoteFilterChips(parseOperationalQuoteParams({ dateFrom: "2026-11-02", dateTo: "2026-11-05" }), customers, today)).toEqual([
      { id: "dates", label: "Fecha: 2026-11-02 – 2026-11-05" },
    ]);
    expect(getQuoteFilterChips(parseOperationalQuoteParams({ dateFrom: "2026-11-02" }), customers, today)).toEqual([
      { id: "dates", label: "Desde: 2026-11-02" },
    ]);
  });

  it("removes one criterion, resets pagination and keeps the status and the other criteria", () => {
    const state = parseOperationalQuoteParams({ status: "APPROVED", number: "C-001", kind: "WORK", dateFrom: "2026-11-01", dateTo: "2026-11-30", page: "4" });
    const next = removeQuoteFilterChip(state, "kind");
    expect(quotesHref(next)).toBe("/admin/quotes?number=C-001&dateFrom=2026-11-01&dateTo=2026-11-30&status=APPROVED");
    expect(quotesHref(removeQuoteFilterChip(state, "dates"))).toBe("/admin/quotes?number=C-001&kind=WORK&status=APPROVED");
  });
});
