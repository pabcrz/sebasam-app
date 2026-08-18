import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { PaymentStatus, Prisma, QuoteStatus } from "@prisma/client";
import {
  cancelQuote,
  archiveQuote,
  cancelQuoteFromForm,
  authorizeQuoteAction,
  createQuote,
  createQuoteFromForm,
  createQuoteFromWorkspace,
  deleteQuote,
  deleteQuoteFromForm,
  duplicateQuote,
  duplicateQuoteFromForm,
  publishSharedQuote,
  restoreArchivedQuote,
  updateDraftQuote,
  updateDraftQuoteFromForm,
  updateDraftQuoteFromWorkspace,
} from "./actions";
import { prisma } from "@/lib/prisma";
import { findOrCreateVehicle } from "@/features/vehicles/actions";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireOperationalRole } from "@/lib/auth/session";
import { nextQuoteNumber } from "./lib/sequence";

vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: vi.fn(), quote: { findUnique: vi.fn(), updateMany: vi.fn() } } }));
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
  authorizeQuote: vi.fn(),
  QuoteDecisionError: class QuoteDecisionError extends Error {},
  createSharedQuoteExpirationDate: vi.fn(() => new Date("2026-08-31T00:00:00.000Z")),
  createSharedQuoteToken: vi.fn(() => "stable-token"),
  SharedQuoteOperationError: class SharedQuoteOperationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "SharedQuoteOperationError";
    }
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { authorizeQuote } from "./domain";

class MockFormData {
  private data = new Map<string, string>();
  get(name: string): string | null { return this.data.get(name) ?? null; }
  set(name: string, value: string): void { this.data.set(name, value); }
}

type MockTx = {
  quote: { create: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; findUniqueOrThrow: ReturnType<typeof vi.fn>; updateMany: ReturnType<typeof vi.fn> };
  quoteItem: { deleteMany: ReturnType<typeof vi.fn>; createMany: ReturnType<typeof vi.fn> };
  quoteSection: { deleteMany: ReturnType<typeof vi.fn> };
  payment: { count: ReturnType<typeof vi.fn>; aggregate: ReturnType<typeof vi.fn> };
  sharedQuote: { updateMany: ReturnType<typeof vi.fn> };
  paymentRequest: { updateMany: ReturnType<typeof vi.fn> };
  quoteLifecycleEvent: { create: ReturnType<typeof vi.fn> };
};

