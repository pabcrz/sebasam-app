import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { PaymentStatus, Prisma, QuoteStatus, WorkOrderStatus } from "@prisma/client";
import {
  cancelQuote,
  archiveQuote,
  archiveCompletedNote,
  cancelQuoteFromForm,
  authorizeQuoteAction,
  createQuote,
  createQuoteFromForm,
  createQuoteFromWorkspace,
  correctCompletedWorkQuote,
  correctCompletedWorkQuoteFromWorkspace,
  deleteQuote,
  deleteQuoteFromForm,
  duplicateQuote,
  duplicateQuoteFromForm,
  getOrCreateSharedQuoteAction,
  lockQuoteAction,
  publishSharedQuote,
  revokeNoteCanonicalLinkAction,
  restoreArchivedQuote,
  restoreTrashedQuote,
  unlockQuoteAction,
  updateDraftQuote,
  updateDraftQuoteFromForm,
  updateDraftQuoteFromWorkspace,
} from "./actions";
import { prisma } from "@/lib/prisma";
import { findOrCreateVehicle } from "@/features/vehicles/actions";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireOperationalRole } from "@/lib/auth/session";
import { nextQuoteNumber } from "./lib/sequence";

vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: vi.fn(), quote: { findUnique: vi.fn(), updateMany: vi.fn() } } }));
vi.mock("@/lib/auth/session", () => ({ requireOperationalRole: vi.fn(), requireAdmin: vi.fn() }));
vi.mock("@/features/vehicles/actions", () => ({ findOrCreateVehicle: vi.fn() }));
vi.mock("@/features/vehicles/schemas", async () => ({
  ...(await vi.importActual<typeof import("@/features/vehicles/schemas")>("@/features/vehicles/schemas")),
  createVehicleSnapshot: vi.fn(() => ({ plate: null, brand: "Toyota", model: "Hilux", color: null, year: null })),
}));
vi.mock("./lib/sequence", () => ({
  nextQuoteNumber: vi.fn(() => Promise.resolve("C-0626-01")),
  withQuoteNumberRetry: vi.fn((operation: () => Promise<unknown>) => operation()),
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
  getOrCreateSharedQuoteForQuote: vi.fn(),
  ensureSharedQuoteInTransaction: vi.fn().mockResolvedValue({ id: "sq-1", token: "tok-1" }),
  revokeCanonicalNoteSharedQuote: vi.fn(),
  SharedQuoteOperationError: class SharedQuoteOperationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "SharedQuoteOperationError";
    }
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { authorizeQuote, getOrCreateSharedQuoteForQuote, revokeCanonicalNoteSharedQuote } from "./domain";

type MockTx = {
  $queryRaw: ReturnType<typeof vi.fn>;
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
  quote: { create: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn>; findUniqueOrThrow: ReturnType<typeof vi.fn>; updateMany: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  quoteItem: { deleteMany: ReturnType<typeof vi.fn>; createMany: ReturnType<typeof vi.fn> };
  quoteSection: { deleteMany: ReturnType<typeof vi.fn> };
  quoteDecision: { create: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn> };
  payment: { count: ReturnType<typeof vi.fn>; aggregate: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  paymentApplication: { count: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  ledgerEntry: { count: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  workOrderLaborAdvance: { count: ReturnType<typeof vi.fn> };
  quoteCommercialCorrection: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  quoteCommercialCorrectionApplication: { createMany: ReturnType<typeof vi.fn> };
  settlementAgreement: { update: ReturnType<typeof vi.fn> };
  settlementAgreementRevision: { count: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  sharedQuote: { updateMany: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn> };
  paymentRequest: { updateMany: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn> };
  payableNote: { create: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  quoteLifecycleEvent: { create: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn> };
  workOrder: { count: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  customer?: { findUnique: ReturnType<typeof vi.fn> };
  customerContact?: { findUnique: ReturnType<typeof vi.fn> };
};

function mockTx(status: QuoteStatus = QuoteStatus.DRAFT): MockTx {
  const tx: MockTx = {
    $queryRaw: vi.fn().mockResolvedValue([{ lastSequence: 1 }]),
    $queryRawUnsafe: vi.fn().mockResolvedValue([]),
    quote: {
      create: vi.fn().mockResolvedValue({ id: "quote-1", totalCents: 197200, sections: [{ id: "sec-1", isAuthorized: false, sortOrder: 0 }] }),
      findUnique: vi.fn().mockResolvedValue({ id: "quote-1", status, customerId: "cust-1", subtotalCents: 10000, discountCents: 0, taxCents: 1600, totalCents: 11600, taxEnabled: true, operationalDate: new Date("2026-07-14T00:00:00.000Z"), approvedAt: new Date("2026-07-10T00:00:00.000Z"), items: [{ description: "Service", quantity: 1, unitPriceCents: 10000 }], sections: [{ id: "sec-1", sortOrder: 0, items: [{ description: "Service", quantity: 1, unitPriceCents: 10000 }] }] }),
      update: vi.fn().mockResolvedValue({ id: "quote-1", totalCents: 197200, sections: [{ id: "sec-1", sortOrder: 0 }] }),
      delete: vi.fn().mockResolvedValue({ id: "quote-1" }),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    quoteItem: { deleteMany: vi.fn(), createMany: vi.fn() },
    quoteSection: { deleteMany: vi.fn() },
    quoteDecision: { create: vi.fn(), deleteMany: vi.fn() },
    payment: { count: vi.fn().mockResolvedValue(0), aggregate: vi.fn().mockResolvedValue({ _sum: { amountCents: null } }), findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
    paymentApplication: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockImplementation((args) => Promise.resolve({ id: "replacement-app-1", ...args.data })), update: vi.fn().mockResolvedValue({ id: "app-1" }) },
    ledgerEntry: { count: vi.fn().mockResolvedValue(0), findFirst: vi.fn().mockResolvedValue({ id: "orig-ledger-1" }), create: vi.fn().mockImplementation((args) => Promise.resolve({ id: "ledger-entry-1", ...args.data })) },
    workOrderLaborAdvance: { count: vi.fn().mockResolvedValue(0) },
    quoteCommercialCorrection: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: "correction-1" }) },
    quoteCommercialCorrectionApplication: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    settlementAgreement: { update: vi.fn().mockResolvedValue({ id: "settlement-1" }) },
    settlementAgreementRevision: { count: vi.fn().mockResolvedValue(0), create: vi.fn().mockResolvedValue({ id: "rev-1" }) },
    sharedQuote: { updateMany: vi.fn(), deleteMany: vi.fn() },
    paymentRequest: { updateMany: vi.fn(), deleteMany: vi.fn() },
    payableNote: {
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: data.id, ...data })),
      findUnique: vi.fn().mockResolvedValue({ id: "wo-1" }),
      update: vi.fn().mockResolvedValue({ id: "payable-note-1" }),
      delete: vi.fn(),
    },
    quoteLifecycleEvent: { create: vi.fn(), deleteMany: vi.fn() },
    workOrder: { count: vi.fn().mockResolvedValue(0), findUnique: vi.fn().mockResolvedValue(null), delete: vi.fn() },
  };
  (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback: (tx: MockTx) => Promise<unknown>) => callback(tx));
  (findOrCreateVehicle as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "vehicle-1" });
  (requireAdmin as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: "admin-1" }, profile: { id: "admin-1", role: "ADMIN" } });
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
    sections: [{ name: "General", items: [{ type: "LABOR" as const, description: "Cambio de aceite", quantity: 2, unitPriceCents: 85000 }] }],
  };
}

