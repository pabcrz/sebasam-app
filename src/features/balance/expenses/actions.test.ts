import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";

const redirectMock = vi.hoisted(() => vi.fn((url: string) => { throw new Error(`redirect:${url}`); }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireAdmin: vi.fn().mockResolvedValue({ profile: { id: "user-1", role: "ADMIN" } }) }));
vi.mock("@/lib/prisma", () => ({ prisma: { expense: { create: vi.fn(), updateMany: vi.fn() } } }));

import { createExpenseFromForm, deleteExpenseFromForm, updateExpenseFromForm } from "./actions";

function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  const values = { spentAt: "2026-11-20", amount: "1500.50", category: "FUEL_TRANSPORT", invoiceStatus: "INVOICED", partsSharePercent: "50", supplier: "Gasolinera", paymentMethod: "CASH", notes: "", month: "2026-11", ...overrides };
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

async function redirectTarget(run: () => Promise<unknown>) {
  try { await run(); } catch (error) { return (error as Error).message.replace("redirect:", ""); }
  return null;
}

describe("expense actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.expense.updateMany).mockResolvedValue({ count: 1 });
  });

  it("creates an expense for the admin, with the date at UTC midnight, and returns to the same month", async () => {
    const target = await redirectTarget(() => createExpenseFromForm(form()));

    expect(requireAdmin).toHaveBeenCalled();
    expect(prisma.expense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ amountCents: 150_050, category: "FUEL_TRANSPORT", invoiceStatus: "INVOICED", partsSharePercent: 50, supplier: "Gasolinera", paymentMethod: "CASH", createdById: "user-1", spentAt: new Date("2026-11-20T00:00:00.000Z") }),
    });
    expect(target).toBe("/admin/balance?tab=gastos&month=2026-11&created=1");
  });

  it("never writes anything when the data is invalid, and flags the error", async () => {
    for (const bad of [{ amount: "abc" }, { amount: "0" }, { spentAt: "2026-13-01" }, { category: "VACATIONS" }, { partsSharePercent: "150" }] as Array<Record<string, string>>) {
      expect(await redirectTarget(() => createExpenseFromForm(form(bad)))).toBe("/admin/balance?tab=gastos&month=2026-11&error=invalid");
    }
    expect(prisma.expense.create).not.toHaveBeenCalled();
  });

  it("ignores a month that is not YYYY-MM instead of building a link from it", async () => {
    const target = await redirectTarget(() => createExpenseFromForm(form({ month: "https://evil.example" })));
    expect(target).toBe("/admin/balance?tab=gastos&created=1");
  });

  it("does not run for a user who is not admin", async () => {
    vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("forbidden"));

    await expect(createExpenseFromForm(form())).rejects.toThrow("forbidden");
    expect(prisma.expense.create).not.toHaveBeenCalled();
  });

  it("updates only a live expense and reports one that no longer exists", async () => {
    expect(await redirectTarget(() => updateExpenseFromForm("e-1", form()))).toBe("/admin/balance?tab=gastos&month=2026-11&updated=1");
    expect(prisma.expense.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "e-1", deletedAt: null } }));

    vi.mocked(prisma.expense.updateMany).mockResolvedValueOnce({ count: 0 });
    expect(await redirectTarget(() => updateExpenseFromForm("gone", form()))).toBe("/admin/balance?tab=gastos&month=2026-11&error=notfound");
  });

  it("deletes softly: marks the expense and keeps the row", async () => {
    const target = await redirectTarget(() => deleteExpenseFromForm("e-1", form()));

    expect(prisma.expense.updateMany).toHaveBeenCalledWith({ where: { id: "e-1", deletedAt: null }, data: { deletedAt: expect.any(Date) } });
    expect(target).toBe("/admin/balance?tab=gastos&month=2026-11&deleted=1");
  });
});
