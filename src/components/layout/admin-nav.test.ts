import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_NAV_ITEMS,
  RAIL_EXPANDED_STORAGE_KEY,
  getActiveNavHref,
  getAdminNav,
  readRailExpanded,
  writeRailExpanded,
} from "./admin-nav";

const barHrefs = ["/admin", "/admin/quotes", "/admin/work-orders", "/admin/notas"];

describe("getAdminNav", () => {
  it.each(["ADMIN", "SUPER_ADMIN", "ADMIN_ASSISTANT", "WORKER"])(
    "uses the same four primary bar destinations for %s",
    (role) => {
      const nav = getAdminNav(role);

      expect(nav.bar.map((item) => item.href)).toEqual(barHrefs);
      expect(nav.bar.map((item) => item.label)).toEqual(["Inicio", "Cotizaciones", "Trabajos", "Notas"]);
    },
  );

  it("filters the Más sheet for ADMIN to the patron destinations", () => {
    const nav = getAdminNav("ADMIN");

    expect(nav.sheet.map((group) => group.title)).toEqual(["Operación"]);
    expect(nav.sheet[0].items.map((item) => item.href)).toEqual(["/admin/customers", "/admin/nomina"]);
  });

  it("adds workers, tools and administration to the Más sheet for SUPER_ADMIN", () => {
    const nav = getAdminNav("SUPER_ADMIN");

    expect(nav.sheet.map((group) => group.title)).toEqual(["Operación", "Herramientas", "Administración"]);
    expect(nav.sheet.map((group) => group.items.map((item) => item.href))).toEqual([
      ["/admin/customers", "/admin/workers", "/admin/nomina"],
      ["/admin/historical", "/asistente"],
      ["/admin/configuracion-pago", "/admin/users"],
    ]);
  });

  it("keeps the desktop sidebar limited to ADMIN destinations for ADMIN", () => {
    const nav = getAdminNav("ADMIN");

    expect(nav.desktop.map((item) => item.href)).toEqual([
      "/admin",
      "/admin/quotes",
      "/admin/work-orders",
      "/admin/notas",
      "/admin/customers",
      "/admin/nomina",
    ]);
  });

  it("gives SUPER_ADMIN the full desktop sidebar including users", () => {
    const hrefs = getAdminNav("SUPER_ADMIN").desktop.map((item) => item.href);

    expect(hrefs).toContain("/admin/users");
    expect(hrefs).toContain("/admin/workers");
    expect(hrefs).toContain("/admin/historical");
    expect(hrefs).toContain("/asistente");
    expect(hrefs).toContain("/admin/configuracion-pago");
    expect(hrefs).toHaveLength(ADMIN_NAV_ITEMS.length);
  });

  it("keeps non-ADMIN, non-SUPER_ADMIN roles without the users destination", () => {
    const hrefs = getAdminNav("ADMIN_ASSISTANT").desktop.map((item) => item.href);

    expect(hrefs).not.toContain("/admin/users");
    expect(hrefs).toContain("/admin/workers");
  });

  it("never uses abbreviated labels in any item or group", () => {
    const labels = [
      ...ADMIN_NAV_ITEMS.map((item) => item.label),
      ...getAdminNav("SUPER_ADMIN").sheet.map((group) => group.title),
    ];

    for (const label of labels) {
      expect(label).not.toMatch(/\.$/);
      expect(label).not.toMatch(/^(Cotiz|Hist|IA)\b/);
      expect(label.length).toBeGreaterThan(3);
    }
    expect(labels).toContain("Cotizaciones");
  });
});

describe("getActiveNavHref", () => {
  it("resolves the dashboard only on the exact dashboard route", () => {
    expect(getActiveNavHref("/admin")).toBe("/admin");
    expect(getActiveNavHref("/admin/customers/abc")).toBe("/admin/customers");
  });

  it("returns a single destination for nested routes", () => {
    expect(getActiveNavHref("/admin/nomina/worker-1")).toBe("/admin/nomina");
    expect(getActiveNavHref("/admin/quotes/new")).toBe("/admin/quotes");
  });

  it("marks only the Clientes destination on the customer profile and its statement", () => {
    expect(getActiveNavHref("/admin/customers/123")).toBe("/admin/customers");
    expect(getActiveNavHref("/admin/customers/123/estado-de-cuenta")).toBe("/admin/customers");
  });

  it("returns null for routes outside the navigation", () => {
    expect(getActiveNavHref("/admin/unknown")).toBeNull();
    expect(getActiveNavHref("/admin/quotesx")).toBeNull();
  });
});

describe("desktop rail preference", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("defaults to collapsed when nothing is stored", () => {
    expect(readRailExpanded()).toBe(false);
  });

  it("remembers the expanded preference across reads", () => {
    writeRailExpanded(true);
    expect(window.localStorage.getItem(RAIL_EXPANDED_STORAGE_KEY)).not.toBeNull();
    expect(readRailExpanded()).toBe(true);

    writeRailExpanded(false);
    expect(readRailExpanded()).toBe(false);
  });

  it("falls back to collapsed when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(readRailExpanded()).toBe(false);
    expect(() => writeRailExpanded(true)).not.toThrow();
  });
});
