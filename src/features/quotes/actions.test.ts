import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma, QuoteStatus } from "@prisma/client";
import {
  cancelDraftQuote,
  cancelDraftQuoteFromForm,
  createQuote,
  createQuoteFromForm,
  duplicateQuote,
  duplicateQuoteFromForm,
  shareQuoteFromForm,
  updateDraftQuote,
  updateDraftQuoteFromForm,
} from "./actions";
import { prisma } from "@/lib/prisma";
import { findOrCreateVehicle } from "@/features/vehicles/actions";
import { redirect } from "next/navigation";

vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: vi.fn(), quote: { findUnique: vi.fn() } } }));
vi.mock("@/lib/auth/session", () => ({ requireOperationalRole: vi.fn() }));
vi.mock("@/features/vehicles/actions", () => ({ findOrCreateVehicle: vi.fn() }));
vi.mock("@/features/vehicles/schemas", async () => ({
  ...(await vi.importActual<typeof import("@/features/vehicles/schemas")>("@/features/vehicles/schemas")),
  createVehicleSnapshot: vi.fn(() => ({ plate: null, brand: "Toyota", model: "Hilux", color: null, year: null })),
}));
vi.mock("./lib/sequence", () => ({
  nextQuoteNumber: vi.fn(() => Promise.resolve("C-0626-01")),
}));
vi.mock("./lib/calculate", async () => ({
  ...(await vi.importActual<typeof import("./lib/calculate")>("./lib/calculate")),
  createQuoteValidUntil: vi.fn(() => new Date("2026-07-15T00:00:00.000Z")),
}));
vi.mock("./domain", () => ({
  getOrCreateSharedQuoteForQuote: vi.fn(),
  SharedQuoteOperationError: class SharedQuoteOperationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "SharedQuoteOperationError";
    }
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { getOrCreateSharedQuoteForQuote } from "./domain";

class MockFormData {
  private data = new Map<string, string>();
  get(name: string): string | null { return this.data.get(name) ?? null; }
  set(name: string, value: string): void { this.data.set(name, value); }
}

type MockTx = {
  quote: { create: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; findUniqueOrThrow: ReturnType<typeof vi.fn>; updateMany: ReturnType<typeof vi.fn> };
  quoteItem: { deleteMany: ReturnType<typeof vi.fn> };
};

function mockTx(status: QuoteStatus = QuoteStatus.DRAFT): MockTx {
  const tx: MockTx = {
    quote: {
      create: vi.fn().mockResolvedValue({ id: "quote-1", totalCents: 197200 }),
      findUnique: vi.fn().mockResolvedValue({ id: "quote-1", status, items: [] }),
      update: vi.fn().mockResolvedValue({ id: "quote-1", totalCents: 197200 }),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
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

function validInputWithoutVehicle() {
  return {
    customerId: "cust-1",
    vehicle: { plate: "", brand: "", model: "", color: "", year: "" },
    title: "Servicio administrativo",
    description: "",
    administrative: true,
    taxEnabled: false,
    items: [{ type: "SERVICE" as const, description: "Asesoría", quantity: 1, unitPriceCents: 50000 }],
  };
}

describe("createQuote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a quote linked to a vehicle when vehicle data is provided", async () => {
    const tx = mockTx();
    const result = await createQuote(validInput());

    expect(findOrCreateVehicle).toHaveBeenCalledTimes(1);
    expect(tx.quote.create).toHaveBeenCalledTimes(1);
    expect(tx.quote.create.mock.calls[0][0].data.vehicleId).toBe("vehicle-1");
    expect(tx.quote.create.mock.calls[0][0].data.vehicleSnapshot).toEqual({
      plate: null,
      brand: "Toyota",
      model: "Hilux",
      color: null,
      year: null,
    });
    expect(result.totalCents).toBe(197200);
  });

  it("creates a quote without a vehicle when no vehicle data is provided", async () => {
    const tx = mockTx();

    await createQuote(validInputWithoutVehicle());

    expect(findOrCreateVehicle).not.toHaveBeenCalled();
    expect(tx.quote.create).toHaveBeenCalledTimes(1);
    expect(tx.quote.create.mock.calls[0][0].data.vehicleId).toBeNull();
    expect(tx.quote.create.mock.calls[0][0].data.vehicleSnapshot).toBe(Prisma.JsonNull);
    expect(tx.quote.create.mock.calls[0][0].data.totalCents).toBe(50000);
  });
});

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

  it("throws when the quote is not in an editable status", async () => {
    mockTx(QuoteStatus.CANCELLED);
    await expect(updateDraftQuote("quote-1", validInput())).rejects.toThrow("This quote is not editable.");
  });

  it("throws when the quote already has a COMPLETED work order", async () => {
    const tx = mockTx();
    tx.quote.findUnique.mockResolvedValue({
      id: "quote-1",
      status: QuoteStatus.DRAFT,
      items: [],
      workOrder: { id: "wo-1", status: "COMPLETED" },
    });
    await expect(updateDraftQuote("quote-1", validInput())).rejects.toThrow("This quote is not editable.");
  });

  it("allows updating a DRAFT quote with a PLANNED work order", async () => {
    const tx = mockTx();
    tx.quote.findUnique.mockResolvedValue({
      id: "quote-1",
      status: QuoteStatus.DRAFT,
      items: [],
      workOrder: { id: "wo-1", status: "PLANNED" },
    });
    tx.quote.update.mockResolvedValue({ id: "quote-1", totalCents: 197200 });

    const result = await updateDraftQuote("quote-1", validInput());

    expect(result.totalCents).toBe(197200);
    expect(tx.quoteItem.deleteMany).toHaveBeenCalledWith({ where: { quoteId: "quote-1" } });
  });

  it("allows updating a SENT quote when not expired and work order is not terminal", async () => {
    const tx = mockTx(QuoteStatus.SENT);
    tx.quote.update.mockResolvedValue({ id: "quote-1", totalCents: 197200 });

    const result = await updateDraftQuote("quote-1", validInput());

    expect(result.totalCents).toBe(197200);
  });

  it("allows updating an APPROVED quote when not expired and work order is not terminal", async () => {
    const tx = mockTx(QuoteStatus.APPROVED);
    tx.quote.update.mockResolvedValue({ id: "quote-1", totalCents: 197200 });

    const result = await updateDraftQuote("quote-1", validInput());

    expect(result.totalCents).toBe(197200);
  });

  it("allows updating a REJECTED quote when not expired and work order is not terminal", async () => {
    const tx = mockTx(QuoteStatus.REJECTED);
    tx.quote.update.mockResolvedValue({ id: "quote-1", totalCents: 197200 });

    const result = await updateDraftQuote("quote-1", validInput());

    expect(result.totalCents).toBe(197200);
  });

  it("throws when the quote is expired", async () => {
    const tx = mockTx(QuoteStatus.DRAFT);
    tx.quote.findUnique.mockResolvedValue({
      id: "quote-1",
      status: QuoteStatus.DRAFT,
      items: [],
      validUntil: new Date("2020-01-01T00:00:00.000Z"),
      workOrder: null,
    });

    await expect(updateDraftQuote("quote-1", validInput())).rejects.toThrow("This quote is not editable.");
  });

  it("throws when a SENT quote has a COMPLETED work order", async () => {
    const tx = mockTx(QuoteStatus.SENT);
    tx.quote.findUnique.mockResolvedValue({
      id: "quote-1",
      status: QuoteStatus.SENT,
      items: [],
      validUntil: new Date("2026-12-31T00:00:00.000Z"),
      workOrder: { id: "wo-1", status: "COMPLETED" },
    });

    await expect(updateDraftQuote("quote-1", validInput())).rejects.toThrow("This quote is not editable.");
  });
});

describe("updateDraftQuoteFromForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("parses valid form data and redirects on success", async () => {
    mockTx();
    await updateDraftQuoteFromForm("quote-1", {}, buildFormData({ "items.0.unitPrice": "850" }) as unknown as FormData);
    expect(redirect).toHaveBeenCalledWith("/admin/quotes?updated=1");
  });

  it("returns an error when form data is malformed", async () => {
    await expect(updateDraftQuoteFromForm("quote-1", {}, buildFormData({ title: "" }) as unknown as FormData))
      .resolves.toEqual({ error: "Revisa los datos e intenta de nuevo." });
  });

  it("redirects with not-editable error when quote is no longer editable", async () => {
    mockTx(QuoteStatus.CANCELLED);
    await expect(updateDraftQuoteFromForm("quote-1", {}, buildFormData() as unknown as FormData))
      .resolves.toEqual({ error: "Esta cotización ya no se puede editar." });
  });

  it("redirects with not-editable error when the quote has a COMPLETED work order", async () => {
    const tx = mockTx();
    tx.quote.findUnique.mockResolvedValue({
      id: "quote-1",
      status: QuoteStatus.DRAFT,
      items: [],
      workOrder: { id: "wo-1", status: "COMPLETED" },
    });
    await expect(updateDraftQuoteFromForm("quote-1", {}, buildFormData() as unknown as FormData))
      .resolves.toEqual({ error: "Esta cotización ya no se puede editar." });
  });
});