function mockTx(status: QuoteStatus = QuoteStatus.DRAFT): MockTx {
  const tx: MockTx = {
    quote: {
      create: vi.fn().mockResolvedValue({ id: "quote-1", totalCents: 197200, sections: [{ id: "sec-1", sortOrder: 0 }] }),
      findUnique: vi.fn().mockResolvedValue({ id: "quote-1", status, operationalDate: new Date("2026-07-14T00:00:00.000Z"), items: [], sections: [{ id: "sec-1", sortOrder: 0 }] }),
      update: vi.fn().mockResolvedValue({ id: "quote-1", totalCents: 197200, sections: [{ id: "sec-1", sortOrder: 0 }] }),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
    quoteItem: { deleteMany: vi.fn(), createMany: vi.fn() },
    quoteSection: { deleteMany: vi.fn() },
    payment: { count: vi.fn().mockResolvedValue(0), aggregate: vi.fn().mockResolvedValue({ _sum: { amountCents: null } }) },
    sharedQuote: { updateMany: vi.fn() },
    paymentRequest: { updateMany: vi.fn() },
    quoteLifecycleEvent: { create: vi.fn() },
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
    discountCents: 0,
    operationalDate: "2026-07-14",
    sections: [{ name: "General", items: [{ type: "SERVICE" as const, description: "Cambio de aceite", quantity: 2, unitPriceCents: 85000 }] }],
  };
}

function buildFormData(overrides: Record<string, string> = {}) {
  const formData = new MockFormData();
  const defaults: Record<string, string> = {
    customerId: "cust-1", plate: "", brand: "", model: "Hilux", color: "", year: "",
    title: "Servicio", description: "", taxEnabled: "on", discount: "0", operationalDate: "2026-07-14",
    "sections.0.name": "General",
    "sections.0.items.0.type": "SERVICE", "sections.0.items.0.description": "Cambio de aceite", "sections.0.items.0.quantity": "1", "sections.0.items.0.unitPrice": "100",
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
    sections: [{ name: "General", items: [{ type: "SERVICE" as const, description: "Asesoría", quantity: 1, unitPriceCents: 50000 }] }],
  };
}

describe("createQuote", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it("creates a quote linked to a vehicle when vehicle data is provided", async () => {
    const tx = mockTx();
    const result = await createQuote(validInput());

    expect(findOrCreateVehicle).toHaveBeenCalledTimes(1);
    expect(requireOperationalRole).toHaveBeenCalledTimes(1);
    expect(nextQuoteNumber).toHaveBeenCalledWith(tx);
    expect(tx.quote.create).toHaveBeenCalledTimes(1);
    expect(tx.quoteItem.createMany).not.toHaveBeenCalled();
    expect(tx.quote.create.mock.calls[0][0].include).toEqual({ sections: true });
    const createData = tx.quote.create.mock.calls[0][0].data;
    expect(createData.vehicleId).toBe("vehicle-1");
    expect(createData.vehicleSnapshot).toEqual({
      plate: null,
      brand: "Toyota",
      model: "Hilux",
      color: null,
      year: null,
    });
    expect(createData.id).toEqual(expect.any(String));
    expect(createData.status).toBe("DRAFT");
    expect(createData.operationalDate).toEqual(new Date("2026-07-14T00:00:00.000Z"));
    expect(createData.sharedQuotes.create).toEqual({
      token: "stable-token",
      expiresAt: new Date("2026-08-31T00:00:00.000Z"),
    });
    expect(createData.sections.create).toEqual([{
      name: "General",
      sortOrder: 0,
      items: {
        create: [{
          quote: { connect: { id: createData.id } },
          type: "SERVICE",
          description: "Cambio de aceite",
          quantity: 2,
          unitPriceCents: 85000,
          totalCents: 170000,
          sortOrder: 0,
        }],
      },
    }]);
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

  it("defaults a missing operational date to Mexico City server today", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T01:30:00.000Z"));
    const tx = mockTx();

    await createQuote({ ...validInput(), operationalDate: undefined });

    expect(tx.quote.create.mock.calls[0][0].data.operationalDate)
      .toEqual(new Date("2026-07-14T00:00:00.000Z"));
  });

  it("rejects a future operational date before creating a quote", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T18:00:00.000Z"));
    const tx = mockTx();

    await expect(createQuote({ ...validInput(), operationalDate: "2026-07-16" })).rejects.toThrow();
    expect(tx.quote.create).not.toHaveBeenCalled();
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
    expect(updateData.operationalDate).toEqual(new Date("2026-07-14T00:00:00.000Z"));
    expect(updateData.sections.create).toHaveLength(1);
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

  it("allows updating a quote with a COMPLETED work order", async () => {
    const tx = mockTx();
    tx.quote.findUnique.mockResolvedValue({
      id: "quote-1",
      status: QuoteStatus.DRAFT,
      operationalDate: new Date("2026-07-14T00:00:00.000Z"),
      items: [],
      workOrder: { id: "wo-1", status: "COMPLETED" },
    });
    const result = await updateDraftQuote("quote-1", validInput());
    expect(result.totalCents).toBe(197200);
  });

  it("allows updating a DRAFT quote with a PLANNED work order", async () => {
    const tx = mockTx();
    tx.quote.findUnique.mockResolvedValue({
      id: "quote-1",
      status: QuoteStatus.DRAFT,
      operationalDate: new Date("2026-07-14T00:00:00.000Z"),
      items: [],
      workOrder: { id: "wo-1", status: "PLANNED" },
    });
    tx.quote.update.mockResolvedValue({ id: "quote-1", totalCents: 197200, sections: [{ id: "sec-1", sortOrder: 0 }] });

    const result = await updateDraftQuote("quote-1", validInput());

    expect(result.totalCents).toBe(197200);
    expect(tx.quoteItem.deleteMany).toHaveBeenCalledWith({ where: { quoteId: "quote-1" } });
  });

  it("allows updating a SENT quote when not expired and work order is not terminal", async () => {
    const tx = mockTx(QuoteStatus.SENT);
    tx.quote.update.mockResolvedValue({ id: "quote-1", totalCents: 197200, sections: [{ id: "sec-1", sortOrder: 0 }] });

    const result = await updateDraftQuote("quote-1", validInput());

    expect(result.totalCents).toBe(197200);
    expect(tx.quote.update.mock.calls[0][0].data.status).toBeUndefined();
  });

  it("rejects an operational date change after a quote leaves DRAFT", async () => {
    const tx = mockTx(QuoteStatus.SENT);

    await expect(updateDraftQuote("quote-1", { ...validInput(), operationalDate: "2026-07-13" }))
      .rejects.toThrow("Only draft quotes can change their operational date.");
    expect(tx.quote.update).not.toHaveBeenCalled();
  });

  it("allows updating an APPROVED quote when not expired and work order is not terminal", async () => {
    const tx = mockTx(QuoteStatus.APPROVED);
    tx.quote.update.mockResolvedValue({ id: "quote-1", totalCents: 197200, sections: [{ id: "sec-1", sortOrder: 0 }] });

    const result = await updateDraftQuote("quote-1", validInput());

    expect(result.totalCents).toBe(197200);
  });

  it("rejects updating a quote to a total lower than its paid cash payments", async () => {
    const tx = mockTx(QuoteStatus.APPROVED);
    tx.quote.findUnique.mockResolvedValue({
      id: "quote-1",
      status: QuoteStatus.APPROVED,
      operationalDate: new Date("2026-07-14T00:00:00.000Z"),
      totalCents: 250000,
      items: [],
      workOrder: null,
    });
    tx.payment.aggregate.mockResolvedValue({ _sum: { amountCents: 250000 } });

    await expect(updateDraftQuote("quote-1", validInput())).rejects.toThrow(
      "Esta cotización ya tiene 2500 abonados, el nuevo total no puede ser menor a esa cantidad.",
    );

    expect(tx.payment.aggregate).toHaveBeenCalledWith({
      where: { quoteId: "quote-1", status: PaymentStatus.PAID },
      _sum: { amountCents: true },
    });
    expect(tx.quoteItem.deleteMany).not.toHaveBeenCalled();
    expect(tx.quote.update).not.toHaveBeenCalled();
  });

  it("allows updating a REJECTED quote when not expired and work order is not terminal", async () => {
    const tx = mockTx(QuoteStatus.REJECTED);
    tx.quote.update.mockResolvedValue({ id: "quote-1", totalCents: 197200, sections: [{ id: "sec-1", sortOrder: 0 }] });

    const result = await updateDraftQuote("quote-1", validInput());

    expect(result.totalCents).toBe(197200);
  });

  it("allows updating when the quote is expired", async () => {
    const tx = mockTx(QuoteStatus.DRAFT);
    tx.quote.findUnique.mockResolvedValue({
      id: "quote-1",
      status: QuoteStatus.DRAFT,
      operationalDate: new Date("2026-07-14T00:00:00.000Z"),
      items: [],
      validUntil: new Date("2020-01-01T00:00:00.000Z"),
      workOrder: null,
    });

    const result = await updateDraftQuote("quote-1", validInput());
    expect(result.totalCents).toBe(197200);
  });

  it("allows updating a SENT quote when it has a COMPLETED work order", async () => {
    const tx = mockTx(QuoteStatus.SENT);
    tx.quote.findUnique.mockResolvedValue({
      id: "quote-1",
      status: QuoteStatus.SENT,
      operationalDate: new Date("2026-07-14T00:00:00.000Z"),
      items: [],
      validUntil: new Date("2026-12-31T00:00:00.000Z"),
      workOrder: { id: "wo-1", status: "COMPLETED" },
    });

    const result = await updateDraftQuote("quote-1", validInput());
    expect(result.totalCents).toBe(197200);
  });
});

describe("updateDraftQuoteFromForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("parses valid form data and redirects on success", async () => {
    mockTx();
    await updateDraftQuoteFromForm("quote-1", {}, buildFormData({ "sections.0.items.0.unitPrice": "850" }) as unknown as FormData);
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

  it("returns the specific paid-total error", async () => {
    const tx = mockTx(QuoteStatus.APPROVED);
    tx.quote.findUnique.mockResolvedValue({
      id: "quote-1",
      status: QuoteStatus.APPROVED,
      operationalDate: new Date("2026-07-14T00:00:00.000Z"),
      items: [],
      workOrder: null,
    });
    tx.payment.aggregate.mockResolvedValue({ _sum: { amountCents: 250000 } });

    await expect(updateDraftQuoteFromForm("quote-1", {}, buildFormData() as unknown as FormData)).resolves.toEqual({
      error: "Esta cotización ya tiene 2500 abonados, el nuevo total no puede ser menor a esa cantidad.",
    });
  });

  it("updates form successfully when the quote has a COMPLETED work order", async () => {
    const tx = mockTx();
    tx.quote.findUnique.mockResolvedValue({
      id: "quote-1",
      status: QuoteStatus.DRAFT,
      operationalDate: new Date("2026-07-14T00:00:00.000Z"),
      items: [],
      workOrder: { id: "wo-1", status: "COMPLETED" },
    });
    await updateDraftQuoteFromForm("quote-1", {}, buildFormData({ "sections.0.items.0.unitPrice": "850" }) as unknown as FormData);
    expect(redirect).toHaveBeenCalledWith("/admin/quotes?updated=1");
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
      "sections.0.items.1.type": "EQUIPMENT",
      "sections.0.items.1.description": "",
      "sections.0.items.1.quantity": "1",
      "sections.0.items.1.unitPrice": "",
    });

    await createQuoteFromForm({}, formData as unknown as FormData);

    expect(requireOperationalRole).toHaveBeenCalledTimes(1);
    const sections = tx.quote.create.mock.calls[0][0].data.sections.create;
    expect(sections).toHaveLength(1);
    expect(sections[0].items.create).toHaveLength(1);
    expect(sections[0].items.create[0].description).toBe("Cambio de aceite");
    expect(tx.quoteItem.createMany).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/admin/quotes?created=1");
  });
});