function buildFormData(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const defaults: Record<string, string> = {
    customerId: "cust-1", plate: "", brand: "", model: "Hilux", color: "", year: "",
    title: "Servicio", description: "", taxEnabled: "on", discount: "0", operationalDate: "2026-07-14",
    "sections.0.name": "General",
    "sections.0.items.0.type": "LABOR", "sections.0.items.0.description": "Cambio de aceite", "sections.0.items.0.quantity": "1", "sections.0.items.0.unitPrice": "100",
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
    sections: [{ name: "General", items: [{ type: "LABOR" as const, description: "Asesoría", quantity: 1, unitPriceCents: 50000 }] }],
  };
}

describe("createQuote", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it("creates a quote linked to a vehicle when vehicle data and customer are provided", async () => {
    const tx = mockTx();
    const result = await createQuote(validInput());

    expect(findOrCreateVehicle).toHaveBeenCalledTimes(1);
    expect(requireOperationalRole).toHaveBeenCalledTimes(1);
    expect(nextQuoteNumber).toHaveBeenCalledWith(tx);
    expect(tx.quote.create).toHaveBeenCalledTimes(1);
    expect(tx.quoteItem.createMany).toHaveBeenCalledWith({
      data: [{
        quoteId: "quote-1",
        sectionId: "sec-1",
        type: "LABOR",
        description: "Cambio de aceite",
        quantity: 2,
        unitPriceCents: 85000,
        totalCents: 170000,
        includeInPayroll: true,
        customRatePercent: null,
        sortOrder: 0,
      }],
    });
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
    expect(createData.operation).toBe("WORK");
    expect(createData.operationalDate).toEqual(new Date("2026-07-14T00:00:00.000Z"));
    expect(createData).not.toHaveProperty("sharedQuotes");
    expect(createData.sections.create).toEqual([{
      isAuthorized: false,
      name: "General",
      sortOrder: 0,
    }]);
    expect(result.totalCents).toBe(197200);
  });

  it("persists a SALE operation on a material-only draft without issuing a note", async () => {
    const tx = mockTx();
    await createQuote({
      ...validInput(),
      operation: "SALE",
      sections: [{ name: "General", items: [{ type: "MATERIAL" as const, description: "Filtro", quantity: 1, unitPriceCents: 85000 }] }],
    });

    expect(tx.quote.create.mock.calls[0]?.[0].data.operation).toBe("SALE");
    expect(tx.payableNote.create).not.toHaveBeenCalled();
  });

  it("creates a draft quote with vehicle data but without a customer, storing snapshot without linking Vehicle", async () => {
    const tx = mockTx();
    const draftWithoutCustomer = {
      ...validInput(),
      customerId: undefined,
    };

    const result = await createQuote(draftWithoutCustomer);

    expect(findOrCreateVehicle).not.toHaveBeenCalled();
    expect(tx.quote.create).toHaveBeenCalledTimes(1);
    const createData = tx.quote.create.mock.calls[0][0].data;
    expect(createData.customerId).toBeNull();
    expect(createData.vehicleId).toBeNull();
    expect(createData.vehicleSnapshot).toEqual({
      plate: null,
      brand: "Toyota",
      model: "Hilux",
      color: null,
      year: null,
    });
    expect(tx.quoteItem.createMany).toHaveBeenCalledTimes(1);
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

  it("rejects persistence without a customer or identifiable unit", async () => {
    const tx = mockTx();

    await expect(createQuote({
      ...validInput(),
      customerId: "",
      vehicle: { plate: "", brand: "Toyota", model: "", color: "", year: "" },
    })).rejects.toThrow("Selecciona un cliente o identifica la unidad");
    expect(tx.quote.create).not.toHaveBeenCalled();
  });

  it("persists customerContactId, customerFiscalProfileId, and snapshots when provided", async () => {
    const tx = mockTx();
    tx.customer = {
      findUnique: vi.fn().mockResolvedValue({
        id: "cust-1",
        name: "Juan Perez",
        commercialName: "Taller Perez",
        legalName: "Juan Perez SA de CV",
        email: "juan@example.com",
        phone: "5512345678",
        address: "Av Central 1",
        fiscalProfiles: [{ id: "fp-1", businessName: "Juan Perez SA de CV", taxId: "JUP900101XYZ" }],
      }),
    };
    tx.customerContact = {
      findUnique: vi.fn().mockResolvedValue({
        id: "contact-1",
        name: "El Mariachi",
        phone: "5511223344",
        role: "DRIVER",
      }),
    };

    const input = {
      ...validInput(),
      customerContactId: "contact-1",
      customerFiscalProfileId: "fp-1",
      vehicle: {
        ...validInput().vehicle,
        economicNumber: "ECO-100",
      },
    };

    await createQuote(input);

    expect(tx.quote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerContactId: "contact-1",
          customerFiscalProfileId: "fp-1",
          customerSnapshot: expect.objectContaining({
            customerId: "cust-1",
            commercialName: "Taller Perez",
            legalName: "Juan Perez SA de CV",
          }),
          contactSnapshot: expect.objectContaining({
            id: "contact-1",
            name: "El Mariachi",
            role: "DRIVER",
          }),
        }),
      }),
    );
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

  it("updates a draft quote without a customer, storing vehicle snapshot without linking Vehicle", async () => {
    const tx = mockTx();
    const draftWithoutCustomer = {
      ...validInput(),
      customerId: undefined,
    };

    const result = await updateDraftQuote("quote-1", draftWithoutCustomer);

    expect(findOrCreateVehicle).not.toHaveBeenCalled();
    expect(tx.quote.update).toHaveBeenCalledTimes(1);
    const updateData = tx.quote.update.mock.calls[0][0].data;
    expect(updateData.customerId).toBeNull();
    expect(updateData.vehicleId).toBeNull();
    expect(updateData.vehicleSnapshot).toEqual({
      plate: null,
      brand: "Toyota",
      model: "Hilux",
      color: null,
      year: null,
    });
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

  it("blocks updates to a quote with a COMPLETED work order before it can be forced to DRAFT", async () => {
    const tx = mockTx();
    tx.quote.findUnique.mockResolvedValue({
      id: "quote-1",
      status: QuoteStatus.DRAFT,
      operationalDate: new Date("2026-07-14T00:00:00.000Z"),
      items: [],
      workOrder: { id: "wo-1", status: "COMPLETED" },
    });
    await expect(updateDraftQuote("quote-1", validInput())).rejects.toThrow("This quote is not editable.");
    expect(tx.quote.update).not.toHaveBeenCalled();
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
    expect(tx.quote.update.mock.calls[0][0].data.status).toBe("DRAFT");
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

  it("blocks updating a SENT quote when it has a COMPLETED work order", async () => {
    const tx = mockTx(QuoteStatus.SENT);
    tx.quote.findUnique.mockResolvedValue({
      id: "quote-1",
      status: QuoteStatus.SENT,
      operationalDate: new Date("2026-07-14T00:00:00.000Z"),
      items: [],
      validUntil: new Date("2026-12-31T00:00:00.000Z"),
      workOrder: { id: "wo-1", status: "COMPLETED" },
    });

    await expect(updateDraftQuote("quote-1", validInput())).rejects.toThrow("This quote is not editable.");
    expect(tx.quote.update).not.toHaveBeenCalled();
  });
});

describe("updateDraftQuoteFromForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("parses valid form data and redirects on success", async () => {
    mockTx();
    await updateDraftQuoteFromForm("quote-1", {}, buildFormData({ "sections.0.items.0.unitPrice": "850" }) as unknown as FormData);
    expect(redirect).toHaveBeenCalledWith("/admin/quotes?updated=1");
  });

  it("updates a draft through FormData with a pending price", async () => {
    const tx = mockTx();

    await updateDraftQuoteFromForm("quote-1", {}, buildFormData({ "sections.0.items.0.unitPrice": "" }));

    expect(tx.quote.update.mock.calls[0][0].data).toMatchObject({
      subtotalCents: 0,
      taxCents: 0,
      totalCents: 0,
    });
    expect(tx.quoteItem.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ unitPriceCents: null, totalCents: null })],
    });
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

  it("returns a not-editable error when the quote has a COMPLETED work order", async () => {
    const tx = mockTx();
    tx.quote.findUnique.mockResolvedValue({
      id: "quote-1",
      status: QuoteStatus.DRAFT,
      operationalDate: new Date("2026-07-14T00:00:00.000Z"),
      items: [],
      workOrder: { id: "wo-1", status: "COMPLETED" },
    });
    await expect(updateDraftQuoteFromForm("quote-1", {}, buildFormData({ "sections.0.items.0.unitPrice": "850" }) as unknown as FormData))
      .resolves.toEqual({ error: "Esta cotización ya no se puede editar." });
    expect(redirect).not.toHaveBeenCalled();
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
      .resolves.toEqual({ error: "El año del vehículo no puede ser mayor al próximo año" });
  });

  it("creates a draft through FormData with a pending price", async () => {
    const tx = mockTx();

    await createQuoteFromForm({}, buildFormData({ "sections.0.items.0.unitPrice": "" }));

    const createData = tx.quote.create.mock.calls[0][0].data;
    expect(createData).toMatchObject({ subtotalCents: 0, taxCents: 0, totalCents: 0 });
    expect(tx.quoteItem.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          unitPriceCents: null,
          totalCents: null,
        }),
      ],
    });
    expect(redirect).toHaveBeenCalledWith("/admin/quotes?created=1");
  });

  it("returns the actionable identity issue", async () => {
    await expect(createQuoteFromForm({}, buildFormData({
      customerId: "",
      plate: "",
      brand: "",
      model: "",
    }))).resolves.toEqual({
      error: "Selecciona un cliente o identifica la unidad con placas o marca y modelo.",
    });
  });

  it("submits exactly the normalized non-empty concepts", async () => {
    const tx = mockTx();
    const formData = buildFormData({
      "sections.0.items.1.type": "OTHER",
      "sections.0.items.1.description": "",
      "sections.0.items.1.quantity": "1",
      "sections.0.items.1.unitPrice": "",
    });

    await createQuoteFromForm({}, formData as unknown as FormData);

    expect(requireOperationalRole).toHaveBeenCalledTimes(1);
    const sections = tx.quote.create.mock.calls[0][0].data.sections.create;
    expect(sections).toHaveLength(1);
    expect(tx.quoteItem.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          description: "Cambio de aceite",
        }),
      ],
    });
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/admin/quotes?created=1");
  });

  it("keeps section authorization and approval out of draft persistence", async () => {
    const tx = mockTx();
    tx.quote.create.mockResolvedValue({ id: "quote-1", totalCents: 11600, sections: [{ id: "sec-1", isAuthorized: false, sortOrder: 0 }] });
    vi.mocked(requireOperationalRole).mockResolvedValue({
      user: { id: "user-1" },
      profile: { id: "user-1" },
    } as unknown as Awaited<ReturnType<typeof requireOperationalRole>>);

    await createQuoteFromForm({}, buildFormData({ "sections.0.isAuthorized": "on" }) as unknown as FormData);

    const createData = tx.quote.create.mock.calls[0][0].data;
    expect(createData.status).toBe(QuoteStatus.DRAFT);
    expect(createData.sections.create[0].isAuthorized).toBe(false);
    expect(tx.quoteDecision.create).not.toHaveBeenCalled();
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

    expect(authorizeQuote).toHaveBeenCalledWith("quote-1", "Llamada telefónica", "user-1", undefined);
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
        type: "LABOR",
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
              includeInPayroll: false,
              customRatePercent: null,
              sortOrder: 2,
            },
            {
              id: "item-1",
              quoteId: "quote-source",
              sectionId: "section-1",
              type: "LABOR",
              description: "Cambio de aceite",
              quantity: new Prisma.Decimal("2.00"),
              unitPriceCents: 85000,
              totalCents: 170000,
              includeInPayroll: true,
              customRatePercent: null,
              sortOrder: 5,
            },
          ],
        },
      ],
    });
    tx.quote.create.mockResolvedValue({ id: "quote-copy", number: "C-0626-01", status: QuoteStatus.DRAFT, sections: [{ id: "sec-1", sortOrder: 0 }] });

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
    expect(tx.quoteItem.createMany).toHaveBeenCalledWith({
      data: [
        {
          quoteId: "quote-copy",
          sectionId: "sec-1",
          type: "PART",
          description: "Filtro",
          quantity: new Prisma.Decimal("1.00"),
          unitPriceCents: 20000,
          totalCents: 20000,
          includeInPayroll: false,
          customRatePercent: null,
          sortOrder: 0,
        },
        {
          quoteId: "quote-copy",
          sectionId: "sec-1",
          type: "LABOR",
          description: "Cambio de aceite",
          quantity: new Prisma.Decimal("2.00"),
          unitPriceCents: 85000,
          totalCents: 170000,
          includeInPayroll: true,
          customRatePercent: null,
          sortOrder: 1,
        },
      ],
    });
    expect(tx.quote.create.mock.calls[0][0].include).toEqual({ sections: true });
    expect(result).toEqual({ id: "quote-copy", number: "C-0626-01", status: QuoteStatus.DRAFT, sections: [{ id: "sec-1", sortOrder: 0 }] });

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
      type: "LABOR",
      description: "Legacy alignment",
      quantity: new Prisma.Decimal("1.50"),
      unitPriceCents: 10000,
      totalCents: 15000,
      sortOrder: 0,
    }]);
    expect(createData.sections.create).toEqual([{
      name: "General",
      sortOrder: 0,
    }]);
    expect(createData).not.toHaveProperty("workOrder");
    expect(createData).not.toHaveProperty("sharedQuotes");
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

    const formData = new FormData();
    formData.set("quoteId", "quote-source");

    await duplicateQuoteFromForm(formData as unknown as FormData);

    expect(tx.quote.create).toHaveBeenCalledTimes(1);
    expect(requireOperationalRole).toHaveBeenCalledTimes(1);
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/admin/quotes?duplicated=1");
  });

  it("redirects with invalid error when quoteId is missing", async () => {
    await duplicateQuoteFromForm(new FormData());

    expect(redirect).toHaveBeenCalledWith("/admin/quotes?error=invalid");
  });

  it("redirects with duplicate-failed when the original quote cannot be duplicated", async () => {
    mockTx();
    (prisma.quote.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const formData = new FormData();
    formData.set("quoteId", "missing-quote");

    await duplicateQuoteFromForm(formData as unknown as FormData);

    expect(redirect).toHaveBeenCalledWith("/admin/quotes?error=duplicate-failed");
  });
});