describe("createQuoteFromForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an error when the vehicle plate is longer than 10 characters", async () => {
    mockTx();
    await expect(createQuoteFromForm({}, buildFormData({ plate: "ABCDEFGHIJK" }) as unknown as FormData))
      .resolves.toEqual({ error: "Revisa los datos e intenta de nuevo." });
  });

  it("returns an error when the vehicle year is greater than current year plus one", async () => {
    mockTx();
    const futureYear = String(new Date().getFullYear() + 2);
    await expect(createQuoteFromForm({}, buildFormData({ year: futureYear }) as unknown as FormData))
      .resolves.toEqual({ error: "Revisa los datos e intenta de nuevo." });
  });

  it("submits exactly the normalized non-empty concepts", async () => {
    const tx = mockTx();
    const formData = buildFormData({
      "items.1.type": "EQUIPMENT",
      "items.1.description": "",
      "items.1.quantity": "1",
      "items.1.unitPrice": "",
    });

    await createQuoteFromForm({}, formData as unknown as FormData);

    expect(tx.quote.create.mock.calls[0][0].data.items.create).toHaveLength(1);
    expect(tx.quote.create.mock.calls[0][0].data.items.create[0].description).toBe("Cambio de aceite");
  });
});

describe("duplicateQuote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a new DRAFT quote with a fresh number and validity while copying quote fields and items", async () => {
    const tx = mockTx();
    (prisma.quote.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "quote-source",
      customerId: "cust-1",
      vehicle: {
        id: "vehicle-source",
        customerId: "cust-1",
        plate: "ABC123",
        brand: "Toyota",
        model: "Hilux",
        color: "Blanco",
        year: 2022,
        notes: "Source vehicle notes",
      },
      number: "C-0625-99",
      status: QuoteStatus.APPROVED,
      title: "Servicio original",
      description: "Notas originales",
      administrative: true,
      taxEnabled: true,
      subtotalCents: 170000,
      taxCents: 27200,
      totalCents: 197200,
      validUntil: new Date("2026-06-30T00:00:00.000Z"),
      workOrder: { id: "wo-source" },
      sharedQuotes: [{ id: "shared-source" }],
      paymentRequests: [{ id: "payment-source" }],
      items: [
        {
          id: "item-2",
          quoteId: "quote-source",
          type: "PART",
          description: "Filtro",
          quantity: 1,
          unitPriceCents: 20000,
          totalCents: 20000,
          sortOrder: 2,
        },
        {
          id: "item-1",
          quoteId: "quote-source",
          type: "SERVICE",
          description: "Cambio de aceite",
          quantity: 2,
          unitPriceCents: 85000,
          totalCents: 170000,
          sortOrder: 5,
        },
      ],
    });
    tx.quote.create.mockResolvedValue({ id: "quote-copy", number: "C-0626-01", status: QuoteStatus.DRAFT });

    const result = await duplicateQuote("quote-source");

    expect(prisma.quote.findUnique).toHaveBeenCalledWith({
      where: { id: "quote-source" },
      include: {
        vehicle: true,
        items: { orderBy: { sortOrder: "asc" } },
      },
    });
    expect(findOrCreateVehicle).toHaveBeenCalledWith(tx, {
      customerId: "cust-1",
      plate: "ABC123",
      brand: "Toyota",
      model: "Hilux",
      color: "Blanco",
      year: 2022,
      notes: "Source vehicle notes",
    });
    expect(result).toEqual({ id: "quote-copy", number: "C-0626-01", status: QuoteStatus.DRAFT });

    const createData = tx.quote.create.mock.calls[0][0].data;
    expect(createData).toMatchObject({
      customerId: "cust-1",
      vehicleId: "vehicle-1",
      number: "C-0626-01",
      status: QuoteStatus.DRAFT,
      title: "Servicio original",
      description: "Notas originales",
      administrative: true,
      taxEnabled: true,
      subtotalCents: 170000,
      taxCents: 27200,
      totalCents: 197200,
      validUntil: new Date("2026-07-15T00:00:00.000Z"),
    });
    expect(createData.items.create).toEqual([
      {
        type: "PART",
        description: "Filtro",
        quantity: 1,
        unitPriceCents: 20000,
        totalCents: 20000,
        sortOrder: 0,
      },
      {
        type: "SERVICE",
        description: "Cambio de aceite",
        quantity: 2,
        unitPriceCents: 85000,
        totalCents: 170000,
        sortOrder: 1,
      },
    ]);
    expect(createData).not.toHaveProperty("workOrder");
    expect(createData).not.toHaveProperty("sharedQuotes");
    expect(createData).not.toHaveProperty("paymentRequests");
  });

  it("creates a duplicate without a linked vehicle when the original has no vehicle", async () => {
    const tx = mockTx();
    (prisma.quote.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "quote-source",
      customerId: "cust-1",
      vehicle: null,
      title: "Servicio sin vehículo",
      description: null,
      administrative: false,
      taxEnabled: false,
      subtotalCents: 50000,
      taxCents: 0,
      totalCents: 50000,
      items: [],
    });

    await duplicateQuote("quote-source");

    const createData = tx.quote.create.mock.calls[0][0].data;
    expect(findOrCreateVehicle).not.toHaveBeenCalled();
    expect(createData.vehicleId).toBeNull();
    expect(createData.vehicleSnapshot).toBe(Prisma.JsonNull);
  });

  it("throws when the original quote is not found", async () => {
    mockTx();
    (prisma.quote.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(duplicateQuote("missing-quote")).rejects.toThrow("Quote not found.");
  });
});

