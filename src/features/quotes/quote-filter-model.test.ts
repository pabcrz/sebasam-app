import { describe, expect, it } from "vitest";
import type { QuoteFilterInput } from "./schemas";
import {
  buildQuoteFilterFormHref,
  quotesHref,
  parseOperationalQuoteParams,
  buildStatusFilterHref,
  formatDateValue,
  getQuoteFilterModel,
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
