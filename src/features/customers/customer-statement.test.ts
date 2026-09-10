import { describe, expect, it } from "vitest";
import {
  customerStatementHref,
  parseCustomerStatementParams,
} from "./customer-statement";

describe("Customer statement period parsing", () => {
  it("defaults to pending view with no date boundaries", () => {
    const params = parseCustomerStatementParams({}, new Date("2026-08-12T18:00:00Z"));
    expect(params.view).toBe("pending");
    expect(params.period).toBe("month");
    expect(params.start).toBeNull();
    expect(params.end).toBeNull();
    expect(params.rangeLabel).toBe("Cartera pendiente");
    expect(params.anchor).toBe("2026-08-12");
  });

  it("parses week period starting on Monday and ending next Monday in Mexico City timezone", () => {
    // 2026-08-12 is Wednesday. Monday is 2026-08-10.
    const params = parseCustomerStatementParams(
      { view: "history", period: "week", anchor: "2026-08-12" },
      new Date("2026-08-12T18:00:00Z"),
    );
    expect(params.view).toBe("history");
    expect(params.period).toBe("week");
    expect(params.start?.toISOString()).toBe("2026-08-10T06:00:00.000Z");
    expect(params.end?.toISOString()).toBe("2026-08-17T06:00:00.000Z");
    expect(params.rangeLabel).toBe("10–16 de agosto de 2026");
  });

  it("parses month period starting on 1st and ending on 1st of next month", () => {
    const params = parseCustomerStatementParams(
      { view: "history", period: "month", anchor: "2026-08" },
      new Date("2026-08-15T18:00:00Z"),
    );
    expect(params.view).toBe("history");
    expect(params.period).toBe("month");
    expect(params.start?.toISOString()).toBe("2026-08-01T06:00:00.000Z");
    expect(params.end?.toISOString()).toBe("2026-09-01T06:00:00.000Z");
    expect(params.rangeLabel).toBe("agosto de 2026");
  });

  it("parses year period starting on Jan 1 and ending Jan 1 next year", () => {
    const params = parseCustomerStatementParams(
      { view: "history", period: "year", anchor: "2026" },
      new Date("2026-08-15T18:00:00Z"),
    );
    expect(params.view).toBe("history");
    expect(params.period).toBe("year");
    expect(params.start?.toISOString()).toBe("2026-01-01T06:00:00.000Z");
    expect(params.end?.toISOString()).toBe("2027-01-01T06:00:00.000Z");
    expect(params.rangeLabel).toBe("Año 2026");
  });

  it("parses all period with null start and end", () => {
    const params = parseCustomerStatementParams(
      { view: "history", period: "all" },
      new Date("2026-08-15T18:00:00Z"),
    );
    expect(params.view).toBe("history");
    expect(params.period).toBe("all");
    expect(params.start).toBeNull();
    expect(params.end).toBeNull();
    expect(params.rangeLabel).toBe("Historial completo");
  });

  it("generates correct customerStatementHref URLs", () => {
    expect(customerStatementHref("cust-1", {})).toBe("/admin/customers/cust-1/estado-de-cuenta");
    expect(
      customerStatementHref("cust-1", { view: "history", period: "week", anchor: "2026-08-12" }),
    ).toBe("/admin/customers/cust-1/estado-de-cuenta?view=history&period=week&anchor=2026-08-12");
  });
});
