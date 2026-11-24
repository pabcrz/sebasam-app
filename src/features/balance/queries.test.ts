import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireOperationalRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getBalanceSnapshot } from "./queries";

vi.mock("@/lib/auth/session", () => ({ requireOperationalRole: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { workOrder: { findMany: vi.fn() }, payment: { aggregate: vi.fn() } },
}));

const now = new Date("2026-08-19T14:00:00.000Z");

function note(customerId: string, dueDate: string, totalCents: number, appliedCents = 0) {
  return {
    completedAt: new Date("2026-08-01T18:00:00.000Z"),
    paymentDueDate: new Date(dueDate),
    quote: { customer: { id: customerId, name: `Cliente ${customerId}` }, paymentDueDate: null, subtotalCents: totalCents, taxCents: 0, totalCents, settlementAgreement: null },
    paymentApplications: appliedCents ? [{ amountCents: appliedCents }] : [],
  };
}

describe("getBalanceSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.payment.aggregate)
      .mockResolvedValueOnce({ _count: { _all: 2 }, _sum: { amountCents: 30_000 } } as never)
      .mockResolvedValueOnce({ _count: { _all: 5 }, _sum: { amountCents: 90_000 } } as never)
      .mockResolvedValueOnce({ _count: { _all: 9 }, _sum: { amountCents: 400_000 } } as never);
    vi.mocked(prisma.workOrder.findMany).mockResolvedValue([
      note("a", "2026-08-05T18:00:00.000Z", 100_000, 40_000),
      note("b", "2026-09-30T18:00:00.000Z", 20_000),
    ] as never);
  });

  it("keeps what was collected and what is receivable as separate figures", async () => {
    const snapshot = await getBalanceSnapshot(now);

    expect(requireOperationalRole).toHaveBeenCalled();
    expect(snapshot.collected.week).toMatchObject({ paymentsCount: 2, totalCents: 30_000 });
    expect(snapshot.collected.month).toMatchObject({ paymentsCount: 5, totalCents: 90_000 });
    expect(snapshot.collected.year).toMatchObject({ paymentsCount: 9, totalCents: 400_000 });
    expect(snapshot.receivables.totalCents).toBe(80_000);
    expect(snapshot.receivables.overdueCents).toBe(60_000);
    expect(snapshot.receivables.customers.map((customer) => customer.customerId)).toEqual(["a", "b"]);
    // The pending balance is never part of the collected totals.
    expect(snapshot.collected.year.totalCents).not.toBe(400_000 + 80_000);
  });

  it("only counts PAID payments and active applications, like the dashboard", async () => {
    await getBalanceSnapshot(now);

    expect(prisma.payment.aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: "PAID" }) }));
    expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          paymentApplications: expect.objectContaining({ where: { reversedAt: null, payment: { status: "PAID", reversedAt: null } } }),
        }),
      }),
    );
  });

  it("returns zeros and no customers when nothing was collected or owed", async () => {
    vi.mocked(prisma.payment.aggregate).mockReset().mockResolvedValue({ _count: { _all: 0 }, _sum: { amountCents: null } } as never);
    vi.mocked(prisma.workOrder.findMany).mockResolvedValue([] as never);

    const snapshot = await getBalanceSnapshot(now);

    expect(snapshot.collected.month).toMatchObject({ paymentsCount: 0, totalCents: 0 });
    expect(snapshot.receivables).toEqual({ totalCents: 0, overdueCents: 0, customers: [] });
  });
});
