import { describe, expect, it, vi, beforeEach } from "vitest";
import { importHistoricalPayload, HistoricalImportError } from "./importer";
import type { NormalizedHistoricalItem, NormalizedHistoricalWork } from "./types";

const { insertWorkWithItems, listExistingRefs } = vi.hoisted(() => ({
  insertWorkWithItems: vi.fn(),
  listExistingRefs: vi.fn(),
}));

vi.mock("./repository", () => ({
  insertWorkWithItems,
  listExistingRefs,
}));

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
    {
      ref: "E-02",
      date: "2026-01-09",
      customer: { name: "María López", plate: "XYZ789", brand: "Chevrolet", model: "S10" },
      master: "Pedro",
      items: [
        { type: "LABOR", description: "Soldadura de escape", customerPrice: 900, payrollBase: 800 },
      ],
    },
  ],
};

const fakeProvider = {
  embedText: vi.fn(async (text: string) => {
    return new Array(1536).fill(0).map((_, index) => (index === 0 ? text.length : 0));
  }),
  generateText: vi.fn(async () => "{}"),
};

function expectValidItem(item: NormalizedHistoricalItem) {
  expect(item.embedding).toHaveLength(1536);
  expect(item.contentHash).toMatch(/^[a-f0-9]{64}$/);
}

beforeEach(() => {
  vi.clearAllMocks();
  listExistingRefs.mockResolvedValue(new Set<string>());
  insertWorkWithItems.mockImplementation(async (work: NormalizedHistoricalWork, items: NormalizedHistoricalItem[]) => {
    return { workId: `work-${work.workRef}`, itemCount: items.length };
  });
});

describe("historical importer", () => {
  it("dry-run reports detected/valid counts, distinct types and descriptions without inserting or calling the provider", async () => {
    const report = await importHistoricalPayload({ payload: validPayload, dryRun: true });

    expect(report.parseError).toBeNull();
    expect(report.detectedWorks).toBe(2);
    expect(report.validWorks).toBe(2);
    expect(report.importedWorks).toBe(0);
    expect(report.importedItems).toBe(0);
    expect(report.distinctItemTypes).toEqual(["LABOR", "REFACCIONES"]);
    expect(report.distinctDescriptions).toEqual([
      "4 tornillos",
      "Cambiar bujes",
      "Kit de pernos de dirección",
      "Soldadura de escape",
    ]);
    expect(insertWorkWithItems).not.toHaveBeenCalled();
    expect(fakeProvider.embedText).not.toHaveBeenCalled();
  });

  it("imports works transactionally with 1536-dim embeddings and derived rates", async () => {
    const report = await importHistoricalPayload({ payload: validPayload, provider: fakeProvider });

    expect(report.importedWorks).toBe(2);
    expect(report.importedItems).toBe(4);
    expect(report.errorWorks).toBe(0);
    expect(insertWorkWithItems).toHaveBeenCalledTimes(2);

    const firstCall = insertWorkWithItems.mock.calls[0] as [NormalizedHistoricalWork, NormalizedHistoricalItem[]];
    const work = firstCall[0];
    const items = firstCall[1];
    expect(work.batchId).toBe("libreta-2026-01");
    expect(work.workRef).toBe("E-01");
    expect(work.masterName).toBe("Luis");
    expect(work.customerName).toBe("Juan Pérez");
    expect(work.source).toBe("voice");
    expect(items).toHaveLength(3);
    for (const item of items) expectValidItem(item);

    const labor = items[0];
    expect(labor.ratePercent).toBe(50);
    expect(labor.commissionCents).toBe(50000);
    expect(labor.quantity).toBeNull();

    const parts = items[1];
    expect(parts.unitPriceCents).toBe(5000);
    expect(parts.ratePercent).toBeNull();

    const kit = items[2];
    expect(kit.isKit).toBe(true);
    expect(kit.unitPriceCents).toBe(85000);

    // welding derivation for E-02
    const secondCall = insertWorkWithItems.mock.calls[1] as [NormalizedHistoricalWork, NormalizedHistoricalItem[]];
    expect(secondCall[1][0].ratePercent).toBe(40);
    expect(fakeProvider.embedText).toHaveBeenCalledTimes(4);
  });

  it("skips works already imported for the batch (idempotent by batch + ref)", async () => {
    listExistingRefs.mockResolvedValue(new Set(["E-01"]));
    const report = await importHistoricalPayload({ payload: validPayload, provider: fakeProvider });

    expect(report.duplicateWorks).toBe(1);
    expect(report.importedWorks).toBe(1);
    expect(report.importedItems).toBe(1);
    expect(insertWorkWithItems).toHaveBeenCalledTimes(1);
    expect(insertWorkWithItems.mock.calls[0][0].workRef).toBe("E-02");
  });

  it("marks a repeated identical line inside a work as an item duplicate", async () => {
    const payload = {
      schemaVersion: 2,
      batch: { id: "lote-dup", source: "text" },
      works: [
        {
          ref: "D-01",
          date: "2026-01-08",
          items: [
            { type: "LABOR", description: "Cambiar bujes", customerPrice: 1200 },
            { type: "LABOR", description: "Cambiar bujes", customerPrice: 1200 },
          ],
        },
      ],
    };
    const report = await importHistoricalPayload({ payload, provider: fakeProvider });

    expect(report.importedWorks).toBe(1);
    expect(report.importedItems).toBe(1);
    expect(report.duplicatedItems).toBe(1);
    expect(fakeProvider.embedText).toHaveBeenCalledTimes(1);
  });

  it("fails the whole work when an embedding fails (no partial works)", async () => {
    fakeProvider.embedText.mockRejectedValueOnce(new Error("network"));
    const report = await importHistoricalPayload({ payload: validPayload, provider: fakeProvider });

    expect(report.errorWorks).toBe(1);
    expect(report.importedWorks).toBe(1);
    const errored = report.works.find((work) => work.status === "error");
    expect(errored?.error).toContain("embedding");
    expect(insertWorkWithItems).toHaveBeenCalledTimes(1);
  });

  it("reports per-work schema errors as errors", async () => {
    const payload = {
      schemaVersion: 2,
      batch: { id: "lote-invalido", source: "text" },
      works: [
        {
          ref: "X-01",
          date: "2026-01-08",
          items: [{ type: "LABOR", description: "Cambiar bujes", quantity: 2, customerPrice: 1200 }],
        },
      ],
    };
    const report = await importHistoricalPayload({ payload, provider: fakeProvider });

    expect(report.errorWorks).toBe(1);
    expect(report.works[0].status).toBe("error");
    expect(report.works[0].error).toContain("cantidad");
    expect(insertWorkWithItems).not.toHaveBeenCalled();
  });

  it("returns a parse error for a wrong schemaVersion", async () => {
    const report = await importHistoricalPayload({
      payload: { ...validPayload, schemaVersion: 1 },
      dryRun: true,
    });
    expect(report.parseError).toContain("schemaVersion");
  });

  it("returns a parse error for a missing batch", async () => {
    const report = await importHistoricalPayload({
      payload: { schemaVersion: 2, works: [] },
      dryRun: true,
    });
    expect(report.parseError).not.toBeNull();
  });

  it("requires a provider when not dry-running", async () => {
    await expect(
      importHistoricalPayload({ payload: validPayload, dryRun: false }),
    ).rejects.toBeInstanceOf(HistoricalImportError);
  });
});