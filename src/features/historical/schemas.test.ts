import { describe, expect, it } from "vitest";
import { historicalImportSchema, historicalWorkSchema } from "./schemas";

const validPayload = {
  schemaVersion: 2,
  batch: { id: "libreta-2026-01", source: "voice" },
  works: [
    {
      ref: "E-01",
      date: "2026-01-08",
      customer: { name: "Juan Pérez", plate: "ABC123", brand: "Nissan", model: "NP300" },
      master: "Luis",
      items: [
        { type: "LABOR", description: "Cambiar bujes", customerPrice: 1200, payrollBase: 1000, ratePercent: 50 },
        { type: "REFACCIONES", description: "4 tornillos", quantity: 4, customerPrice: 200 },
        { type: "REFACCIONES", description: "Kit de pernos de dirección", quantity: 1, customerPrice: 850, isKit: true },
      ],
    },
  ],
};

describe("historical import schema (schemaVersion 2)", () => {
  it("accepts the canonical example payload", () => {
    const result = historicalImportSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.batch.id).toBe("libreta-2026-01");
      expect(result.data.works).toHaveLength(1);
      expect(result.data.works[0].items).toHaveLength(3);
      expect(result.data.works[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("rejects a non-2 schemaVersion", () => {
    const result = historicalImportSchema.safeParse({ ...validPayload, schemaVersion: 1 });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown batch source", () => {
    const result = historicalImportSchema.safeParse({
      ...validPayload,
      batch: { id: "x", source: "pdf" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid date format", () => {
    const result = historicalImportSchema.safeParse({
      ...validPayload,
      works: [{ ...validPayload.works[0], date: "08/01/2026" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects labor with quantity", () => {
    const result = historicalWorkSchema.safeParse({
      ref: "E-01",
      date: "2026-01-08",
      items: [{ type: "LABOR", description: "Cambiar bujes", quantity: 2, customerPrice: 1200 }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("quantity"))).toBe(true);
    }
  });

  it("rejects OTHER in payroll with quantity", () => {
    const result = historicalWorkSchema.safeParse({
      ref: "E-02",
      date: "2026-01-08",
      items: [{ type: "OTHER", description: "Ajuste", quantity: 2, customerPrice: 300, includeInPayroll: true }],
    });
    expect(result.success).toBe(false);
  });

  it("requires quantity and price for material/refacción", () => {
    const noQuantity = historicalWorkSchema.safeParse({
      ref: "E-03",
      date: "2026-01-08",
      items: [{ type: "REFACCIONES", description: "4 tornillos", customerPrice: 200 }],
    });
    expect(noQuantity.success).toBe(false);

    const noPrice = historicalWorkSchema.safeParse({
      ref: "E-03",
      date: "2026-01-08",
      items: [{ type: "MATERIAL", description: "Aceite", quantity: 1 }],
    });
    expect(noPrice.success).toBe(false);
  });

  it("accepts OTHER outside payroll as a quantity line", () => {
    const result = historicalWorkSchema.safeParse({
      ref: "E-04",
      date: "2026-01-08",
      items: [{ type: "OTHER", description: "Traslado", quantity: 1, customerPrice: 500 }],
    });
    expect(result.success).toBe(true);
  });

  it("normalizes unknown optional values to undefined (later null), never guesses", () => {
    const result = historicalImportSchema.safeParse({
      ...validPayload,
      works: [
        {
          ref: "E-05",
          date: "2026-01-09",
          items: [{ type: "LABOR", description: "Ajuste general" }],
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const work = result.data.works[0];
      expect(work.customer?.name).toBeUndefined();
      expect(work.master).toBeUndefined();
      expect(work.items[0].quantity).toBeUndefined();
      expect(work.items[0].customerPrice).toBeUndefined();
    }
  });

  it("accepts an explicit ratePercent override", () => {
    const result = historicalWorkSchema.safeParse({
      ref: "E-06",
      date: "2026-01-10",
      items: [{ type: "LABOR", description: "Cambiar bujes", customerPrice: 1000, ratePercent: 60 }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects ratePercent outside 1-100", () => {
    const result = historicalWorkSchema.safeParse({
      ref: "E-07",
      date: "2026-01-10",
      items: [{ type: "LABOR", description: "Cambiar bujes", customerPrice: 1000, ratePercent: 0 }],
    });
    expect(result.success).toBe(false);
  });
});