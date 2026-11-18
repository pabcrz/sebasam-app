import { describe, expect, it } from "vitest";
import {
  filterCustomerRows,
  filterUnits,
  findSearchMatch,
  summarizeUnits,
  unitIdentity,
  unitsWindow,
  type CustomerListRow,
  type CustomerUnit,
} from "./customer-list";

function unit(overrides: Partial<CustomerUnit> = {}): CustomerUnit {
  return {
    id: "veh-1",
    economicNumber: null,
    plate: null,
    brand: null,
    model: null,
    year: null,
    inWorkshop: false,
    ...overrides,
  };
}

function row(overrides: Partial<CustomerListRow> = {}): CustomerListRow {
  return {
    id: "cust-1",
    name: "Constructora del Norte",
    commercialName: null,
    status: "ACTIVE",
    pendingBalanceCents: 0,
    vehicles: [],
    contacts: [],
    ...overrides,
  };
}

describe("filterCustomerRows", () => {
  const rows = [
    row({ id: "settled" }),
    row({ id: "owes", pendingBalanceCents: 450000 }),
    row({ id: "inactive", status: "INACTIVE" }),
  ];

  it("keeps every customer for Todos", () => {
    expect(filterCustomerRows(rows, "all").map((r) => r.id)).toEqual(["settled", "owes", "inactive"]);
  });

  it("keeps only customers with a pending balance for Con saldo", () => {
    expect(filterCustomerRows(rows, "withBalance").map((r) => r.id)).toEqual(["owes"]);
  });

  it("keeps only inactive customers for Inactivos", () => {
    expect(filterCustomerRows(rows, "inactive").map((r) => r.id)).toEqual(["inactive"]);
  });
});

describe("unitIdentity", () => {
  it("names a unit with ECO and model when both exist", () => {
    expect(unitIdentity(unit({ economicNumber: "118", brand: "Kenworth", model: "T800" }))).toBe("ECO 118 · Kenworth T800");
  });

  it("falls back to plates and model when there is no ECO", () => {
    expect(unitIdentity(unit({ plate: "ABC-123", brand: "Ford", model: "F-150" }))).toBe("ABC-123 · Ford F-150");
  });

  it("uses the model alone when there is no ECO or plates, without the year", () => {
    expect(unitIdentity(unit({ brand: "Chevrolet", model: "350", year: 2005 }))).toBe("Chevrolet 350");
  });

  it("returns null instead of a filler label when there is nothing to name", () => {
    expect(unitIdentity(unit())).toBeNull();
  });
});

describe("summarizeUnits", () => {
  it("shows at most two units, workshop ones first, and counts the rest", () => {
    const units = [
      unit({ id: "a", economicNumber: "1" }),
      unit({ id: "b", economicNumber: "2", inWorkshop: true }),
      unit({ id: "c", economicNumber: "3" }),
    ];

    const summary = summarizeUnits(units);

    expect(summary.shown.map((u) => u.id)).toEqual(["b", "a"]);
    expect(summary.hiddenCount).toBe(1);
  });

  it("keeps the given order (most recent first) when no unit is in the workshop", () => {
    const units = [unit({ id: "new" }), unit({ id: "old" })];

    expect(summarizeUnits(units)).toEqual({ shown: units, hiddenCount: 0 });
  });
});

describe("findSearchMatch", () => {
  const customer = row({
    vehicles: [unit({ id: "v-118", economicNumber: "118", brand: "Kenworth", model: "T800", plate: "LX-5520" })],
    contacts: [{ name: "Juan Pérez", role: "DRIVER" }],
  });

  it("names the unit whose ECO matches", () => {
    expect(findSearchMatch(customer, "118")).toBe("ECO 118 · Kenworth T800");
  });

  it("names the unit whose plates match, ignoring case, with the unit's own identity", () => {
    expect(findSearchMatch(customer, "lx-55")).toBe("ECO 118 · Kenworth T800");
  });

  it("names the driver when a driver contact matches", () => {
    expect(findSearchMatch(customer, "juan")).toBe("Chofer Juan Pérez");
  });

  it("returns null when the query matches nothing in the unit or driver data", () => {
    expect(findSearchMatch(customer, "norte")).toBeNull();
  });

  it("returns null for an empty query", () => {
    expect(findSearchMatch(customer, "  ")).toBeNull();
  });
});

describe("unit panel rules", () => {
  const units = [
    unit({ id: "a", economicNumber: "118", brand: "Kenworth", model: "T800", inWorkshop: true }),
    unit({ id: "b", plate: "LX-5520", brand: "Isuzu", model: "ELF" }),
    unit({ id: "c", economicNumber: "042", brand: "International", model: "4400" }),
  ];

  it("filters by ECO or plates as the user types", () => {
    expect(filterUnits(units, { query: "042", inWorkshopOnly: false, withoutEco: false }).map((u) => u.id)).toEqual(["c"]);
    expect(filterUnits(units, { query: "lx-55", inWorkshopOnly: false, withoutEco: false }).map((u) => u.id)).toEqual(["b"]);
  });

  it("applies the En taller and Sin ECO quick filters", () => {
    expect(filterUnits(units, { query: "", inWorkshopOnly: true, withoutEco: false }).map((u) => u.id)).toEqual(["a"]);
    expect(filterUnits(units, { query: "", inWorkshopOnly: false, withoutEco: true }).map((u) => u.id)).toEqual(["b"]);
  });

  it("shows every unit up to eight, and four with a Ver todas control above eight", () => {
    const eight = Array.from({ length: 8 }, (_, index) => unit({ id: `u-${index}` }));
    const nine = Array.from({ length: 9 }, (_, index) => unit({ id: `u-${index}` }));

    expect(unitsWindow(eight, false)).toEqual({ visible: eight, canExpand: false });
    expect(unitsWindow(nine, false)).toEqual({ visible: nine.slice(0, 4), canExpand: true });
    expect(unitsWindow(nine, true)).toEqual({ visible: nine, canExpand: true });
  });
});
