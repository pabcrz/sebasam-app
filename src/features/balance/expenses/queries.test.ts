import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { parseMonthPeriod } from "../profit-queries";

vi.mock("@/lib/auth/session", () => ({ requireExpenseRole: vi.fn().mockResolvedValue({}), requireSuperAdmin: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/prisma", () => ({ prisma: { recurringExpense: { findMany: vi.fn() } } }));

import { listRecurringForMonth } from "./queries";

const template = (id: string, overrides: Record<string, unknown> = {}) => ({
  id, category: "RENT", amountCents: 500_000, invoiceStatus: "NOT_INVOICED", supplier: null, dayOfMonth: 5,
  createdAt: new Date("2026-09-15T12:00:00Z"), skips: [], expenses: [], ...overrides,
});

describe("listRecurringForMonth", () => {
  const now = new Date("2026-11-24T18:00:00Z");
  beforeEach(() => vi.clearAllMocks());

  it("proposes a template only while nothing was registered or skipped for the month, and keeps listing it either way", async () => {
    vi.mocked(prisma.recurringExpense.findMany).mockResolvedValue([
      template("open"),
      template("paid", { expenses: [{ id: "e1" }] }),
      template("skipped", { skips: [{ month: "2026-11" }] }),
    ] as never);

    const { templates, pending } = await listRecurringForMonth(parseMonthPeriod("2026-11", now), now);

    expect(templates.map((row) => row.id)).toEqual(["open", "paid", "skipped"]);
    expect(pending.map((row) => row.id)).toEqual(["open"]);
  });

  it("proposes nothing for a future month or for a month before the template existed", async () => {
    vi.mocked(prisma.recurringExpense.findMany).mockResolvedValue([template("t")] as never);

    expect((await listRecurringForMonth(parseMonthPeriod("2026-12", now), now)).pending).toEqual([]);
    expect((await listRecurringForMonth(parseMonthPeriod("2026-08", now), now)).pending).toEqual([]);
    expect((await listRecurringForMonth(parseMonthPeriod("2026-09", now), now)).pending).toHaveLength(1);
  });

  it("asks only for active templates and, per month, for its own skips and expenses", async () => {
    vi.mocked(prisma.recurringExpense.findMany).mockResolvedValue([] as never);
    const period = parseMonthPeriod("2026-11", now);
    await listRecurringForMonth(period, now);

    const args = vi.mocked(prisma.recurringExpense.findMany).mock.calls[0][0] as { where: unknown; select: { skips: { where: unknown }; expenses: { where: unknown } } };
    expect(args.where).toEqual({ active: true });
    expect(args.select.skips.where).toEqual({ month: "2026-11" });
    expect(args.select.expenses.where).toEqual({ deletedAt: null, spentAt: { gte: period.dateStart, lt: period.dateEnd } });
  });
});