describe("duplicateQuoteFromForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("duplicates a quote from form data and redirects with duplicated feedback", async () => {
    const tx = mockTx();
    (prisma.quote.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "quote-source",
      customerId: "cust-1",
      vehicle: null,
      title: "Servicio",
      description: null,
      administrative: false,
      taxEnabled: false,
      subtotalCents: 50000,
      taxCents: 0,
      totalCents: 50000,
      items: [],
    });

    const formData = new MockFormData();
    formData.set("quoteId", "quote-source");

    await duplicateQuoteFromForm(formData as unknown as FormData);

    expect(tx.quote.create).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith("/admin/quotes?duplicated=1");
  });

  it("redirects with invalid error when quoteId is missing", async () => {
    await duplicateQuoteFromForm(new MockFormData() as unknown as FormData);

    expect(redirect).toHaveBeenCalledWith("/admin/quotes?error=invalid");
  });

  it("redirects with duplicate-failed when the original quote cannot be duplicated", async () => {
    mockTx();
    (prisma.quote.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const formData = new MockFormData();
    formData.set("quoteId", "missing-quote");

    await duplicateQuoteFromForm(formData as unknown as FormData);

    expect(redirect).toHaveBeenCalledWith("/admin/quotes?error=duplicate-failed");
  });
});