describe.each([
  ["create", (formData: FormData) => createQuoteFromWorkspace({}, formData), "No se pudo crear la cotización. Intenta de nuevo."],
  ["update", (formData: FormData) => updateDraftQuoteFromWorkspace("quote-1", {}, formData), "No se pudo guardar la cotización. Intenta de nuevo."],
])("%s quote workspace action", (_name, action, persistenceError) => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success and revalidates valid data", async () => {
    mockTx();
    await expect(action(buildFormData() as unknown as FormData)).resolves.toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/quotes");
  });

  it("returns the validation error for invalid form data", async () => {
    await expect(action(buildFormData({ title: "" }) as unknown as FormData))
      .resolves.toEqual({ error: "Revisa los datos e intenta de nuevo." });
  });

  it("returns the persistence error", async () => {
    const tx = mockTx();
    tx.quote.create.mockRejectedValue(new Error("database unavailable"));
    tx.quote.update.mockRejectedValue(new Error("database unavailable"));
    await expect(action(buildFormData() as unknown as FormData)).resolves.toEqual({ error: persistenceError });
  });
});

describe("authorizeQuoteAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOperationalRole).mockResolvedValue({
      user: { id: "user-1" },
      profile: { id: "user-1" },
    } as unknown as Awaited<ReturnType<typeof requireOperationalRole>>);
  });

  it("revalidates the quotes route after authorization", async () => {
    await expect(authorizeQuoteAction("quote-1", "Llamada telefónica")).resolves.toEqual({
      success: true,
    });

    expect(authorizeQuote).toHaveBeenCalledWith("quote-1", "Llamada telefónica", "user-1");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/quotes");
  });
});