describe("deleteQuote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("authorizes direct deletion and permanently deletes quote and related records when there are no pago activos", async () => {
    const tx = mockTx();
    tx.payment.count.mockResolvedValue(0);

    await deleteQuote("quote-1");

    expect(requireOperationalRole).toHaveBeenCalledTimes(1);
    expect(tx.payment.count).toHaveBeenCalledWith({
      where: { quoteId: "quote-1" },
    });
    expect(tx.sharedQuote.deleteMany).toHaveBeenCalledWith({ where: { quoteId: "quote-1" } });
    expect(tx.quoteDecision.deleteMany).toHaveBeenCalledWith({ where: { quoteId: "quote-1" } });
    expect(tx.quoteLifecycleEvent.deleteMany).toHaveBeenCalledWith({ where: { quoteId: "quote-1" } });
    expect(tx.quoteItem.deleteMany).toHaveBeenCalledWith({ where: { quoteId: "quote-1" } });
    expect(tx.quoteSection.deleteMany).toHaveBeenCalledWith({ where: { quoteId: "quote-1" } });
    expect(tx.paymentRequest.deleteMany).toHaveBeenCalledWith({ where: { quoteId: "quote-1" } });
    expect(tx.quote.delete).toHaveBeenCalledTimes(1);
    expect(tx.quote.delete).toHaveBeenCalledWith({
      where: { id: "quote-1" },
    });
  });

  it("rejects deletion when quote has financial activity", async () => {
    const tx = mockTx();
    tx.payment.count.mockResolvedValue(1);

    await expect(deleteQuote("quote-1")).rejects.toThrow("This quote has financial activity and cannot be deleted.");
    expect(tx.quote.delete).not.toHaveBeenCalled();
  });

  it("rejects deletion when quote has an associated work order", async () => {
    const tx = mockTx();
    tx.workOrder.findUnique.mockResolvedValue({ id: "wo-1", status: WorkOrderStatus.PLANNED });

    await expect(deleteQuote("quote-1")).rejects.toThrow("This quote has an associated work order and cannot be deleted.");
    expect(tx.quote.delete).not.toHaveBeenCalled();
  });

  it("deletes a draft quote with a cancelled work order when it has no financial activity", async () => {
    const tx = mockTx();
    tx.workOrder.findUnique.mockResolvedValue({ id: "wo-1", status: WorkOrderStatus.CANCELLED });

    await deleteQuote("quote-1");

    expect(tx.paymentApplication.count).toHaveBeenCalledWith({ where: { OR: [{ workOrderId: "wo-1" }, { payableNoteId: "wo-1" }] } });
    expect(tx.ledgerEntry.count).toHaveBeenCalledWith({
      where: {
        OR: [
          { workOrderId: "wo-1" },
          { payableNoteId: "wo-1" },
          { payment: { quoteId: "quote-1" } },
        ],
      },
    });
    expect(tx.workOrderLaborAdvance.count).toHaveBeenCalledWith({ where: { workOrderId: "wo-1" } });
    expect(tx.payableNote.delete).toHaveBeenCalledWith({ where: { id: "wo-1" } });
    expect(tx.workOrder.delete).toHaveBeenCalledWith({ where: { id: "wo-1" } });
    expect(tx.quote.delete).toHaveBeenCalledWith({ where: { id: "quote-1" } });
  });

  it("rejects deletion when a cancelled work order has payment applications", async () => {
    const tx = mockTx();
    tx.workOrder.findUnique.mockResolvedValue({ id: "wo-1", status: WorkOrderStatus.CANCELLED });
    tx.paymentApplication.count.mockResolvedValue(1);

    await expect(deleteQuote("quote-1")).rejects.toThrow("This quote has financial activity and cannot be deleted.");
    expect(tx.workOrder.delete).not.toHaveBeenCalled();
    expect(tx.quote.delete).not.toHaveBeenCalled();
  });

  it("rejects deletion when a cancelled work order has ledger activity", async () => {
    const tx = mockTx();
    tx.workOrder.findUnique.mockResolvedValue({ id: "wo-1", status: WorkOrderStatus.CANCELLED });
    tx.ledgerEntry.count.mockResolvedValue(1);

    await expect(deleteQuote("quote-1")).rejects.toThrow("This quote has financial activity and cannot be deleted.");
    expect(tx.workOrder.delete).not.toHaveBeenCalled();
    expect(tx.quote.delete).not.toHaveBeenCalled();
  });

  it("rejects deletion when a cancelled work order has labor advances", async () => {
    const tx = mockTx();
    tx.workOrder.findUnique.mockResolvedValue({ id: "wo-1", status: WorkOrderStatus.CANCELLED });
    tx.workOrderLaborAdvance.count.mockResolvedValue(1);

    await expect(deleteQuote("quote-1")).rejects.toThrow("This quote has financial activity and cannot be deleted.");
    expect(tx.workOrder.delete).not.toHaveBeenCalled();
    expect(tx.quote.delete).not.toHaveBeenCalled();
  });
});

