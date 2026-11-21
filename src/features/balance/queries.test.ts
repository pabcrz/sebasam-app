import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { getIncomeBalance } from "./queries";

vi.mock("@/lib/auth/session", () => ({ requireOperationalRole: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    payment: { aggregate: vi.fn() },
    workOrder: { findMany: vi.fn() },
  },
}));

function workOrder(customerId: string, totalCents: number, appliedCents: number) {
  return {
    completedAt: new Date("2026-11-01T18:00:00Z"),
    paymentDueDate: new Date("2026-12-31T18:00:00Z"),
    quote: {
      customer: { id: customerId, name: `Cliente ${customerId}` },
      paymentDueDate: null,
      subtotalCents: totalCents,
      taxCents: 0,
      totalCents,
      settlementAgreement: null,
    },
    paymentApplications: appliedCents ? [{ amountCents: appliedCents }] : [],
  };
}

describe("getIncomeBalance", () => {
  const now = new Date("2026-11-21T18:00:00Z");

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOperationalRole).mockResolvedValue({} as never);
  });

  it("keeps collected payments and the receivable balance as separate amounts", async () => {
    vi.mocked(prisma.payment.aggregate).mockResolvedValue({ _count: { _all: 3 }, _sum: { amountCents: 90000 } } as never);
    vi.mocked(prisma.workOrder.findMany)
      .mockResolvedValueOnce([workOrder("a", 100000, 40000), workOrder("b", 50000, 0), workOrder("c", 30000, 30000)] as never)
      .mockResolvedValueOnce([] as never);

    const balance = await getIncomeBalance({ start: new Date("2026-11-01T06:00:00Z"), end: new Date("2026-12-01T06:00:00Z") }, [], now);

    expect(balance.collected).toEqual({ totalCents: 90000, paymentsCount: 3 });
    expect(balance.receivables.totalCents).toBe(110000);
    expect(balance.receivables.customers.map((customer) => customer.customerId)).toEqual(["a", "b"]);
  });

  it("counts only live paid payments inside the period", async () => {
    vi.mocked(prisma.payment.aggregate).mockResolvedValue({ _count: { _all: 0 }, _sum: { amountCents: null } } as never);
    vi.mocked(prisma.workOrder.findMany).mockResolvedValue([] as never);
    const start = new Date("2026-11-01T06:00:00Z");
    const end = new Date("2026-12-01T06:00:00Z");

    await getIncomeBalance({ start, end }, [], now);

    expect(prisma.payment.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "PAID",
          reversedAt: null,
          correctionsOriginal: { none: {} },
          createdAt: { gte: start, lt: end },
        },
      }),
    );
  });

  it("returns zeros and no customers when there is no data", async () => {
    vi.mocked(prisma.payment.aggregate).mockResolvedValue({ _count: { _all: 0 }, _sum: { amountCents: null } } as never);
    vi.mocked(prisma.workOrder.findMany).mockResolvedValue([] as never);

    const balance = await getIncomeBalance({ start: null, end: null }, [], now);

    expect(balance).toEqual({
      collected: { totalCents: 0, paymentsCount: 0 },
      receivables: { totalCents: 0, customers: [] },
      periods: [],
    });
    expect(vi.mocked(prisma.payment.aggregate).mock.calls[0][0]?.where).not.toHaveProperty("createdAt");
  });

  it("builds the period rows from the completed notes' billed categories and payments", async () => {
    vi.mocked(prisma.payment.aggregate).mockResolvedValue({ _count: { _all: 0 }, _sum: { amountCents: null } } as never);
    vi.mocked(prisma.workOrder.findMany)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([
        {
          completedAt: new Date("2026-11-02T18:00:00Z"),
          paymentApplications: [{ amountCents: 30000, createdAt: new Date("2026-11-05T18:00:00Z") }],
          quote: {
            subtotalCents: 30000,
            taxCents: 0,
            totalCents: 30000,
            settlementAgreement: null,
            items: [{ id: "i-1", type: "LABOR", quantity: 1, unitPriceCents: null, totalCents: 20000 }],
            sections: [{ items: [{ id: "i-2", type: "REFACCIONES", quantity: 2, unitPriceCents: 5000, totalCents: null }] }],
          },
        },
      ] as never);

    const balance = await getIncomeBalance(
      { start: null, end: null },
      [{ label: "noviembre de 2026", start: new Date("2026-11-01T06:00:00Z"), end: new Date("2026-12-01T06:00:00Z") }],
      now,
    );

    expect(balance.periods).toEqual([
      { label: "noviembre de 2026", settledBilled: { labor: 20000, materials: 10000, other: 0 }, receivableAtCloseCents: 0 },
    ]);
  });
});