it("returns the non-editable state from the update workspace action", async () => {
  mockTx(QuoteStatus.CANCELLED);
  await expect(updateDraftQuoteFromWorkspace("quote-1", {}, buildFormData() as unknown as FormData))
    .resolves.toEqual({ error: "Esta cotización ya no se puede editar." });
});

it("returns the specific paid-total error from the update workspace action", async () => {
  const tx = mockTx(QuoteStatus.APPROVED);
  tx.quote.findUnique.mockResolvedValue({
    id: "quote-1",
    status: QuoteStatus.APPROVED,
    operationalDate: new Date("2026-07-14T00:00:00.000Z"),
    items: [],
    workOrder: null,
  });
  tx.payment.aggregate.mockResolvedValue({ _sum: { amountCents: 250000 } });

  await expect(updateDraftQuoteFromWorkspace("quote-1", {}, buildFormData() as unknown as FormData)).resolves.toEqual({
    error: "Esta cotización ya tiene 2500 abonados, el nuevo total no puede ser menor a esa cantidad.",
  });
});

describe("duplicateQuote", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it("creates a new DRAFT quote with a fresh number and validity while copying quote fields and items", async () => {
    const tx = mockTx();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T18:00:00.000Z"));
    (prisma.quote.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "quote-source",
      customerId: "cust-1",
      vehicleId: "vehicle-source",
      vehicleSnapshot: { plate: "ABC123", brand: "Historical Toyota", model: "Hilux", color: "Blanco", year: 2022 },
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
      operationalDate: new Date("2026-06-01T00:00:00.000Z"),
      workOrder: { id: "wo-source" },
      sharedQuotes: [{ id: "shared-source" }],
      paymentRequests: [{ id: "payment-source" }],
      items: [{
        id: "legacy-item",
        quoteId: "quote-source",
        sectionId: null,
        type: "SERVICE",
        description: "Legacy alignment",
        quantity: new Prisma.Decimal("1.50"),
        unitPriceCents: 10000,
        totalCents: 15000,
        sortOrder: 4,
      }],
      sections: [
        {
          id: "section-1",
          quoteId: "quote-source",
          name: "General",
          sortOrder: 0,
          items: [
            {
              id: "item-2",
              quoteId: "quote-source",
              sectionId: "section-1",
              type: "PART",
              description: "Filtro",
              quantity: new Prisma.Decimal("1.00"),
              unitPriceCents: 20000,
              totalCents: 20000,
              sortOrder: 2,
            },
            {
              id: "item-1",
              quoteId: "quote-source",
              sectionId: "section-1",
              type: "SERVICE",
              description: "Cambio de aceite",
              quantity: new Prisma.Decimal("2.00"),
              unitPriceCents: 85000,
              totalCents: 170000,
              sortOrder: 5,
            },
          ],
        },
      ],
    });
    tx.quote.create.mockResolvedValue({ id: "quote-copy", number: "C-0626-01", status: QuoteStatus.DRAFT });

    const result = await duplicateQuote("quote-source");

    expect(prisma.quote.findUnique).toHaveBeenCalledWith({
      where: { id: "quote-source" },
      relationLoadStrategy: "join",
      include: {
        items: { where: { sectionId: null }, orderBy: { sortOrder: "asc" } },
        sections: { include: { items: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } },
      },
    });
    expect(nextQuoteNumber).toHaveBeenCalledWith(tx);
    expect(requireOperationalRole).toHaveBeenCalledTimes(1);
    expect(findOrCreateVehicle).not.toHaveBeenCalled();
    expect(tx.quote.create).toHaveBeenCalledTimes(1);
    expect(tx.quoteItem.createMany).not.toHaveBeenCalled();
    expect(tx.quote.create.mock.calls[0][0].include).toEqual({ sections: true });
    expect(result).toEqual({ id: "quote-copy", number: "C-0626-01", status: QuoteStatus.DRAFT });

    const createData = tx.quote.create.mock.calls[0][0].data;
    expect(createData).toMatchObject({
      customerId: "cust-1",
      vehicleId: "vehicle-source",
      vehicleSnapshot: { plate: "ABC123", brand: "Historical Toyota", model: "Hilux", color: "Blanco", year: 2022 },
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
      operationalDate: new Date("2026-07-15T00:00:00.000Z"),
    });
    expect(createData.id).toEqual(expect.any(String));
    expect(createData.items.create).toEqual([{
      type: "SERVICE",
      description: "Legacy alignment",
      quantity: new Prisma.Decimal("1.50"),
      unitPriceCents: 10000,
      totalCents: 15000,
      sortOrder: 0,
    }]);
    expect(createData.sections.create).toEqual([{
      name: "General",
      sortOrder: 0,
      items: {
        create: [
          {
            quote: { connect: { id: createData.id } },
            type: "PART",
            description: "Filtro",
            quantity: new Prisma.Decimal("1.00"),
            unitPriceCents: 20000,
            totalCents: 20000,
            sortOrder: 0,
          },
          {
            quote: { connect: { id: createData.id } },
            type: "SERVICE",
            description: "Cambio de aceite",
            quantity: new Prisma.Decimal("2.00"),
            unitPriceCents: 85000,
            totalCents: 170000,
            sortOrder: 1,
          },
        ],
      },
    }]);
    expect(createData).not.toHaveProperty("workOrder");
    expect(createData.sharedQuotes.create).toEqual({
      token: "stable-token",
      expiresAt: new Date("2026-08-31T00:00:00.000Z"),
    });
    expect(createData).not.toHaveProperty("paymentRequests");
  });

  it("creates a duplicate without a linked vehicle when the original has no vehicle", async () => {
    const tx = mockTx();
    (prisma.quote.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "quote-source",
      customerId: "cust-1",
      vehicleId: null,
      vehicleSnapshot: null,
      title: "Servicio sin vehículo",
      description: null,
      administrative: false,
      taxEnabled: false,
      subtotalCents: 50000,
      taxCents: 0,
      totalCents: 50000,
      items: [],
      sections: [],
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
      vehicleId: null,
      vehicleSnapshot: null,
      title: "Servicio",
      description: null,
      administrative: false,
      taxEnabled: false,
      subtotalCents: 50000,
      taxCents: 0,
      totalCents: 50000,
      items: [],
      sections: [],
    });

    const formData = new MockFormData();
    formData.set("quoteId", "quote-source");

    await duplicateQuoteFromForm(formData as unknown as FormData);

    expect(tx.quote.create).toHaveBeenCalledTimes(1);
    expect(requireOperationalRole).toHaveBeenCalledTimes(1);
    expect(revalidatePath).not.toHaveBeenCalled();
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

describe("deleteQuote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("authorizes direct deletion and soft-deletes once", async () => {
    const tx = mockTx();

    await deleteQuote("quote-1");

    expect(requireOperationalRole).toHaveBeenCalledTimes(1);
    expect(tx.quote.update).toHaveBeenCalledTimes(1);
    expect(tx.quote.update).toHaveBeenCalledWith({
      where: { id: "quote-1" },
      data: { deletedAt: expect.any(Date) },
    });
  });
});