describe("cancelDraftQuote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cancels a DRAFT quote without deleting it", async () => {
    const tx = mockTx();
    tx.quote.updateMany.mockResolvedValue({ count: 1 });
    tx.quote.findUniqueOrThrow.mockResolvedValue({ id: "quote-1", status: QuoteStatus.CANCELLED });

    const result = await cancelDraftQuote("quote-1");

    expect(tx.quote.updateMany).toHaveBeenCalledWith({
      where: { id: "quote-1", status: QuoteStatus.DRAFT },
      data: { status: QuoteStatus.CANCELLED },
    });
    expect(result.status).toBe(QuoteStatus.CANCELLED);
  });

  it("throws when the quote is not found", async () => {
    const tx = mockTx();
    tx.quote.findUnique.mockResolvedValue(null);
    await expect(cancelDraftQuote("quote-1")).rejects.toThrow("Quote not found.");
  });

  it("throws when the quote is not in DRAFT status", async () => {
    mockTx(QuoteStatus.APPROVED);
    await expect(cancelDraftQuote("quote-1")).rejects.toThrow("Only draft quotes can be cancelled.");
  });
});

describe("cancelDraftQuoteFromForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cancels a draft quote from form data and redirects", async () => {
    const tx = mockTx();
    tx.quote.updateMany.mockResolvedValue({ count: 1 });
    tx.quote.findUniqueOrThrow.mockResolvedValue({ id: "quote-1", status: QuoteStatus.CANCELLED });

    const formData = new MockFormData();
    formData.set("quoteId", "quote-1");

    await cancelDraftQuoteFromForm(formData as unknown as FormData);

    expect(redirect).toHaveBeenCalledWith("/admin/quotes?cancelled=1");
  });

  it("redirects with invalid-cancellation when quoteId is missing", async () => {
    await cancelDraftQuoteFromForm(new MockFormData() as unknown as FormData);
    expect(redirect).toHaveBeenCalledWith("/admin/quotes?error=invalid-cancellation");
  });

  it("redirects with not-draft error when quote is no longer draft", async () => {
    mockTx(QuoteStatus.SENT);
    const formData = new MockFormData();
    formData.set("quoteId", "quote-1");

    await cancelDraftQuoteFromForm(formData as unknown as FormData);

    expect(redirect).toHaveBeenCalledWith("/admin/quotes?error=not-draft");
  });
});

