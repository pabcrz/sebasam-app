import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { getPaymentSettings } from "@/features/payment-settings/domain";
import { getCustomerCreditSummary } from "@/features/payments/domain";
import { parseCustomerStatementParams } from "./customer-statement";
import { getCustomerDetailedStatement } from "./customer-statement-queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: { findUnique: vi.fn() },
    workOrder: { findMany: vi.fn() },
    payment: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireOperationalRole: vi.fn(),
}));

vi.mock("@/features/payment-settings/domain", () => ({
  getPaymentSettings: vi.fn(),
}));

vi.mock("@/features/payments/domain", () => ({
  getCustomerCreditSummary: vi.fn(),
}));

describe("getCustomerDetailedStatement", () => {
  const fakeNow = new Date("2026-08-15T18:00:00Z");

  const mockCustomer = {
    id: "cust-1",
    name: "Transportes del Norte",
    commercialName: "Transportes del Norte S.A.",
    legalName: "Transportes del Norte S.A. de C.V.",
    email: "contacto@transportes.com",
    phone: "5551234567",
    address: "Av. Central 123",
    status: "ACTIVE",
    fiscalProfiles: [{ id: "f-1", taxId: "TDN010101ABC", isDefault: true }],
  };

  const mockPaymentSettings = {
    name: "SEBASAM",
    fullName: "Servicio Básico a Suspensiones y Aire y Muelles",
    address: "Calle Taller 100",
    contactPhone: "5550001122",
    contactWhatsapp: "5550001133",
    bankAccounts: [
      {
        id: 1,
        bankName: "BBVA",
        accountHolder: "SEBASAM",
        accountNumber: "1234567890",
        clabe: "012180000000000000",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getPaymentSettings as ReturnType<typeof vi.fn>).mockResolvedValue(mockPaymentSettings);
    (getCustomerCreditSummary as ReturnType<typeof vi.fn>).mockResolvedValue({
      customerId: "cust-1",
      totalCapturedCents: 30000,
      totalAppliedCents: 15000,
      availableCreditCents: 15000,
    });
    (prisma.payment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it("returns null if customer does not exist", async () => {
    (prisma.customer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const params = parseCustomerStatementParams({}, fakeNow);
    const result = await getCustomerDetailedStatement("non-existent", params, fakeNow);
    expect(result).toBeNull();
    expect(requireOperationalRole).toHaveBeenCalled();
  });

  it("returns only notes with remaining balance in default pending view", async () => {
    (prisma.customer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCustomer);

    const notePending = {
      id: "wo-1",
      number: "OT-001",
      status: "COMPLETED",
      completedAt: new Date("2026-08-01T18:00:00Z"),
      paymentDueDate: new Date("2026-08-08T18:00:00Z"),
      quote: {
        id: "q-1",
        number: "COT-001",
        title: "Cambiar muelles",
        totalCents: 100000,
        subtotalCents: 100000,
        discountCents: null,
        taxCents: null,
        vehicle: { brand: "Kenworth", model: "T680", year: 2020, plate: "45-AA-1B", economicNumber: "ECO-10" },
        items: [{ id: "i-1", sectionId: null, type: "LABOR", description: "Cambiar muelles", quantity: 1, unitPriceCents: 100000 }],
        sections: [],
      },
      paymentApplications: [
        {
          id: "pa-1",
          amountCents: 40000,
          createdAt: new Date("2026-08-05T18:00:00Z"),
          payment: { status: "PAID", reversedAt: null },
        },
        {
          id: "pa-future",
          amountCents: 10000,
          createdAt: new Date("2026-08-16T18:00:00Z"),
          payment: { status: "PAID", reversedAt: null },
        },
      ],
    };

    const notePaid = {
      id: "wo-2",
      number: "OT-002",
      status: "COMPLETED",
      completedAt: new Date("2026-07-20T18:00:00Z"),
      paymentDueDate: new Date("2026-07-27T18:00:00Z"),
      quote: {
        id: "q-2",
        number: "COT-002",
        title: "Alinear eje",
        totalCents: 50000,
        subtotalCents: 50000,
        discountCents: null,
        taxCents: null,
        vehicle: null,
        items: [{ id: "i-2", sectionId: null, type: "LABOR", description: "Alinear eje", quantity: 1, unitPriceCents: 50000 }],
        sections: [],
      },
      paymentApplications: [
        {
          id: "pa-2",
          amountCents: 50000,
          createdAt: new Date("2026-07-22T18:00:00Z"),
          payment: { status: "PAID", reversedAt: null },
        },
      ],
    };

    (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([notePending, notePaid]);

    const params = parseCustomerStatementParams({}, fakeNow);
    const result = await getCustomerDetailedStatement("cust-1", params, fakeNow);

    expect(result).not.toBeNull();
    expect(result?.notes).toHaveLength(1);
    expect(result?.notes[0].number).toBe("OT-001");
    expect(result?.notes[0].totalCents).toBe(100000);
    expect(result?.notes[0].paidCents).toBe(50000);
    expect(result?.notes[0].paidCentsAtCutoff).toBe(40000);
    expect(result?.notes[0].remainingCents).toBe(50000);
    expect(result?.notes[0].concepts).toBe("Cambiar muelles");
    expect(result?.notes[0].vehicleLabel).toContain("ECO: ECO-10");
    expect(result?.notes[0].paymentState.label).toBe("Vencida"); // 2026-08-08 < 2026-08-15

    expect(result?.summary.finalBalanceCents).toBe(50000);
    expect(result?.summary.overdueBalanceCents).toBe(50000);
    expect(result?.summary.periodPaymentsCents).toBe(50000);
    expect(result?.customer.rfc).toBe("TDN010101ABC");
    expect(result).not.toHaveProperty("bankAccounts");
  });

  it("calculates initial balance, period movements, and final balance in monthly history view", async () => {
    (prisma.customer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCustomer);

    // Prior note (July): completed before start of August
    const notePrior = {
      id: "wo-prior",
      number: "OT-PRIOR",
      status: "COMPLETED",
      completedAt: new Date("2026-07-10T18:00:00Z"),
      paymentDueDate: new Date("2026-07-17T18:00:00Z"),
      quote: {
        id: "q-prior",
        number: "COT-PRIOR",
        title: "Frenos",
        totalCents: 80000,
        items: [],
        sections: [],
      },
      paymentApplications: [
        {
          id: "pa-prior-1",
          amountCents: 30000,
          createdAt: new Date("2026-07-12T18:00:00Z"), // Prior payment
          payment: { status: "PAID", reversedAt: null },
        },
        {
          id: "pa-prior-2",
          amountCents: 20000,
          createdAt: new Date("2026-08-05T18:00:00Z"), // Payment applied IN August!
          payment: { status: "PAID", reversedAt: null },
        },
      ],
    };

    // August note: completed in August
    const noteAugust = {
      id: "wo-aug",
      number: "OT-AUG",
      status: "COMPLETED",
      completedAt: new Date("2026-08-10T18:00:00Z"),
      paymentDueDate: new Date("2026-08-17T18:00:00Z"),
      quote: {
        id: "q-aug",
        number: "COT-AUG",
        title: "Alinear eje y perchas",
        totalCents: 120000,
        items: [],
        sections: [],
      },
      paymentApplications: [
        {
          id: "pa-aug-1",
          amountCents: 50000,
          createdAt: new Date("2026-08-12T18:00:00Z"),
          payment: { status: "PAID", reversedAt: null },
        },
      ],
    };

    (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([notePrior, noteAugust]);

    const params = parseCustomerStatementParams({ view: "history", period: "month", anchor: "2026-08" }, fakeNow);
    const result = await getCustomerDetailedStatement("cust-1", params, fakeNow);

    expect(result).not.toBeNull();
    // Prior note had 80,000 charges and 30,000 paid before August 1 -> initialBalance = 50,000
    expect(result?.summary.initialBalanceCents).toBe(50000);
    // In August: charges = 120,000 (noteAugust)
    expect(result?.summary.periodChargesCents).toBe(120000);
    // In August: payments = 20,000 (applied to notePrior) + 50,000 (applied to noteAugust) = 70,000
    expect(result?.summary.periodPaymentsCents).toBe(70000);
    // finalBalance = 50,000 + 120,000 - 70,000 = 100,000
    expect(result?.summary.finalBalanceCents).toBe(100000);

    // Notes displayed: both noteAugust (completed in period) and notePrior (paid in period)
    expect(result?.notes).toHaveLength(2);
    expect(result?.availableCreditCents).toBe(15000);
  });

  it("calculates total and remaining cents using active settlement agreements", async () => {
    (prisma.customer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCustomer);

    const noteWithSettlement = {
      id: "wo-settled",
      number: "OT-SETTLED",
      status: "COMPLETED",
      completedAt: new Date("2026-08-01T18:00:00Z"),
      paymentDueDate: new Date("2026-08-08T18:00:00Z"),
      quote: {
        id: "q-settled",
        number: "COT-SETTLED",
        title: "Reparación con convenio",
        totalCents: 20000, // nominal total is $200
        subtotalCents: 20000,
        discountCents: null,
        taxCents: null,
        vehicle: null,
        items: [],
        sections: [],
        settlementAgreement: {
          id: "sa-1",
          status: "ACTIVE",
          settlementBaseCents: 15000,
          settlementTaxCents: 0,
          settlementTotalCents: 15000, // settled total is $150
        },
      },
      paymentApplications: [
        {
          id: "pa-1",
          amountCents: 5000,
          createdAt: new Date("2026-08-05T18:00:00Z"),
          payment: { status: "PAID", reversedAt: null },
        },
      ],
    };

    (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([noteWithSettlement]);

    const params = parseCustomerStatementParams({}, fakeNow);
    const result = await getCustomerDetailedStatement("cust-1", params, fakeNow);

    expect(result).not.toBeNull();
    expect(result?.notes).toHaveLength(1);
    // Effective total should be 15,000 (not nominal 20,000)
    expect(result?.notes[0].totalCents).toBe(15000);
    expect(result?.notes[0].paidCents).toBe(5000);
    // Remaining should be 15,000 - 5,000 = 10,000 (not 20,000 - 5,000 = 15,000)
    expect(result?.notes[0].remainingCents).toBe(10000);
    expect(result?.summary.finalBalanceCents).toBe(10000);
  });

  it("propagates contact and customer snapshots to previewQuote without altering statement financial totals", async () => {
    (prisma.customer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCustomer);

    const noteWithSnapshot = {
      id: "wo-snap",
      number: "OT-SNAP",
      status: "COMPLETED",
      completedAt: new Date("2026-08-01T18:00:00Z"),
      paymentDueDate: new Date("2026-08-08T18:00:00Z"),
      quote: {
        id: "q-snap",
        number: "COT-SNAP",
        title: "Servicio con snapshot",
        totalCents: 50000,
        subtotalCents: 50000,
        discountCents: null,
        taxCents: null,
        vehicle: null,
        items: [],
        sections: [],
        customerSnapshot: { commercialName: "Cliente Snapshot", legalName: "Fiscal Snapshot S.A." },
        contactSnapshot: { id: "cont-1", name: "Chofer Snapshot", role: "DRIVER" },
      },
      paymentApplications: [],
    };

    (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([noteWithSnapshot]);

    const params = parseCustomerStatementParams({}, fakeNow);
    const result = await getCustomerDetailedStatement("cust-1", params, fakeNow);

    expect(result).not.toBeNull();
    expect(result?.notes).toHaveLength(1);
    const note = result!.notes[0];

    // Financial values remain untouched
    expect(note.totalCents).toBe(50000);
    expect(note.paidCents).toBe(0);
    expect(note.remainingCents).toBe(50000);
    expect(result?.summary.finalBalanceCents).toBe(50000);

    // previewQuote contains snapshots
    expect(note.previewQuote.customerSnapshot).toEqual({
      commercialName: "Cliente Snapshot",
      legalName: "Fiscal Snapshot S.A.",
    });
    expect(note.previewQuote.contactSnapshot).toEqual({
      id: "cont-1",
      name: "Chofer Snapshot",
      role: "DRIVER",
    });
  });

  it("builds cutoff-dated application and residual-credit activity without double-counting captures", async () => {
    (prisma.customer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCustomer);

    const workOrder = (id: string, number: string, totalCents: number, applications: Array<{ amountCents: number; createdAt: Date }>) => ({
      id,
      number,
      status: "COMPLETED",
      completedAt: new Date("2026-08-01T18:00:00Z"),
      paymentDueDate: new Date("2026-08-30T18:00:00Z"),
      quote: {
        id: `q-${id}`,
        number: `C-${number}`,
        title: `Servicio ${number}`,
        totalCents,
        subtotalCents: totalCents,
        discountCents: null,
        taxCents: null,
        vehicle: null,
        items: [],
        sections: [],
      },
      paymentApplications: applications.map((application) => ({
        ...application,
        payment: { status: "PAID", reversedAt: null },
      })),
    });

    const firstAllocationDate = new Date("2026-08-05T18:00:00Z");
    const laterAllocationDate = new Date("2026-08-10T18:00:00Z");
    const afterCutoffDate = new Date("2026-08-16T18:00:00Z");
    (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      workOrder("wo-1", "OT-001", 100000, [
        { amountCents: 40000, createdAt: firstAllocationDate },
        { amountCents: 5000, createdAt: afterCutoffDate },
      ]),
      workOrder("wo-2", "OT-002", 80000, [
        { amountCents: 20000, createdAt: laterAllocationDate },
        { amountCents: 10000, createdAt: afterCutoffDate },
      ]),
    ]);
    (prisma.payment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        amountCents: 100000,
        createdAt: new Date("2026-08-05T17:00:00Z"),
        applications: [
          { amountCents: 40000, createdAt: firstAllocationDate, reversedAt: null, workOrderId: "wo-1", workOrder: { number: "OT-001" } },
          { amountCents: 20000, createdAt: laterAllocationDate, reversedAt: null, workOrderId: "wo-2", workOrder: { number: "OT-002" } },
          { amountCents: 5000, createdAt: afterCutoffDate, reversedAt: null, workOrderId: "wo-1", workOrder: { number: "OT-001" } },
        ],
      },
      {
        amountCents: 30000,
        createdAt: new Date("2026-08-14T10:00:00Z"),
        applications: [
          { amountCents: 10000, createdAt: afterCutoffDate, reversedAt: null, workOrderId: "wo-2", workOrder: { number: "OT-002" } },
        ],
      },
      {
        amountCents: 7000,
        createdAt: afterCutoffDate,
        applications: [],
      },
    ]);

    const params = parseCustomerStatementParams({}, fakeNow);
    const result = await getCustomerDetailedStatement("cust-1", params, fakeNow);

    expect(result?.paymentActivity).toEqual([
      { type: "credit", date: new Date("2026-08-05T17:00:00Z"), availableCents: 40000 },
      { type: "application", date: firstAllocationDate, amountCents: 40000, noteNumber: "OT-001" },
      { type: "application", date: laterAllocationDate, amountCents: 20000, noteNumber: "OT-002" },
      { type: "credit", date: new Date("2026-08-14T10:00:00Z"), availableCents: 30000 },
    ]);
    expect(result?.availableCreditAtCutoffCents).toBe(70000);
    expect(prisma.payment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        customerId: "cust-1",
        status: "PAID",
        reversedAt: null,
        createdAt: { lte: fakeNow },
      }),
    }));
  });
});
