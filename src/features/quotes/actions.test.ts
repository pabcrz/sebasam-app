import { describe, expect, it, vi, beforeEach } from "vitest";
import { QuoteStatus } from "@prisma/client";
import { updateDraftQuote, updateDraftQuoteFromForm } from "./actions";
import { prisma } from "@/lib/prisma";
import { findOrCreateVehicle } from "@/features/vehicles/actions";
import { redirect } from "next/navigation";

vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: vi.fn() } }));
vi.mock("@/lib/auth/session", () => ({ requireOperationalRole: vi.fn() }));
vi.mock("@/features/vehicles/actions", () => ({ findOrCreateVehicle: vi.fn() }));
vi.mock("@/features/vehicles/schemas", async () => ({
  ...(await vi.importActual<typeof import("@/features/vehicles/schemas")>("@/features/vehicles/schemas")),
  createVehicleSnapshot: vi.fn(() => ({ plate: null, brand: "Toyota", model: "Hilux", color: null, year: null })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

class MockFormData {
  private data = new Map<string, string>();
  get(name: string): string | null { return this.data.get(name) ?? null; }
  set(name: string, value: string): void { this.data.set(name, value); }
}

type MockTx = {
  quote: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  quoteItem: { deleteMany: ReturnType<typeof vi.fn> };
};

function mockTx(status: QuoteStatus = QuoteStatus.DRAFT): MockTx {
  const tx: MockTx = {
    quote: { findUnique: vi.fn().mockResolvedValue({ id: "quote-1", status, items: [] }), update: vi.fn().mockResolvedValue({ id: "quote-1", totalCents: 197200 }) },
    quoteItem: { deleteMany: vi.fn() },
  };
  (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback: (tx: MockTx) => Promise<unknown>) => callback(tx));
  (findOrCreateVehicle as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "vehicle-1" });
  return tx;
}

function validInput() {
  return {
    customerId: "cust-1",
    vehicle: { plate: "ABC123", brand: "Toyota", model: "Hilux", color: "Blanco", year: 2022 },
    title: "Servicio actualizado",
    description: "Notas actualizadas",
    administrative: false,
    taxEnabled: true,
    items: [{ type: "SERVICE" as const, description: "Cambio de aceite", quantity: 2, unitPriceCents: 85000 }],
  };
}

function buildFormData(overrides: Record<string, string> = {}) {
  const formData = new MockFormData();
  const defaults: Record<string, string> = {
    customerId: "cust-1", plate: "", brand: "", model: "Hilux", color: "", year: "",
    title: "Servicio", description: "", taxEnabled: "on",
    "items.0.type": "SERVICE", "items.0.description": "Cambio de aceite", "items.0.quantity": "1", "items.0.unitPrice": "100",
  };
  for (const [key, value] of Object.entries({ ...defaults, ...overrides })) {
    formData.set(key, value);
  }
  return formData;
}

describe("updateDraftQuote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates a DRAFT quote, recalculates totals and replaces items", async () => {
    const tx = mockTx();
    const result = await updateDraftQuote("quote-1", validInput());
    expect(tx.quoteItem.deleteMany).toHaveBeenCalledWith({ where: { quoteId: "quote-1" } });
    const updateData = tx.quote.update.mock.calls[0][0].data;
    expect(updateData.subtotalCents).toBe(170000);
    expect(updateData.taxCents).toBe(27200);
    expect(updateData.totalCents).toBe(197200);
    expect(updateData.items.create).toHaveLength(1);
    expect(result.totalCents).toBe(197200);
  });

  it("throws when the quote is not found", async () => {
    const tx = mockTx();
    tx.quote.findUnique.mockResolvedValue(null);
    await expect(updateDraftQuote("quote-1", validInput())).rejects.toThrow("Quote not found.");
  });

  it("throws when the quote is not in DRAFT status", async () => {
    mockTx(QuoteStatus.APPROVED);
    await expect(updateDraftQuote("quote-1", validInput())).rejects.toThrow("Only draft quotes can be updated.");
  });
});

describe("updateDraftQuoteFromForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("parses valid form data and redirects on success", async () => {
    mockTx();
    await updateDraftQuoteFromForm("quote-1", buildFormData({ "items.0.unitPrice": "850" }) as unknown as FormData);
    expect(redirect).toHaveBeenCalledWith("/admin/quotes?updated=1");
  });

  it("redirects with invalid error when form data is malformed", async () => {
    await updateDraftQuoteFromForm("quote-1", buildFormData({ title: "" }) as unknown as FormData);
    expect(redirect).toHaveBeenCalledWith("/admin/quotes/quote-1/edit?error=invalid");
  });

  it("redirects with not-draft error when quote is no longer draft", async () => {
    mockTx(QuoteStatus.SENT);
    await updateDraftQuoteFromForm("quote-1", buildFormData() as unknown as FormData);
    expect(redirect).toHaveBeenCalledWith("/admin/quotes/quote-1/edit?error=not-draft");
  });
});