describe("deleteQuoteFromForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("authorizes and deletes once before redirecting without revalidation", async () => {
    const tx = mockTx();
    const formData = new FormData();
    formData.set("quoteId", "quote-1");

    await deleteQuoteFromForm(formData as unknown as FormData);

    expect(requireOperationalRole).toHaveBeenCalledTimes(1);
    expect(tx.quote.delete).toHaveBeenCalledTimes(1);
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
    await expect(cancelQuote("quote-1")).rejects.toThrow("Only draft or sent quotes can be cancelled.");
  });
});

describe("cancelQuoteFromForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cancels a draft quote from form data and redirects", async () => {
    const tx = mockTx();
    tx.quote.updateMany.mockResolvedValue({ count: 1 });
    tx.quote.findUniqueOrThrow.mockResolvedValue({ id: "quote-1", status: QuoteStatus.CANCELLED });

    const formData = new FormData();
    formData.set("quoteId", "quote-1");

    await cancelQuoteFromForm(formData as unknown as FormData);

    expect(redirect).toHaveBeenCalledWith("/admin/quotes?cancelled=1");
  });

  it("redirects with invalid-cancellation when quoteId is missing", async () => {
    await cancelQuoteFromForm(new FormData());
    expect(redirect).toHaveBeenCalledWith("/admin/quotes?error=invalid-cancellation");
  });

  it("redirects with not-draft error when quote is no longer draft", async () => {
    mockTx(QuoteStatus.SENT);
    const formData = new FormData();
    formData.set("quoteId", "quote-1");

    await cancelQuoteFromForm(formData as unknown as FormData);

    expect(redirect).toHaveBeenCalledWith("/admin/quotes?error=cancellation-failed");
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

    expect(tx.quote.updateMany).toHaveBeenCalledWith({ where: { id: "quote-1", status: QuoteStatus.DRAFT }, data: { status: QuoteStatus.ARCHIVED, retentionStartedAt: null } });
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
    tx.quote.findUnique.mockResolvedValue({
      id: "quote-1",
      status: QuoteStatus.ARCHIVED,
      validUntil: new Date("2099-01-01T00:00:00.000Z"),
    });
    tx.quote.updateMany.mockResolvedValue({ count: 1 });

    await restoreArchivedQuote("quote-1", "Customer requested a revised estimate.");

    expect(tx.quote.updateMany).toHaveBeenCalledWith({ where: { id: "quote-1", status: QuoteStatus.ARCHIVED }, data: { status: QuoteStatus.DRAFT, retentionStartedAt: null } });
    expect(tx.quoteLifecycleEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ previousState: QuoteStatus.ARCHIVED, nextState: QuoteStatus.DRAFT }) });
    expect(tx.sharedQuote.updateMany).not.toHaveBeenCalled();
    expect(tx.paymentRequest.updateMany).not.toHaveBeenCalled();
  });

  it("does not restore an expired archived quote as an active draft", async () => {
    const tx = mockTx(QuoteStatus.ARCHIVED);
    tx.quote.findUnique.mockResolvedValue({
      id: "quote-1",
      status: QuoteStatus.ARCHIVED,
      validUntil: new Date("2026-09-01T00:00:00.000Z"),
    });
    tx.quote.updateMany.mockResolvedValue({ count: 1 });

    await expect(restoreArchivedQuote("quote-1", "Customer requested a revised estimate."))
      .rejects.toThrow(/validity has ended/i);

    expect(tx.quote.updateMany).not.toHaveBeenCalled();
    expect(tx.quoteLifecycleEvent.create).not.toHaveBeenCalled();
  });

  it("restores a trashed quote as archived without reviving its public link", async () => {
    const tx = mockTx(QuoteStatus.ARCHIVED);
    const deletedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    tx.quote.findUnique.mockResolvedValue({ status: QuoteStatus.ARCHIVED, deletedAt, retentionStartedAt: new Date("2026-09-01T00:00:00Z") });
    tx.quote.updateMany.mockResolvedValue({ count: 1 });

    await restoreTrashedQuote("quote-1", "Requested by administrator");

    expect(requireOperationalRole).toHaveBeenCalled();
    expect(tx.quote.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: QuoteStatus.ARCHIVED, deletedAt, retentionStartedAt: { not: null } }),
      data: { deletedAt: null, retentionStartedAt: null },
    }));
    expect(tx.quoteLifecycleEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ previousState: QuoteStatus.ARCHIVED, nextState: QuoteStatus.ARCHIVED }) });
    expect(tx.sharedQuote.updateMany).not.toHaveBeenCalled();
  });

  it("rejects trashed quotes outside the recovery window", async () => {
    const tx = mockTx(QuoteStatus.ARCHIVED);
    tx.quote.findUnique.mockResolvedValue({ status: QuoteStatus.ARCHIVED, deletedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), retentionStartedAt: new Date() });

    await expect(restoreTrashedQuote("quote-1", "Requested by administrator")).rejects.toThrow(/recoverable retention trash/i);
    expect(tx.quote.updateMany).not.toHaveBeenCalled();
  });
});

