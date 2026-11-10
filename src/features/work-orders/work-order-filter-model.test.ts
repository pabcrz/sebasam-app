import { describe, expect, it } from "vitest";
import { parseWorkOrderParams, workOrdersHref } from "./work-order-filter-model";

describe("operational work-order filters", () => {
  it("round-trips combined criteria and page without commercial or sale-only fields", () => {
    const input = { number: " OT-42 ", concept: " aceite ", customerId: "cust-1", plate: "ABC", economicNumber: "ECO", dateFrom: "2026-08-01", dateTo: "2026-08-31", execution: "PLANNED", assignee: "workshop", scheduledFrom: "2026-09-01", scheduledTo: "2026-09-02", page: "2", kind: "SALE", payment: "paid", showArchived: "true" };
    const filters = parseWorkOrderParams(input);
    const url = new URL(workOrdersHref(filters), "https://example.test");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      number: "OT-42", concept: "aceite", customerId: "cust-1", plate: "ABC", economicNumber: "ECO", dateFrom: "2026-08-01", dateTo: "2026-08-31", execution: "PLANNED", assignee: "workshop", scheduledFrom: "2026-09-01", scheduledTo: "2026-09-02", page: "2",
    });
    expect(parseWorkOrderParams(Object.fromEntries(url.searchParams))).toEqual(filters);
  });

  it("normalizes invalid execution, responsible, dates and unsafe page without admitting terminal work", () => {
    expect(workOrdersHref(parseWorkOrderParams({ execution: "COMPLETED", assignee: "bad", dateFrom: "2026-02-30", page: "9007199254740992" }))).toBe("/admin/work-orders");
    expect(() => parseWorkOrderParams({ dateFrom: "2026-09-02", dateTo: "2026-09-01" })).toThrow("dateFrom must not be after dateTo");
    expect(() => parseWorkOrderParams({ scheduledFrom: "2026-09-02", scheduledTo: "2026-09-01" })).toThrow("scheduledFrom must not be after scheduledTo");
  });
});