describe("shareQuoteFromForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a shared quote and redirects with shared param", async () => {
    const sharedQuote = { id: "sq-1", token: "token-1", quoteId: "quote-1", expiresAt: new Date() };
    (getOrCreateSharedQuoteForQuote as ReturnType<typeof vi.fn>).mockResolvedValue(sharedQuote);

    const formData = new MockFormData();
    formData.set("quoteId", "quote-1");

    await shareQuoteFromForm(formData as unknown as FormData);

    expect(getOrCreateSharedQuoteForQuote).toHaveBeenCalledWith("quote-1");
    expect(redirect).toHaveBeenCalledWith("/admin/quotes?shared=1");
  });

  it("redirects with invalid-share when quoteId is missing", async () => {
    await shareQuoteFromForm(new MockFormData() as unknown as FormData);

    expect(redirect).toHaveBeenCalledWith("/admin/quotes?error=invalid-share");
  });

  it("redirects with share-failed when sharing is not allowed", async () => {
    (getOrCreateSharedQuoteForQuote as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Quote must have at least one complete item to be shared."),
    );

    const formData = new MockFormData();
    formData.set("quoteId", "quote-1");

    await shareQuoteFromForm(formData as unknown as FormData);

    expect(redirect).toHaveBeenCalledWith("/admin/quotes?error=share-failed");
  });
});
