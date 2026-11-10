import { describe, expect, it } from "vitest";
import { notasHref, parseNotasParams } from "./notas-period";

describe("Notas periods", () => {
  it("defaults to All for the current Monday-through-Saturday week", () => {
    const value = parseNotasParams({}, new Date("2026-08-12T18:00:00Z"));
    expect(value).toMatchObject({
      mode: "week",
      payment: "all",
      assignee: "all",
      page: 1,
      anchor: "2026-08-12",
      rangeLabel: "10–15 de agosto de 2026",
      isCurrentWeek: true,
    });
    expect(value.start.toISOString()).toBe("2026-08-10T06:00:00.000Z");
    expect(value.end.toISOString()).toBe("2026-08-16T06:00:00.000Z");
    const sunday = parseNotasParams({ anchor: "2026-08-16" });
    expect(sunday.start.toISOString()).toBe("2026-08-10T06:00:00.000Z");
    expect(sunday.end.toISOString()).toBe("2026-08-16T06:00:00.000Z");
  });

  it("identifies only the current Mexico City business week", () => {
    const beforeMonday = new Date("2026-08-10T05:30:00Z");
    const afterMonday = new Date("2026-08-10T06:30:00Z");

    expect(parseNotasParams({ anchor: "2026-08-03" }, beforeMonday).isCurrentWeek).toBe(true);
    expect(parseNotasParams({ anchor: "2026-08-10" }, beforeMonday).isCurrentWeek).toBe(false);
    expect(parseNotasParams({ anchor: "2026-08-10" }, afterMonday).isCurrentWeek).toBe(true);
    expect(parseNotasParams({ anchor: "2026-08-03" }, afterMonday).isCurrentWeek).toBe(false);
    expect(parseNotasParams({ anchor: "2026-08-17" }, afterMonday).isCurrentWeek).toBe(false);
    expect(parseNotasParams({ mode: "month", anchor: "2026-08" }, afterMonday).isCurrentWeek).toBe(false);
  });

  it("normalizes invalid payment filters to All", () => {
    expect(parseNotasParams({ payment: "overdue" }).payment).toBe("all");
    expect(parseNotasParams({ payment: "pending" }).payment).toBe("pending");
  });

  it("canonicalizes an assignee UUID and normalizes invalid values to all", () => {
    expect(parseNotasParams({ assignee: "A0B1C2D3-1234-4ABC-8DEF-1234567890AB" }).assignee).toBe("a0b1c2d3-1234-4abc-8def-1234567890ab");
    expect(parseNotasParams({ assignee: "workshop" }).assignee).toBe("workshop");
    expect(parseNotasParams({ assignee: "helper" }).assignee).toBe("all");
  });

  it("uses inclusive/exclusive month boundaries at Mexico City midnight", () => {
    const value = parseNotasParams({ mode: "month", anchor: "2026-04", payment: "paid" });
    expect(value.start.toISOString()).toBe("2026-04-01T06:00:00.000Z");
    expect(value.end.toISOString()).toBe("2026-05-01T06:00:00.000Z");
    expect(value.rangeLabel).toBe("abril de 2026");
    const historicalDst = parseNotasParams({ mode: "month", anchor: "2021-04" });
    expect(historicalDst.start.toISOString()).toBe("2021-04-01T06:00:00.000Z");
    expect(historicalDst.end.toISOString()).toBe("2021-05-01T05:00:00.000Z");
  });

  it("preserves mode, anchor, payment, and assignee while omitting page one", () => {
    expect(notasHref({ mode: "month", anchor: "2026-08-12", payment: "paid", assignee: "workshop", page: 1 })).toBe("/admin/notas?mode=month&anchor=2026-08&payment=paid&assignee=workshop");
    expect(notasHref({ mode: "week", anchor: "2026-08-12", payment: "pending", assignee: "A0B1C2D3-1234-4ABC-8DEF-1234567890AB", page: 2 })).toBe("/admin/notas?mode=week&anchor=2026-08-12&payment=pending&assignee=a0b1c2d3-1234-4abc-8def-1234567890ab&page=2");
  });

  it("parses and serializes customerId and overdue params", () => {
    const parsed = parseNotasParams({ customerId: "cust-99", overdue: "overdue" });
    expect(parsed.customerId).toBe("cust-99");
    expect(parsed.overdue).toBe("overdue");

    const invalid = parseNotasParams({ customerId: "   ", overdue: "invalid-value" });
    expect(invalid.customerId).toBeUndefined();
    expect(invalid.overdue).toBe("all");

    const href = notasHref({
      mode: "week",
      anchor: "2026-08-12",
      payment: "all",
      assignee: "all",
      customerId: "cust-99",
      overdue: "overdue",
    });
    expect(href).toContain("customerId=cust-99");
    expect(href).toContain("overdue=overdue");
  });

  it.each(["all", "WORK", "SALE"] as const)("round-trips the %s note type selector", (kind) => {
    const parsed = parseNotasParams({ kind });
    expect(parsed.kind).toBe(kind);

    const href = notasHref({
      mode: "week",
      anchor: "2026-08-12",
      payment: "pending",
      assignee: "all",
      kind,
    });
    expect(new URL(href, "https://example.test").searchParams.get("kind")).toBe(kind);
  });
});


describe("opt-in operational Notes contract", () => {
  it.each(["all", "SALE", "WORK"] as const)("reconciles responsible with %s explicitly and round-trips all effective criteria", (kind) => {
    const filters = parseNotasParams({ kind, assignee: "workshop", number: "N-42", concept: "aceite", plate: "ABC", economicNumber: "ECO", customerId: "c", dateFrom: "2026-08-01", dateTo: "2026-08-31", showArchived: "true", showCancelled: "false", page: "2", anchor: "2026-08-12" }, new Date("2026-08-12"), { operationalFilters: true });
    expect(filters.assignee).toBe(kind === "WORK" ? "workshop" : "all");
    const url = new URL(notasHref(filters, { operationalFilters: true }), "https://example.test");
    expect(url.searchParams.get("assignee")).toBe(kind === "WORK" ? "workshop" : null);
    for (const key of ["number", "concept", "plate", "economicNumber", "customerId", "dateFrom", "dateTo", "showArchived", "page"]) expect(url.searchParams.has(key)).toBe(true);
    expect(url.searchParams.has("showCancelled")).toBe(false);
    expect(parseNotasParams(Object.fromEntries(url.searchParams), new Date("2026-08-12"), { operationalFilters: true })).toEqual(filters);
  });
});


describe("operational Notes payment and input boundaries", () => {
  it("offers partial collection only in the opt-in contract without changing legacy defaults or the period", () => {
    const input = { payment: "partial", anchor: "2026-08-12", page: "9007199254740992", showArchived: "false" };
    const legacy = parseNotasParams(input, new Date("2026-08-12"));
    const filters = parseNotasParams(input, new Date("2026-08-12"), { operationalFilters: true });
    expect(legacy.payment).toBe("all");
    expect(filters).toMatchObject({ payment: "partial", page: 1, showArchived: false, start: legacy.start, end: legacy.end });
    expect(notasHref(filters, { operationalFilters: true })).toContain("payment=partial");
  });
});
