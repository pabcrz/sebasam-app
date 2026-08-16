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
});
