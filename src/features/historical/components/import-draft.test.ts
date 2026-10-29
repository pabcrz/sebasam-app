import { describe, expect, it } from "vitest";
import { QuoteItemType } from "@/generated/prisma/client";
import { draftToPayload, payloadToDraft, resolveMasterId, validateDraftWork } from "./import-draft";

const payload = {
  batch: { id: "libreta-2026-01", source: "voice" as const },
  works: [
    {
      ref: "E-01",
      date: "2026-01-08",
      customer: { name: "Juan Pérez", plate: "ABC123", brand: "Nissan", model: "NP300" },
      master: "Luis",
      items: [
        { type: QuoteItemType.LABOR, description: "Cambiar bujes", customerPrice: 1200, payrollBase: 1000 },
        { type: QuoteItemType.REFACCIONES, description: "4 tornillos", quantity: 4, customerPrice: 200 },
      ],
    },
  ],
};

describe("import draft conversions", () => {
  it("converts a payload into editable string fields", () => {
    const draft = payloadToDraft(payload);
    expect(draft.batch.id).toBe("libreta-2026-01");
    expect(draft.works[0].ref).toBe("E-01");
    expect(draft.works[0].date).toBe("2026-01-08");
    expect(draft.works[0].customerName).toBe("Juan Pérez");
    expect(draft.works[0].master).toBe("Luis");
    expect(draft.works[0].items[0].customerPrice).toBe("1200");
    expect(draft.works[0].items[1].quantity).toBe("4");
  });

  it("rebuilds a schemaVersion 2 payload from corrected drafts", () => {
    const draft = payloadToDraft(payload);
    draft.works[0].items[0].description = "Cambiar bujes delanteros";
    draft.works[0].items[0].payrollBase = "1100";

    const rebuilt = draftToPayload(draft) as {
      schemaVersion: number;
      batch: { id: string; source: string };
      works: Array<{ ref: string; items: Array<{ description: string; payrollBase: number }> }>;
    };

    expect(rebuilt.schemaVersion).toBe(2);
    expect(rebuilt.works[0].ref).toBe("E-01");
    expect(rebuilt.works[0].items[0].description).toBe("Cambiar bujes delanteros");
    expect(rebuilt.works[0].items[0].payrollBase).toBe(1100);
  });

  it("drops empty optional fields instead of sending empty strings", () => {
    const draft = payloadToDraft(payload);
    draft.works[0].master = "";
    draft.works[0].items[1].quantity = "";

    const rebuilt = draftToPayload(draft) as {
      works: Array<{ master?: string; items: Array<{ quantity?: number }> }>;
    };
    expect(rebuilt.works[0].master).toBeUndefined();
    expect(rebuilt.works[0].items[1].quantity).toBeUndefined();
  });

  it("validates a draft work with the same rules as the server", () => {
    const valid = payloadToDraft(payload);
    expect(validateDraftWork(valid.works[0])).toEqual([]);

    const invalid = payloadToDraft(payload);
    invalid.works[0].items.push({
      key: "x",
      type: QuoteItemType.LABOR,
      description: "Repetido",
      quantity: "2",
      customerPrice: "500",
      payrollBase: "",
      ratePercent: "",
      includeInPayroll: false,
      isKit: false,
    });
    expect(validateDraftWork(invalid.works[0])).not.toEqual([]);
  });

  it("resolves masters only when the displayName matches exactly one profile", () => {
    const masters = [
      { id: "a", displayName: "Luis" },
      { id: "b", displayName: "Luis Pérez" },
    ];
    expect(resolveMasterId("luis", masters)).toBe("a");
    expect(resolveMasterId("Luis ", masters)).toBe("a");
    expect(resolveMasterId("Luis Pérez", masters)).toBe("b");
    expect(resolveMasterId("", masters)).toBeNull();
    expect(resolveMasterId("Desconocido", masters)).toBeNull();

    const twoLuis = [
      { id: "a", displayName: "Luis" },
      { id: "c", displayName: "luis" },
    ];
    expect(resolveMasterId("Luis", twoLuis)).toBeNull();
  });
});