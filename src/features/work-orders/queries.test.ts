import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getCompletedWorkOrderById, listActiveWorkOrders, listCompletedWorkOrders } from "./queries";

vi.mock("@/lib/prisma", () => ({
  prisma: { $queryRaw: vi.fn(), payableNote: { findMany: vi.fn(), findFirst: vi.fn() }, workOrder: { findMany: vi.fn(), findFirst: vi.fn() } },
}));

vi.mock("@/lib/auth/session", () => ({
  requireOperationalRole: vi.fn(),
}));

describe("work order operational queues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.payableNote.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it("queries ASSIGNED and IN_PROGRESS work for Trabajos", async () => {
    await listActiveWorkOrders();

    expect(prisma.workOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
    }));
  });

  it.each(["all", "pending", "paid"] as const)("filters and paginates %s Notas before hydration", async (payment) => {
    await listCompletedWorkOrders({ start: new Date("2026-08-03T06:00:00Z"), end: new Date("2026-08-10T06:00:00Z"), payment, assignee: "all", page: 2 });
    const query = (prisma.$queryRaw as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const sql = query.strings.join("?");
    expect(sql).toContain('wo.status::text = ?');
    expect(sql).toContain('wo."completedAt" >= ?');
    expect(sql).toContain('wo."completedAt" < ?');
    expect(sql).toContain('LEFT JOIN "SettlementAgreement" sa');
    expect(sql).toContain('COALESCE(sa."settlementTotalCents", q."totalCents")');
    expect(sql).toContain('ORDER BY wo."completedAt" DESC, wo.id DESC');
    expect(sql).not.toContain("LIMIT");
    expect(sql.includes("HAVING")).toBe(payment !== "all");
    if (payment === "pending") expect(sql).toMatch(/HAVING .* > 0/);
    if (payment === "paid") expect(sql).toMatch(/HAVING .* = 0/);
    expect(sql).not.toContain('FROM "WorkAssignment"');
    expect(query.values).toEqual(expect.arrayContaining(["PAID", "COMPLETED"]));
    expect(prisma.workOrder.findMany).not.toHaveBeenCalled();
  });

  it("applies workshop and master predicates before pagination", async () => {
    const input = { start: new Date("2026-08-03T06:00:00Z"), end: new Date("2026-08-10T06:00:00Z"), payment: "all" as const, page: 1 };

    await listCompletedWorkOrders({ ...input, assignee: "workshop" });
    const workshopQuery = (prisma.$queryRaw as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(workshopQuery.strings.join("?")).toContain('wo."isSpecial" = true');

    await listCompletedWorkOrders({ ...input, assignee: "a0b1c2d3-1234-4abc-8def-1234567890ab" });
    const masterQuery = (prisma.$queryRaw as ReturnType<typeof vi.fn>).mock.calls[1][0];
    const sql = masterQuery.strings.join("?");
    expect(sql).toContain('FROM "WorkAssignment" wa');
    expect(sql).toContain('wa.status::text <> ?');
    expect(sql).toContain('worker."workerKind"::text = ?');
    expect(masterQuery.values).toEqual(expect.arrayContaining(["CANCELLED", "MASTER", "a0b1c2d3-1234-4abc-8def-1234567890ab"]));
  });

  it("reports an empty page and detects the next page without unbounded hydration", async () => {
    const input = { start: new Date("2026-08-03T06:00:00Z"), end: new Date("2026-08-10T06:00:00Z"), payment: "all" as const, assignee: "all", page: 1 };
    const empty = await listCompletedWorkOrders(input);
    expect(empty).toMatchObject({ workOrders: [], hasNextPage: false });
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue(Array.from({ length: 21 }, (_, index) => ({ id: String(index), paidCents: BigInt(0) })));
    const bounded = await listCompletedWorkOrders(input);
    expect(bounded.hasNextPage).toBe(true);
    expect(prisma.workOrder.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { id: { in: Array.from({ length: 20 }, (_, index) => String(index)) } } }));
  });

  it("only loads closure-ready completed work for Nota routes", async () => {
    (prisma.workOrder.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "wo-1",
      status: "COMPLETED",
      quote: {
        customerId: null,
        vehicle: null,
        vehicleSnapshot: { plate: "ABC-123" },
        subtotalCents: 10_000,
        discountCents: 0,
        taxCents: 1_600,
        totalCents: 11_600,
        taxEnabled: true,
        items: [],
        sections: [{ items: [{ type: "LABOR", description: "Service", quantity: 1, unitPriceCents: 10_000, totalCents: 10_000 }] }],
      },
      assignments: [],
    });

    await expect(getCompletedWorkOrderById("wo-1")).resolves.toMatchObject({ id: "wo-1", status: "COMPLETED" });
    expect(prisma.workOrder.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "wo-1", status: "COMPLETED" },
    }));
  });

  it("excludes reversed payments from completed-list totals and exposes the active payment id", async () => {
    const input = { start: new Date("2026-08-03T06:00:00Z"), end: new Date("2026-08-10T06:00:00Z"), payment: "all" as const, assignee: "all", page: 1 };
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "wo-paid", effectiveTotalCents: BigInt(10_000), paidCents: BigInt(5_000), activePaymentId: "pay-active" },
      { id: "wo-reversed", effectiveTotalCents: BigInt(8_000), paidCents: BigInt(0), activePaymentId: null },
    ]);
    (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "wo-paid",
        status: "COMPLETED",
        completedAt: new Date("2026-08-05T10:00:00Z"),
        isSpecial: false,
        quote: { id: "quote-paid", number: "COT-001", customer: { name: "Cliente A" }, vehicle: null, totalCents: 10_000, items: [], sections: [] },
        assignments: [],
      },
      {
        id: "wo-reversed",
        status: "COMPLETED",
        completedAt: new Date("2026-08-05T10:00:00Z"),
        isSpecial: false,
        quote: { id: "quote-reversed", number: "COT-002", customer: { name: "Cliente B" }, vehicle: null, totalCents: 8_000, items: [], sections: [] },
        assignments: [],
      },
    ]);

    const result = await listCompletedWorkOrders(input);

    const query = (prisma.$queryRaw as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const sql = query.strings.join("?");
    expect(sql).toContain('p."reversedAt" IS NULL');
    expect(sql).toContain('"activePaymentId"');

    const paidRow = result.workOrders.find((wo) => wo.id === "wo-paid");
    const reversedRow = result.workOrders.find((wo) => wo.id === "wo-reversed");
    expect(paidRow?.quote.paidCents).toBe(5_000);
    expect(paidRow?.quote.remainingCents).toBe(5_000);
    expect(paidRow?.quote.activePaymentId).toBe("pay-active");
    expect(reversedRow?.quote.paidCents).toBe(0);
    expect(reversedRow?.quote.remainingCents).toBe(8_000);
    expect(reversedRow?.quote.activePaymentId).toBeNull();
  });

  it("uses the active settlement total for Nota balances and hydrated payment inputs", async () => {
    const input = { start: new Date("2026-08-03T06:00:00Z"), end: new Date("2026-08-10T06:00:00Z"), payment: "all" as const, assignee: "all" as const, page: 1 };
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([{
      id: "wo-settled",
      effectiveTotalCents: BigInt(9_280),
      paidCents: BigInt(3_000),
      activePaymentId: "pay-1",
      activePaymentMethod: "TRANSFER",
      activePaymentAmountCents: BigInt(3_000),
    }]);
    (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{
      id: "wo-settled",
      status: "COMPLETED",
      quote: { id: "quote-1", number: "COT-01", totalCents: 11_600, items: [], sections: [] },
      assignments: [],
    }]);

    const result = await listCompletedWorkOrders(input);
    const workOrder = result.workOrders[0];

    expect(workOrder?.quote.effectiveTotalCents).toBe(9_280);
    expect(workOrder?.quote.paidCents).toBe(3_000);
    expect(workOrder?.quote.remainingCents).toBe(6_280);
  });

  it("hides a completed work order from Nota routes when closure data is invalid", async () => {
    (prisma.workOrder.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "wo-1",
      status: "COMPLETED",
      quote: {
        customerId: "customer-1",
        vehicle: null,
        vehicleSnapshot: null,
        subtotalCents: null,
        discountCents: 0,
        taxCents: null,
        totalCents: null,
        taxEnabled: false,
        items: [],
        sections: [{ items: [{ type: "LABOR", description: "Service", quantity: 1, unitPriceCents: null, totalCents: null }] }],
      },
      assignments: [],
    });

    await expect(getCompletedWorkOrderById("wo-1")).resolves.toBeNull();
  });

  it("filters by customerId when specified", async () => {
    const input = {
      start: new Date("2026-08-03T06:00:00Z"),
      end: new Date("2026-08-10T06:00:00Z"),
      payment: "all" as const,
      assignee: "all" as const,
      customerId: "cust-12345",
      page: 1,
    };

    await listCompletedWorkOrders(input);
    const query = (prisma.$queryRaw as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const sql = query.strings.join("?");
    expect(sql).toContain('q."customerId" = ?');
    expect(query.values).toContain("cust-12345");
  });

  it("applies overdue and current morosidad filters", async () => {
    const input = {
      start: new Date("2026-08-03T06:00:00Z"),
      end: new Date("2026-08-10T06:00:00Z"),
      payment: "all" as const,
      assignee: "all" as const,
      page: 1,
    };

    await listCompletedWorkOrders({ ...input, overdue: "overdue" });
    const overdueQuery = (prisma.$queryRaw as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const overdueSql = overdueQuery.strings.join("?");
    expect(overdueSql).toContain('wo."paymentDueDate" IS NOT NULL AND wo."paymentDueDate" < ?');

    await listCompletedWorkOrders({ ...input, overdue: "current" });
    const currentQuery = (prisma.$queryRaw as ReturnType<typeof vi.fn>).mock.calls[1][0];
    const currentSql = currentQuery.strings.join("?");
    expect(currentSql).toContain('wo."paymentDueDate" IS NULL OR wo."paymentDueDate" >= ?');
  });

  it("returns calculated totals for period and active filters", async () => {
    const input = {
      start: new Date("2026-08-03T06:00:00Z"),
      end: new Date("2026-08-10T06:00:00Z"),
      payment: "all" as const,
      assignee: "all" as const,
      page: 1,
    };

    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "wo-1",
        paidCents: BigInt(5_000),
        activePaymentId: "pay-1",
        activePaymentMethod: "TRANSFER",
        activePaymentAmountCents: BigInt(5_000),
        totalPaidCents: BigInt(15_000),
        totalPendingCents: BigInt(25_000),
        totalOverdueCents: BigInt(10_000),
      },
    ]);

    (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "wo-1",
        status: "COMPLETED",
        completedAt: new Date("2026-08-05T10:00:00Z"),
        isSpecial: false,
        paymentDueDate: new Date("2026-08-12T10:00:00Z"),
        quote: { id: "q-1", number: "COT-01", totalCents: 10_000, items: [], sections: [] },
        assignments: [],
      },
    ]);

    const result = await listCompletedWorkOrders(input);

    expect(result.totals).toEqual({
      totalPaidCents: 15_000,
      totalPendingCents: 25_000,
      totalOverdueCents: 10_000,
    });
  });

  it("lists an issued SALE payable note without hydrating a WorkOrder", async () => {
    const input = {
      start: new Date("2026-08-03T06:00:00Z"),
      end: new Date("2026-08-10T06:00:00Z"),
      payment: "all" as const,
      assignee: "all" as const,
      page: 1,
    };
    (prisma.$queryRaw as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        id: "sale-note-1",
        effectiveTotalCents: BigInt(2_500),
        paidCents: BigInt(1_000),
        activePaymentId: "payment-1",
        activePaymentMethod: "TRANSFER",
        activePaymentAmountCents: BigInt(1_000),
        issuedAt: new Date("2026-08-05T10:00:00Z"),
        totalPaidCents: BigInt(1_000),
        totalPendingCents: BigInt(1_500),
        totalOverdueCents: BigInt(1_500),
      }]);
    (prisma.payableNote.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "sale-note-1" });
    (prisma.payableNote.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{
      id: "sale-note-1",
      referenceNumber: "N-080526-01",
      issuedAt: new Date("2026-08-05T10:00:00Z"),
      paymentDueDate: null,
      quote: {
        id: "sale-quote-1",
        number: "COT-001",
        customer: { name: "Sale customer" },
        vehicle: null,
        totalCents: 2_500,
        items: [],
        sections: [],
        sharedQuotes: [],
      },
    }]);

    const result = await listCompletedWorkOrders(input);
    const saleQuery = (prisma.$queryRaw as ReturnType<typeof vi.fn>).mock.calls[1][0];
    const saleSql = saleQuery.strings.join("?");

    expect(result.workOrders[0]).toMatchObject({
      kind: "SALE",
      payableNoteId: "sale-note-1",
      number: "N-080526-01",
      quote: { paidCents: 1_000, remainingCents: 1_500 },
    });
    expect(result.totals).toEqual({ totalPaidCents: 1_000, totalPendingCents: 1_500, totalOverdueCents: 1_500 });
    expect(saleSql).toContain('SUM(COALESCE(SUM(pa."amountCents")');
    expect(saleSql).toContain('FILTER (WHERE pa."reversedAt" IS NULL AND p.id IS NOT NULL');
    expect(saleSql).toContain('pn."paymentDueDate" < ?');
    expect(saleSql).not.toContain('SUM(COALESCE(pa."amountCents", 0)) FILTER');
    expect(prisma.workOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: [] } } }));
  });

  it("paginates one globally ordered WORK and SALE result set without duplicate or missing IDs", async () => {
    const input = {
      start: new Date("2026-08-03T06:00:00Z"),
      end: new Date("2026-08-10T06:00:00Z"),
      payment: "all" as const,
      assignee: "all" as const,
      page: 2,
    };
    const rows = Array.from({ length: 21 }, (_, index) => ({
      id: `note-${String(index + 1).padStart(2, "0")}`,
      effectiveTotalCents: BigInt(100),
      paidCents: BigInt(0),
      activePaymentId: null,
      activePaymentMethod: null,
      activePaymentAmountCents: null,
      completedAt: new Date(Date.UTC(2026, 7, 9, 23, 59, 59 - index)),
      issuedAt: new Date(Date.UTC(2026, 7, 9, 23, 59, 59 - index)),
    }));
    (prisma.$queryRaw as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(rows.filter((_, index) => index % 2 === 0))
      .mockResolvedValueOnce(rows.filter((_, index) => index % 2 === 1))
      .mockResolvedValueOnce(rows.filter((_, index) => index % 2 === 0))
      .mockResolvedValueOnce(rows.filter((_, index) => index % 2 === 1));
    (prisma.payableNote.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "sale-candidate" });
    (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) =>
      where.id.in.map((id) => ({ id, status: "COMPLETED", completedAt: new Date("2026-08-09T23:59:59Z"), quote: { id: `quote-${id}`, totalCents: 100, items: [], sections: [] }, assignments: [] })),
    );
    (prisma.payableNote.findMany as ReturnType<typeof vi.fn>).mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) =>
      where.id.in.map((id) => ({ id, referenceNumber: id, issuedAt: new Date("2026-08-09T23:59:59Z"), paymentDueDate: null, quote: { id: `quote-${id}`, totalCents: 100, items: [], sections: [], sharedQuotes: [] } })),
    );

    const pageOne = await listCompletedWorkOrders({ ...input, page: 1 });
    const pageTwo = await listCompletedWorkOrders(input);
    const ids = [...pageOne.workOrders, ...pageTwo.workOrders].map(({ id }) => id);

    expect(pageOne.workOrders).toHaveLength(20);
    expect(pageOne.hasNextPage).toBe(true);
    expect(pageTwo.workOrders.map(({ id }) => id)).toEqual(["note-21"]);
    expect(pageTwo.hasNextPage).toBe(false);
    expect(new Set(ids).size).toBe(21);
    expect(ids).toEqual(rows.map(({ id }) => id));
  });

  it("reports full filtered-set totals and hasNextPage when the requested page is empty", async () => {
    (prisma.$queryRaw as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ id: "work-1", totalPaidCents: BigInt(400), totalPendingCents: BigInt(600), totalOverdueCents: BigInt(200) }])
      .mockResolvedValueOnce([{ id: "sale-1", totalPaidCents: BigInt(300), totalPendingCents: BigInt(700), totalOverdueCents: BigInt(100) }]);
    (prisma.payableNote.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "sale-candidate" });

    const result = await listCompletedWorkOrders({
      start: new Date("2026-08-03T06:00:00Z"),
      end: new Date("2026-08-10T06:00:00Z"),
      payment: "all",
      assignee: "all",
      page: 3,
    });

    expect(result.workOrders).toEqual([]);
    expect(result.hasNextPage).toBe(false);
    expect(result.totals).toEqual({ totalPaidCents: 700, totalPendingCents: 1300, totalOverdueCents: 300 });
  });

  it("applies the shared period/payment/customer/overdue filters to both note kinds", async () => {
    const input = {
      start: new Date("2026-08-03T06:00:00Z"),
      end: new Date("2026-08-10T06:00:00Z"),
      payment: "pending" as const,
      assignee: "all" as const,
      customerId: "customer-shared",
      overdue: "overdue" as const,
      page: 1,
    };
    await listCompletedWorkOrders(input);

    const [workQuery, saleQuery] = (prisma.$queryRaw as ReturnType<typeof vi.fn>).mock.calls.map(([query]) => query);
    const workSql = workQuery.strings.join("?");
    const saleSql = saleQuery.strings.join("?");
    expect(workSql).toContain('wo."completedAt" >= ?');
    expect(workSql).toContain('q."customerId" = ?');
    expect(workSql).toContain('wo."paymentDueDate" IS NOT NULL');
    expect(saleSql).toContain('pn."issuedAt" >= ?');
    expect(saleSql).toContain('pn."customerId" = ?');
    expect(saleSql).toContain('pn."paymentDueDate" IS NOT NULL');
    expect(workQuery.values).toContain("customer-shared");
    expect(saleQuery.values).toContain("customer-shared");
  });

  it("keeps SALE records out when a WORK assignee is selected", async () => {
    await listCompletedWorkOrders({
      start: new Date("2026-08-03T06:00:00Z"),
      end: new Date("2026-08-10T06:00:00Z"),
      payment: "all",
      assignee: "a0b1c2d3-1234-4abc-8def-1234567890ab",
      page: 1,
    });

    expect(prisma.payableNote.findFirst).not.toHaveBeenCalled();
  });
});