function completedWorkQuoteSetup(tx: MockTx, overrides: { status?: QuoteStatus; workOrder?: unknown; applications?: { id: string; paymentId: string; amountCents: number; reversedAt: Date | null; workOrderId?: string | null; payableNoteId?: string }[] } = {}) {
  tx.quote.findUnique.mockResolvedValue({
    id: "quote-1",
    status: overrides.status ?? QuoteStatus.APPROVED,
    customerId: "cust-1",
    subtotalCents: 10000,
    discountCents: 0,
    taxCents: 1600,
    totalCents: 11600,
    taxEnabled: true,
    operationalDate: new Date("2026-07-14T00:00:00.000Z"),
    approvedAt: new Date("2026-07-10T00:00:00.000Z"),
    completedAt: null,
    items: [{ description: "Service", quantity: 1, unitPriceCents: 10000 }],
    sections: [{ id: "sec-1", sortOrder: 0, items: [{ description: "Service", quantity: 1, unitPriceCents: 10000 }] }],
    workOrder: overrides.workOrder ?? { id: "wo-1", status: "COMPLETED", completedAt: new Date("2026-07-15T00:00:00.000Z"), assignments: [{ id: "assign-1" }], executionRecords: [{ id: "exec-1" }] },
  });
    const appsWithPayment = (overrides.applications?.filter((a) => a.reversedAt === null) ?? []).map((app) => ({
      ...app,
      workOrderId: app.workOrderId === undefined ? "wo-1" : app.workOrderId,
      payableNoteId: app.payableNoteId ?? "payable-note-1",
      payment: { customerId: "cust-1", id: app.paymentId, status: "PAID", reversedAt: null },
    }));
    tx.paymentApplication.findMany.mockResolvedValue(appsWithPayment);
    tx.quote.update.mockResolvedValue({ id: "quote-1", totalCents: 197200, status: overrides.status ?? QuoteStatus.APPROVED, sections: [{ id: "sec-1", sortOrder: 0 }] });
}

