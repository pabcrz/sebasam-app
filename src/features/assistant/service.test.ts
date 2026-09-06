import { describe, expect, it, vi, beforeEach } from "vitest";
import { QuoteItemType } from "@prisma/client";
import type { HistoricalMatchSource } from "@/features/historical/repository";
import { answerHistoricalQuestion, parseAssistantFilters, mapFiltersToAggregateInput } from "./service";

const { createGeminiProvider, ProviderErrorStub } = vi.hoisted(() => ({
  createGeminiProvider: vi.fn(),
  ProviderErrorStub: class ProviderErrorStub extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ProviderError";
    }
  },
}));

const { aggregateHistoricalItems, matchHistoricalItems } = vi.hoisted(() => ({
  aggregateHistoricalItems: vi.fn(),
  matchHistoricalItems: vi.fn(),
}));

vi.mock("@/features/historical/provider", () => ({ createGeminiProvider, ProviderError: ProviderErrorStub }));
vi.mock("@/features/historical/repository", () => ({
  aggregateHistoricalItems,
  matchHistoricalItems,
}));

const sampleSource: HistoricalMatchSource = {
  itemId: "item-1",
  workId: "work-1",
  workRef: "E-01",
  workDate: "2026-01-08",
  customerName: "Juan Pérez",
  plate: "ABC123",
  brand: "Nissan",
  model: "NP300",
  masterName: "Luis",
  type: QuoteItemType.REFACCIONES,
  description: "4 tornillos",
  quantity: 4,
  customerPriceCents: 20000,
  payrollBaseCents: null,
  ratePercent: null,
  includeInPayroll: false,
  isKit: false,
  contentHash: "h",
  metadata: {},
  similarity: 0.9,
};

const providerMock = {
  embedText: vi.fn(async () => new Array(1536).fill(0)),
  generateText: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  createGeminiProvider.mockReturnValue(providerMock);
  providerMock.generateText
    .mockResolvedValueOnce('{"wantsStats": true, "brand": "Nissan", "master": "Luis", "description": "bujes"}')
    .mockResolvedValueOnce("Según la libreta, por cambiar bujes cobramos $1,200 [1].");
  aggregateHistoricalItems.mockResolvedValue([
    {
      groupKey: "all",
      itemCount: 12,
      workCount: 3,
      totalCustomerCents: 150000,
      totalPayrollBaseCents: 100000,
      totalCommissionCents: 50000,
      avgCustomerCents: 12500,
      avgCommissionCents: 4167,
    },
  ]);
  matchHistoricalItems.mockResolvedValue([sampleSource]);
});

describe("assistant filters extraction", () => {
  it("parses a clean JSON payload", () => {
    const filters = parseAssistantFilters('{"brand": "Nissan", "type": "LABOR", "dateFrom": "2026-01-01", "wantsStats": true}');
    expect(filters.brand).toBe("Nissan");
    expect(filters.type).toBe(QuoteItemType.LABOR);
    expect(filters.dateFrom).toBe("2026-01-01");
    expect(filters.wantsStats).toBe(true);
  });

  it("tolerates markdown fences", () => {
    const filters = parseAssistantFilters("```json\n{\"model\": \"NP300\"}\n```");
    expect(filters.model).toBe("NP300");
  });

  it("turns unknown or invalid values into null, never guesses", () => {
    const filters = parseAssistantFilters('{"brand": 42, "type": "HACK", "dateFrom": "08/01/2026", "wantsStats": "si"}');
    expect(filters.brand).toBeNull();
    expect(filters.type).toBeNull();
    expect(filters.dateFrom).toBeNull();
    expect(filters.wantsStats).toBe(false);
  });

  it("returns empty filters for garbage", () => {
    const filters = parseAssistantFilters("esto no es json");
    expect(filters).toEqual({
      brand: null,
      model: null,
      description: null,
      type: null,
      master: null,
      dateFrom: null,
      dateTo: null,
      wantsStats: false,
    });
  });

  it("maps filters to the aggregate RPC input", () => {
    const input = mapFiltersToAggregateInput({
      brand: "Nissan",
      model: null,
      description: null,
      type: QuoteItemType.LABOR,
      master: "Luis",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      wantsStats: true,
    });
    expect(input.filterType).toBe(QuoteItemType.LABOR);
    expect(input.filterMaster).toBe("Luis");
    expect(input.dateFrom?.toISOString()).toContain("2026-01-01");
  });
});

describe("assistant orchestration", () => {
  it("runs exact aggregation when stats are requested and always semantic search", async () => {
    const result = await answerHistoricalQuestion("¿Cuánto cobramos por cambiar bujes?");

    expect(providerMock.embedText).toHaveBeenCalledWith("¿Cuánto cobramos por cambiar bujes?");
    expect(aggregateHistoricalItems).toHaveBeenCalledTimes(1);
    expect(matchHistoricalItems).toHaveBeenCalledTimes(1);
    const matchInput = matchHistoricalItems.mock.calls[0][0];
    expect(matchInput.count).toBe(5);
    expect(matchInput.threshold).toBe(0.4);
    expect(matchInput.embedding).toHaveLength(1536);

    expect(result.answer).toBe("Según la libreta, por cambiar bujes cobramos $1,200 [1].");
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].description).toBe("4 tornillos");
    expect(result.aggregation?.[0].totalCustomerCents).toBe(150000);
    expect(result.envError).toBeNull();
  });

  it("skips aggregation when the question does not request stats", async () => {
    providerMock.generateText
      .mockReset()
      .mockResolvedValueOnce('{"wantsStats": false}')
      .mockResolvedValueOnce("ok");
    await answerHistoricalQuestion("¿Dónde está el cliente de E-01?");
    expect(aggregateHistoricalItems).not.toHaveBeenCalled();
    expect(matchHistoricalItems).toHaveBeenCalledTimes(1);
  });

  it("returns a config error instead of throwing when the API key is missing", async () => {
    createGeminiProvider.mockImplementation(() => {
      throw new Error("GEMINI_API_KEY no está configurada.");
    });
    const result = await answerHistoricalQuestion("¿Cuánto cobramos?");
    expect(result.envError).toContain("GEMINI_API_KEY");
    expect(result.answer).toContain("no está configurado");
    expect(matchHistoricalItems).not.toHaveBeenCalled();
  });

  it("feeds sources with derived values into the answer prompt", async () => {
    await answerHistoricalQuestion("¿Cuánto cuesta cada tornillo?");
    const userPrompt = providerMock.generateText.mock.calls[1][0].user as string;
    expect(userPrompt).toContain("4 tornillos");
    expect(userPrompt).toContain("Línea original: 4 ×");
    expect(userPrompt).toContain("Unitario derivado");
    expect(userPrompt).toContain("[capturado]");
  });
});