describe("deleteQuoteFromForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("authorizes and soft-deletes once before redirecting without revalidation", async () => {
    const tx = mockTx();
    const formData = new MockFormData();
    formData.set("quoteId", "quote-1");

    await deleteQuoteFromForm(formData as unknown as FormData);

    expect(requireOperationalRole).toHaveBeenCalledTimes(1);
    expect(tx.quote.update).toHaveBeenCalledTimes(1);
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/admin/quotes?deleted=1");
  });
});

describe("cancelQuote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cancels a DRAFT quote without deleting it", async () => {
    const tx = mockTx();
    tx.quote.updateMany.mockResolvedValue({ count: 1 });
    tx.quote.findUniqueOrThrow.mockResolvedValue({ id: "quote-1", status: QuoteStatus.CANCELLED });

    const result = await cancelQuote("quote-1");

    expect(tx.quote.updateMany).toHaveBeenCalledWith({
      where: { id: "quote-1", status: QuoteStatus.DRAFT },
      data: { status: QuoteStatus.CANCELLED },
    });
    expect(result.status).toBe(QuoteStatus.CANCELLED);
  });

  it("throws when the quote is not found", async () => {
    const tx = mockTx();
    tx.quote.findUnique.mockResolvedValue(null);
    await expect(cancelQuote("quote-1")).rejects.toThrow("Quote not found.");
  });

  it("throws when the quote is not in DRAFT status", async () => {
    mockTx(QuoteStatus.APPROVED);
    await expect(cancelQuote("quote-1")).rejects.toThrow("Only draft quotes can be cancelled.");
  });
});