describe("correctCompletedWorkQuote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("corrects commercial data on unpaid completed work and preserves operational state", async () => {
    const tx = mockTx();
    completedWorkQuoteSetup(tx);

    const result = await correctCompletedWorkQuote("quote-1", validInput());

    expect(tx.quote.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "quote-1" } }));
    expect(tx.paymentApplication.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ workOrderId: "wo-1", reversedAt: null }) }));
    expect(tx.quote.update).toHaveBeenCalledTimes(1);
    const updateData = tx.quote.update.mock.calls[0][0].data;
    expect(updateData.status).toBe(QuoteStatus.APPROVED);
    expect(updateData.approvedAt).toEqual(new Date("2026-07-10T00:00:00.000Z"));
    expect(updateData.operationalDate).toEqual(new Date("2026-07-14T00:00:00.000Z"));
    expect(result.totalCents).toBe(197200);
  });

  it("allows correction when the only payments are fully reversed", async () => {
    const tx = mockTx();
    completedWorkQuoteSetup(tx, {
      applications: [{ id: "app-1", paymentId: "pay-1", amountCents: 5000, reversedAt: new Date("2026-07-16T00:00:00.000Z") }],
    });

    await expect(correctCompletedWorkQuote("quote-1", validInput())).resolves.toBeDefined();
    expect(tx.quote.update).toHaveBeenCalled();
  });

  it("allows correction when active payments exist and reconciles balance", async () => {
    const tx = mockTx();
    completedWorkQuoteSetup(tx, {
      applications: [{ id: "app-1", paymentId: "pay-1", amountCents: 5000, reversedAt: null }],
    });

    const result = await correctCompletedWorkQuote("quote-1", validInput());
    expect(result).toBeDefined();
    expect(tx.quote.update).toHaveBeenCalled();
    expect(tx.quoteCommercialCorrection.create).toHaveBeenCalled();
  });

  it("reverses excess payment applications and creates replacement when newTotal < applied", async () => {
    const tx = mockTx();
    tx.payableNote.findUnique.mockResolvedValue({ id: "payable-note-1" });
    completedWorkQuoteSetup(tx, {
      applications: [
        { id: "app-1", paymentId: "pay-1", amountCents: 100000, reversedAt: null },
        { id: "app-2", paymentId: "pay-2", amountCents: 150000, reversedAt: null },
      ],
    });

    // validInput total is 170000 + 16% tax = 197200 cents
    // Total applied is 250000 cents.
    // LIFO reduction needed = 250000 - 197200 = 52800 cents.
    // app-2 has 150000 cents > 52800, so it gets reversed and a replacement of 97200 cents is created.
    const result = await correctCompletedWorkQuote("quote-1", validInput());
    expect(result).toBeDefined();

    expect(tx.paymentApplication.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "app-2" },
      data: expect.objectContaining({
        reversedAt: expect.any(Date),
        reversedById: "admin-1",
      }),
    }));

    expect(tx.ledgerEntry.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        movementType: "APPLICATION_REVERSAL",
        amountCents: 150000,
        reversedMovementId: "orig-ledger-1",
      }),
    }));

    expect(tx.paymentApplication.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        paymentId: "pay-2",
        amountCents: 97200,
      }),
    }));

    expect(tx.quoteCommercialCorrection.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        previousAppliedCents: 250000,
        newAppliedCents: 197200,
        excessCreditCents: 52800,
      }),
    }));
    expect(tx.quoteCommercialCorrectionApplication.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ payableNoteId: "payable-note-1", workOrderId: "wo-1" })],
    });
  });

  it("corrects a SALE note with a partial payment without requiring a work order", async () => {
    const tx = mockTx();
    completedWorkQuoteSetup(tx, {
      workOrder: null,
      applications: [{ id: "sale-app-1", paymentId: "sale-pay-1", amountCents: 5000, reversedAt: null, workOrderId: null, payableNoteId: "sale-note-1" }],
    });
    tx.quote.findUnique.mockImplementation(async () => ({
      id: "quote-1",
      status: QuoteStatus.APPROVED,
      customerId: "cust-1",
      subtotalCents: 10000,
      discountCents: 0,
      taxCents: 1600,
      totalCents: 11600,
      taxEnabled: true,
      operationalDate: new Date("2026-07-14T00:00:00.000Z"),
      approvedAt: new Date("2026-07-10T00:00:00.000Z"),
      items: [],
      sections: [],
      workOrder: null,
      payableNote: { id: "sale-note-1", kind: "SALE", status: "ISSUED", workOrderId: null },
    }));
    tx.paymentApplication.findMany.mockResolvedValue([{
      id: "sale-app-1",
      paymentId: "sale-pay-1",
      workOrderId: null,
      payableNoteId: "sale-note-1",
      amountCents: 5000,
      payment: { customerId: "cust-1", id: "sale-pay-1", status: "PAID", reversedAt: null },
    }]);
    const reducedTotalInput = {
      ...validInput(),
      sections: [{ name: "General", items: [{ type: "OTHER" as const, description: "Material", quantity: 1, unitPriceCents: 1000 }] }],
    };

    await expect(correctCompletedWorkQuote("quote-1", reducedTotalInput)).resolves.toBeDefined();

    expect(tx.paymentApplication.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "sale-app-1" } }));
    expect(tx.paymentApplication.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ workOrderId: null, payableNoteId: "sale-note-1", amountCents: 1160 }),
    }));
    expect(tx.ledgerEntry.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ movementType: "APPLICATION_REVERSAL", workOrderId: null, payableNoteId: "sale-note-1" }),
    }));
    expect(tx.quoteCommercialCorrectionApplication.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ workOrderId: null, payableNoteId: "sale-note-1" })],
    });
  });

  it("rejects changing customer when the note has applied payments", async () => {
    const tx = mockTx();
    completedWorkQuoteSetup(tx, {
      applications: [{ id: "app-1", paymentId: "pay-1", amountCents: 5000, reversedAt: null }],
    });

    const changedCustomerInput = {
      ...validInput(),
      customerId: "different-customer-id",
    };

    await expect(correctCompletedWorkQuote("quote-1", changedCustomerInput)).rejects.toThrow(
      "No se puede cambiar el cliente de una nota con pagos aplicados.",
    );
    expect(tx.quote.update).not.toHaveBeenCalled();
  });

  it("preserves quote lifecycle and work-order operational fields", async () => {
    const tx = mockTx();
    const completedAt = new Date("2026-07-15T12:00:00.000Z");
    completedWorkQuoteSetup(tx, {
      workOrder: { id: "wo-1", status: "COMPLETED", completedAt, assignments: [{ id: "assign-1" }], executionRecords: [{ id: "exec-1" }] },
    });

    await correctCompletedWorkQuote("quote-1", validInput());

    const updateData = tx.quote.update.mock.calls[0][0].data;
    expect(updateData).not.toHaveProperty("completedAt");
    expect(updateData).not.toHaveProperty("assignments");
    expect(updateData).not.toHaveProperty("executionRecords");
    expect(updateData.status).toBe(QuoteStatus.APPROVED);
  });

  it("returns idempotent result when operationKey was already applied", async () => {
    const tx = mockTx();
    completedWorkQuoteSetup(tx);
    tx.quoteCommercialCorrection.findUnique.mockResolvedValue({
      id: "existing-correction",
      quote: { id: "quote-1", sections: [] },
    });

    const result = await correctCompletedWorkQuote("quote-1", {
      ...validInput(),
      operationKey: "already-applied-op-key",
    });

    expect(result.id).toBe("quote-1");
    expect(tx.quote.update).not.toHaveBeenCalled();
  });
});

