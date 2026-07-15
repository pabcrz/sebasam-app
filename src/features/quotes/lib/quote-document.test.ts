import { describe, expect, it } from "vitest";
import { mapBuilderToQuoteDocument, mapPublicQuoteToDocument } from "./quote-document";

const header = {
  business: { name: "SEBASAM" },
  folio: "C-143",
  issuedAt: new Date("2026-07-15T12:00:00Z"),
  validUntil: new Date("2026-07-30T12:00:00Z"),
  customer: { name: "Transportes Norte" },
  unit: { brand: "Kenworth", model: "T680", plate: "ABC-123" },
  title: "Reparación de suspensión",
  description: "  Diagnóstico y reparación  ",
  conditions: ["Precios sujetos a disponibilidad."],
};

describe("quote document mappers", () => {
  it("maps builder values and calculates document amounts", () => {
    const document = mapBuilderToQuoteDocument({
      ...header,
      taxEnabled: true,
      items: [{ type: "LABOR", description: "Instalación", quantity: "2", unitPrice: "125.50" }],
    });

    expect(document.description).toBe("Diagnóstico y reparación");
    expect(document.concepts[0]).toMatchObject({ quantity: 2, unitAmountCents: 12550, amountCents: 25100 });
    expect(document).toMatchObject({ subtotalCents: 25100, taxCents: 4016, totalCents: 29116 });
  });

  it("maps public cents without depending on persistence entities", () => {
    const document = mapPublicQuoteToDocument({
      ...header,
      items: [{ type: "MATERIAL", description: "Muelle", quantity: "3", unitPriceCents: 20000, totalCents: 60000 }],
      subtotalCents: 60000,
      taxCents: 0,
      totalCents: 60000,
    });

    expect(document.concepts[0]).toMatchObject({ quantity: 3, unitAmountCents: 20000, amountCents: 60000 });
    expect(document.totalCents).toBe(60000);
  });

  it("matches canonical totals without pre-rounding decimal unit prices", () => {
    const document = mapBuilderToQuoteDocument({
      ...header,
      taxEnabled: true,
      items: [{ type: "MATERIAL", description: "Consumible", quantity: "3", unitPrice: "0.335" }],
    });

    expect(document.concepts[0]).toMatchObject({ unitAmountCents: 34, amountCents: 101 });
    expect(document).toMatchObject({ subtotalCents: 101, taxCents: 16, totalCents: 117 });
  });
});
