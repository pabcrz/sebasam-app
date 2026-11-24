import { describe, expect, it } from "vitest";
import { expensesToCsv } from "./csv";
import type { ExpenseRow } from "./queries";

const row = (overrides: Partial<ExpenseRow>): ExpenseRow => ({ id: "e", spentAt: new Date("2026-11-20T00:00:00Z"), amountCents: 150_050, category: "FUEL_TRANSPORT", invoiceStatus: "INVOICED", partsSharePercent: 50, supplier: "Gasolinera", paymentMethod: "CASH", notes: null, ...overrides });

describe("expensesToCsv", () => {
  it("writes a header and one row per expense, oldest first, amounts in pesos, labels in Spanish, with a BOM", () => {
    const csv = expensesToCsv([row({}), row({ spentAt: new Date("2026-11-05T00:00:00Z"), category: "RENT", invoiceStatus: "NOT_INVOICED", supplier: null, paymentMethod: "TRANSFER", amountCents: 500_000 })]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.slice(1).split("\r\n")).toEqual([
      "Fecha,Categoría,Proveedor,Comprobante,Método de pago,Monto (MXN),Nota",
      "2026-11-05,Renta,,Sin factura,Transferencia,5000.00,",
      "2026-11-20,Combustible y traslados,Gasolinera,Con factura,Efectivo,1500.50,",
      "",
    ]);
  });

  it("quotes commas, quotes and line breaks", () => {
    const csv = expensesToCsv([row({ supplier: 'Casa "Pepe", S.A.', notes: "línea 1\nlínea 2" })]);
    expect(csv).toContain('"Casa ""Pepe"", S.A."');
    expect(csv).toContain('"línea 1\nlínea 2"');
  });

  it("defuses text a spreadsheet would run as a formula", () => {
    const csv = expensesToCsv([row({ supplier: "=HYPERLINK(\"http://x\")", notes: "+1 pieza" })]);
    expect(csv).toContain(`"'=HYPERLINK(""http://x"")"`);
    expect(csv).toContain(`"'+1 pieza"`);
  });
});