describe("correctCompletedWorkQuoteFromWorkspace", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success for a valid unpaid correction", async () => {
    const tx = mockTx();
    completedWorkQuoteSetup(tx);

    await expect(correctCompletedWorkQuoteFromWorkspace("quote-1", {}, buildFormData({ "sections.0.items.0.unitPrice": "850" }) as unknown as FormData)).resolves.toEqual({ success: true });
  });

  it("returns success and reconciles when payments exist", async () => {
    const tx = mockTx();
    completedWorkQuoteSetup(tx, {
      applications: [{ id: "app-1", paymentId: "pay-1", amountCents: 5000, reversedAt: null }],
    });

    await expect(correctCompletedWorkQuoteFromWorkspace("quote-1", {}, buildFormData() as unknown as FormData)).resolves.toEqual({ success: true });
  });

  it("returns error message when customer mismatch is attempted", async () => {
    const tx = mockTx();
    completedWorkQuoteSetup(tx, {
      applications: [{ id: "app-1", paymentId: "pay-1", amountCents: 5000, reversedAt: null }],
    });

    await expect(correctCompletedWorkQuoteFromWorkspace("quote-1", {}, buildFormData({ customerId: "other-cust" }) as unknown as FormData)).resolves.toEqual({
      error: "No se puede cambiar el cliente de una nota con pagos aplicados.",
    });
  });
});