describe("cancelQuoteFromForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cancels a draft quote from form data and redirects", async () => {
    const tx = mockTx();
    tx.quote.updateMany.mockResolvedValue({ count: 1 });
    tx.quote.findUniqueOrThrow.mockResolvedValue({ id: "quote-1", status: QuoteStatus.CANCELLED });

    const formData = new MockFormData();
    formData.set("quoteId", "quote-1");

    await cancelQuoteFromForm(formData as unknown as FormData);

    expect(redirect).toHaveBeenCalledWith("/admin/quotes?cancelled=1");
  });

  it("redirects with invalid-cancellation when quoteId is missing", async () => {
    await cancelQuoteFromForm(new MockFormData() as unknown as FormData);
    expect(redirect).toHaveBeenCalledWith("/admin/quotes?error=invalid-cancellation");
  });

  it("redirects with not-draft error when quote is no longer draft", async () => {
    mockTx(QuoteStatus.SENT);
    const formData = new MockFormData();
    formData.set("quoteId", "quote-1");

    await cancelQuoteFromForm(formData as unknown as FormData);

    expect(redirect).toHaveBeenCalledWith("/admin/quotes?error=not-draft");
  });
});

describe("quote lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireOperationalRole as ReturnType<typeof vi.fn>).mockResolvedValue({ profile: { id: "actor-1" } });
  });

  it("archives only an eligible quote while revoking links, cancelling requests, and recording the event", async () => {
    const tx = mockTx();
    tx.quote.updateMany.mockResolvedValue({ count: 1 });

    await archiveQuote("quote-1", "Reference quote retained for future pricing.");

    expect(tx.quote.updateMany).toHaveBeenCalledWith({ where: { id: "quote-1", status: QuoteStatus.DRAFT }, data: { status: QuoteStatus.ARCHIVED } });
    expect(tx.sharedQuote.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { revokedAt: expect.any(Date) } }));
    expect(tx.paymentRequest.updateMany).toHaveBeenCalledWith({
      where: { quoteId: "quote-1", status: { notIn: ["CANCELLED", "EXPIRED"] } },
      data: { status: "CANCELLED" },
    });
    expect(tx.quoteLifecycleEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ previousState: QuoteStatus.DRAFT, nextState: QuoteStatus.ARCHIVED, actorId: "actor-1", reason: "Reference quote retained for future pricing." }) });
  });

  it("rejects a missing reason and quotes with financial activity", async () => {
    await expect(archiveQuote("quote-1", " ")).rejects.toThrow("Archive reason is required.");
    const tx = mockTx();
    tx.payment.count.mockResolvedValue(1);
    await expect(archiveQuote("quote-1", "Keep for reference")).rejects.toThrow("financial activity");
    expect(tx.quote.updateMany).not.toHaveBeenCalled();
  });

  it("restores only an archived quote to draft and records a separate event", async () => {
    const tx = mockTx();
    tx.quote.updateMany.mockResolvedValue({ count: 1 });

    await restoreArchivedQuote("quote-1", "Customer requested a revised estimate.");

    expect(tx.quote.updateMany).toHaveBeenCalledWith({ where: { id: "quote-1", status: QuoteStatus.ARCHIVED }, data: { status: QuoteStatus.DRAFT } });
    expect(tx.quoteLifecycleEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ previousState: QuoteStatus.ARCHIVED, nextState: QuoteStatus.DRAFT }) });
    expect(tx.sharedQuote.updateMany).not.toHaveBeenCalled();
    expect(tx.paymentRequest.updateMany).not.toHaveBeenCalled();
  });
});

describe("publishSharedQuote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("conditionally publishes a draft without reading or creating a token", async () => {
    const updateMany = prisma.quote.updateMany as ReturnType<typeof vi.fn>;
    updateMany.mockResolvedValue({ count: 1 });

    await expect(publishSharedQuote("quote-1")).resolves.toEqual({ success: true });

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "quote-1", status: QuoteStatus.DRAFT },
      data: { status: QuoteStatus.SENT },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