describe("publishSharedQuote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns failure for a stale non-DRAFT quote without creating a shared link", async () => {
    const tx = mockTx(QuoteStatus.SENT);
    tx.quote.updateMany.mockResolvedValue({ count: 0 });

    await expect(publishSharedQuote("quote-1")).resolves.toEqual({ success: false, error: "La cotización cambió de estado. Recarga e intenta de nuevo." });

    expect(tx.quote.updateMany).toHaveBeenCalledWith({
      where: { id: "quote-1", status: QuoteStatus.DRAFT },
      data: { status: QuoteStatus.SENT },
    });
    expect(getOrCreateSharedQuoteForQuote).not.toHaveBeenCalled();
  });

  it("returns failure for a missing quote without creating a shared link", async () => {
    const tx = mockTx();
    tx.quote.findUnique.mockResolvedValue(null);

    await expect(publishSharedQuote("missing-quote")).resolves.toEqual({ success: false, error: "No se encontró la cotización." });

    expect(tx.quote.updateMany).not.toHaveBeenCalled();
    expect(getOrCreateSharedQuoteForQuote).not.toHaveBeenCalled();
  });

  it("returns actionable validation feedback and keeps an incomplete draft unchanged", async () => {
    const tx = mockTx();
    tx.quote.findUnique.mockResolvedValue({
      id: "quote-1",
      status: QuoteStatus.DRAFT,
      customerId: null,
      subtotalCents: 10000,
      discountCents: 0,
      taxCents: 1600,
      totalCents: 11600,
      taxEnabled: true,
      sections: [{ items: [{ description: "Service", quantity: 1, unitPriceCents: 10000 }] }],
    });

    await expect(publishSharedQuote("quote-1")).resolves.toEqual({
      success: false,
      error: "Selecciona un cliente antes de preparar la cotización para compartir.",
    });

    expect(tx.quote.updateMany).not.toHaveBeenCalled();
    expect(getOrCreateSharedQuoteForQuote).not.toHaveBeenCalled();
  });

  it("publishes a complete draft, creates its link, and revalidates the list", async () => {
    const tx = mockTx();
    tx.quote.updateMany.mockResolvedValue({ count: 1 });
    vi.mocked(getOrCreateSharedQuoteForQuote).mockResolvedValue({ id: "shared-1", token: "tok-123" } as never);

    await expect(publishSharedQuote("quote-1")).resolves.toEqual({ success: true, token: "tok-123" });

    expect(getOrCreateSharedQuoteForQuote).toHaveBeenCalledWith("quote-1");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/quotes");
  });

  describe("lockQuoteAction and unlockQuoteAction", () => {
    it("locks an unlocked quote and records QuoteLifecycleEvent with LOCK eventType", async () => {
      const tx = mockTx();
      vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: "user-op-1" } } as never);
      tx.quote.findUnique.mockResolvedValue({
        id: "quote-1",
        isLocked: false,
        status: QuoteStatus.DRAFT,
      });

      const result = await lockQuoteAction("quote-1", "Aprobado por cliente");

      expect(result).toEqual({ success: true });
      expect(tx.quote.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "quote-1" },
        data: expect.objectContaining({
          isLocked: true,
          lockedById: "user-op-1",
          lockedReason: "Aprobado por cliente",
        }),
      }));
      expect(tx.quoteLifecycleEvent.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          quoteId: "quote-1",
          eventType: "LOCK",
          actorId: "user-op-1",
          reason: "Aprobado por cliente",
        }),
      }));
      expect(revalidatePath).toHaveBeenCalledWith("/admin/quotes");
      expect(revalidatePath).toHaveBeenCalledWith("/admin/notas");
      expect(revalidatePath).toHaveBeenCalledWith("/admin/work-orders");
    });

    it("rejects locking if already locked", async () => {
      const tx = mockTx();
      vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: "user-op-1" } } as never);
      tx.quote.findUnique.mockResolvedValue({
        id: "quote-1",
        isLocked: true,
        status: QuoteStatus.DRAFT,
      });

      await expect(lockQuoteAction("quote-1", "Reason")).rejects.toThrow("El documento ya está bloqueado.");
    });

    it("unlocks a locked quote and records QuoteLifecycleEvent with UNLOCK eventType", async () => {
      const tx = mockTx();
      vi.mocked(requireAdmin).mockResolvedValue({ profile: { id: "admin-1" } } as never);
      tx.quote.findUnique.mockResolvedValue({
        id: "quote-1",
        isLocked: true,
        status: QuoteStatus.DRAFT,
      });

      const result = await unlockQuoteAction("quote-1", "Corrección requerida por admin");

      expect(result).toEqual({ success: true });
      expect(tx.quote.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "quote-1" },
        data: expect.objectContaining({
          isLocked: false,
          lockedAt: null,
          lockedById: null,
          lockedReason: null,
        }),
      }));
      expect(tx.quoteLifecycleEvent.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          quoteId: "quote-1",
          eventType: "UNLOCK",
          actorId: "admin-1",
          reason: "Corrección requerida por admin",
        }),
      }));
      expect(revalidatePath).toHaveBeenCalledWith("/admin/quotes");
    });

    it("rejects unlocking if not locked", async () => {
      const tx = mockTx();
      vi.mocked(requireAdmin).mockResolvedValue({ profile: { id: "admin-1" } } as never);
      tx.quote.findUnique.mockResolvedValue({
        id: "quote-1",
        isLocked: false,
        status: QuoteStatus.DRAFT,
      });

      await expect(unlockQuoteAction("quote-1", "Reason")).rejects.toThrow("El documento no está bloqueado.");
    });
  });
});

describe("getOrCreateSharedQuoteAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates or reuses a canonical link for a completed or archived Note", async () => {
    vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: "operator-1" } } as never);
    vi.mocked(prisma.quote.findUnique).mockResolvedValue({
      status: QuoteStatus.ARCHIVED,
      workOrder: { status: "COMPLETED" },
    } as never);
    vi.mocked(getOrCreateSharedQuoteForQuote).mockResolvedValue({ token: "canonical-note" } as never);

    await expect(getOrCreateSharedQuoteAction("quote-1")).resolves.toEqual({ success: true, token: "canonical-note" });
    expect(getOrCreateSharedQuoteForQuote).toHaveBeenCalledWith("quote-1");
  });

  it("preserves the cancelled-status block", async () => {
    vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: "operator-1" } } as never);
    vi.mocked(prisma.quote.findUnique).mockResolvedValue({ status: QuoteStatus.CANCELLED, workOrder: null } as never);

    await expect(getOrCreateSharedQuoteAction("quote-1")).resolves.toEqual({
      success: false,
      error: "No se puede compartir una cotización cancelada.",
    });
    expect(getOrCreateSharedQuoteForQuote).not.toHaveBeenCalled();
  });

  it("rejects archived documents that are not Notes", async () => {
    vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: "operator-1" } } as never);
    vi.mocked(prisma.quote.findUnique).mockResolvedValue({ status: QuoteStatus.ARCHIVED, workOrder: null } as never);

    await expect(getOrCreateSharedQuoteAction("quote-1")).resolves.toEqual({
      success: false,
      error: "Solo las Notas archivadas pueden compartirse.",
    });
  });
});

describe("completed Note archive and revocation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("archives a completed Note without revoking its canonical link or payment requests", async () => {
    const tx = mockTx();
    vi.mocked(requireAdmin).mockResolvedValue({ profile: { id: "admin-1" } } as never);
    tx.quote.findUnique.mockResolvedValue({
      id: "quote-1",
      isLocked: false,
      status: QuoteStatus.APPROVED,
      workOrder: { id: "work-order-1", status: WorkOrderStatus.COMPLETED },
    } as never);
    tx.quote.updateMany.mockResolvedValue({ count: 1 });

    await archiveCompletedNote("quote-1", "Archivo administrativo");

    expect(tx.quote.updateMany).toHaveBeenCalledWith({
      where: { id: "quote-1", status: QuoteStatus.APPROVED },
      data: { status: QuoteStatus.ARCHIVED, retentionStartedAt: null },
    });
    expect(tx.sharedQuote.updateMany).not.toHaveBeenCalled();
    expect(tx.paymentRequest.updateMany).not.toHaveBeenCalled();
  });

  it("passes the admin and reason to the canonical link revocation audit", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ profile: { id: "admin-1" } } as never);
    vi.mocked(revokeCanonicalNoteSharedQuote).mockResolvedValue({} as never);

    await expect(revokeNoteCanonicalLinkAction("quote-1", "Solicitud del cliente")).resolves.toEqual({ success: true });
    expect(revokeCanonicalNoteSharedQuote).toHaveBeenCalledWith("quote-1", "admin-1", "Solicitud del cliente");
  });
});
