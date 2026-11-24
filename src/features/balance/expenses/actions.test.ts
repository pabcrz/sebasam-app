import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { requireExpenseRole, requireSuperAdmin } from "@/lib/auth/session";

const redirectMock = vi.hoisted(() => vi.fn((url: string) => { throw new Error(`redirect:${url}`); }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({
  requireExpenseRole: vi.fn().mockResolvedValue({ profile: { id: "user-1", role: "ADMIN" } }),
  requireSuperAdmin: vi.fn().mockResolvedValue({ profile: { id: "owner-1", role: "SUPER_ADMIN" } }),
}));
const tx = vi.hoisted(() => ({
  expense: { findFirst: vi.fn() },
  payableNote: { findFirst: vi.fn() },
  expenseAllocation: { upsert: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    expense: { create: vi.fn(), updateMany: vi.fn(), findFirst: vi.fn() },
    expenseAllocation: { deleteMany: vi.fn() },
    $transaction: vi.fn(async (run: (client: typeof tx) => unknown) => run(tx)),
  },
}));

import { assignExpenseShareFromForm, createExpenseFromForm, deleteExpenseFromForm, linkExpenseToNoteFromForm, unlinkExpenseFromNoteFromForm, updateExpenseFromForm } from "./actions";

function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  const values = { spentAt: "2026-11-20", amount: "1500.50", category: "FUEL_TRANSPORT", invoiceStatus: "INVOICED", supplier: "Gasolinera", paymentMethod: "CASH", notes: "", month: "2026-11", ...overrides };
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
    vi.mocked(prisma.expense.findFirst).mockResolvedValue({ category: "FUEL_TRANSPORT", partsSharePercent: 50 } as never);
  });

  it("creates an expense whose split is the category's proposal, whatever the form says", async () => {
    await redirectTarget(() => createExpenseFromForm(form({ category: "PARTS_PURCHASE", partsSharePercent: "0" })));
    expect(prisma.expense.create).toHaveBeenLastCalledWith({ data: expect.objectContaining({ category: "PARTS_PURCHASE", partsSharePercent: 100 }) });

    await redirectTarget(() => createExpenseFromForm(form({ category: "RENT", partsSharePercent: "100" })));
    expect(prisma.expense.create).toHaveBeenLastCalledWith({ data: expect.objectContaining({ category: "RENT", partsSharePercent: 0 }) });
  });

  it("creates an expense for the admin, with the date at UTC midnight, and returns to the same month", async () => {
    const target = await redirectTarget(() => createExpenseFromForm(form()));

    expect(requireExpenseRole).toHaveBeenCalled();
    expect(prisma.expense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ amountCents: 150_050, category: "FUEL_TRANSPORT", invoiceStatus: "INVOICED", partsSharePercent: 50, supplier: "Gasolinera", paymentMethod: "CASH", createdById: "user-1", spentAt: new Date("2026-11-20T00:00:00.000Z") }),
    });
    expect(target).toBe("/admin/balance?tab=gastos&month=2026-11&created=1");
  });

  it("never writes anything when the data is invalid, and flags the error", async () => {
    for (const bad of [{ amount: "abc" }, { amount: "0" }, { spentAt: "2026-13-01" }, { category: "VACATIONS" }] as Array<Record<string, string>>) {
      expect(await redirectTarget(() => createExpenseFromForm(form(bad)))).toBe("/admin/balance?tab=gastos&month=2026-11&error=invalid");
    }
    expect(prisma.expense.create).not.toHaveBeenCalled();
  });

  it("ignores a month that is not YYYY-MM instead of building a link from it", async () => {
    const target = await redirectTarget(() => createExpenseFromForm(form({ month: "https://evil.example" })));
    expect(target).toBe("/admin/balance?tab=gastos&created=1");
  });

  it("does not run for a user who is not admin", async () => {
    vi.mocked(requireExpenseRole).mockRejectedValueOnce(new Error("forbidden"));

    await expect(createExpenseFromForm(form())).rejects.toThrow("forbidden");
    expect(prisma.expense.create).not.toHaveBeenCalled();
  });

  it("updates a live expense and reports one that no longer exists", async () => {
    expect(await redirectTarget(() => updateExpenseFromForm("e-1", form()))).toBe("/admin/balance?tab=gastos&month=2026-11&updated=1");
    expect(prisma.expense.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "e-1", deletedAt: null } }));
    expect(prisma.expense.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "e-1", deletedAt: null } }));

    vi.mocked(prisma.expense.findFirst).mockResolvedValueOnce(null);
    expect(await redirectTarget(() => updateExpenseFromForm("gone", form()))).toBe("/admin/balance?tab=gastos&month=2026-11&error=notfound");
  });

  it("keeps the owner's assignment when the registrar edits an expense", async () => {
    vi.mocked(prisma.expense.findFirst).mockResolvedValue({ category: "FUEL_TRANSPORT", partsSharePercent: 80 } as never);

    await redirectTarget(() => updateExpenseFromForm("e-1", form({ category: "FUEL_TRANSPORT", amount: "2000" })));
    expect(prisma.expense.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ amountCents: 200_000, partsSharePercent: 80 }) }));

    // Even if the category changes, a share the owner customized stays.
    await redirectTarget(() => updateExpenseFromForm("e-1", form({ category: "RENT" })));
    expect(prisma.expense.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ partsSharePercent: 80 }) }));
  });

  it("lets an untouched share follow a change of category", async () => {
    vi.mocked(prisma.expense.findFirst).mockResolvedValue({ category: "RENT", partsSharePercent: 0 } as never);

    await redirectTarget(() => updateExpenseFromForm("e-1", form({ category: "PARTS_PURCHASE" })));

    expect(prisma.expense.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ category: "PARTS_PURCHASE", partsSharePercent: 100 }) }));
  });

  it("lets only the owner assign the split of an expense", async () => {
    const target = await redirectTarget(() => assignExpenseShareFromForm("e-1", form({ partsSharePercent: "30" })));

    expect(requireSuperAdmin).toHaveBeenCalled();
    expect(prisma.expense.updateMany).toHaveBeenCalledWith({ where: { id: "e-1", deletedAt: null }, data: { partsSharePercent: 30 } });
    expect(target).toBe("/admin/balance?tab=utilidad&view=asignar&month=2026-11&assigned=1");

    vi.mocked(requireSuperAdmin).mockRejectedValueOnce(new Error("forbidden"));
    vi.mocked(prisma.expense.updateMany).mockClear();
    await expect(assignExpenseShareFromForm("e-1", form({ partsSharePercent: "30" }))).rejects.toThrow("forbidden");
    expect(prisma.expense.updateMany).not.toHaveBeenCalled();
  });

  it("rejects an assignment outside 0-100 or for an expense that is gone", async () => {
    for (const bad of ["-5", "101", "abc", "12.5", ""]) {
      expect(await redirectTarget(() => assignExpenseShareFromForm("e-1", form({ partsSharePercent: bad })))).toBe("/admin/balance?tab=utilidad&view=asignar&month=2026-11&error=invalid");
    }
    expect(prisma.expense.updateMany).not.toHaveBeenCalled();

    vi.mocked(prisma.expense.updateMany).mockResolvedValueOnce({ count: 0 });
    expect(await redirectTarget(() => assignExpenseShareFromForm("gone", form({ partsSharePercent: "10" })))).toBe("/admin/balance?tab=utilidad&view=asignar&month=2026-11&error=notfound");
  });

  it("deletes softly: marks the expense and keeps the row", async () => {
    const target = await redirectTarget(() => deleteExpenseFromForm("e-1", form()));

    expect(prisma.expense.updateMany).toHaveBeenCalledWith({ where: { id: "e-1", deletedAt: null }, data: { deletedAt: expect.any(Date) } });
    expect(target).toBe("/admin/balance?tab=gastos&month=2026-11&deleted=1");
  });

  describe("charging a purchase to notes", () => {
    const assigned = "/admin/balance?tab=utilidad&view=asignar&month=2026-11";
    const expense = (charged: Array<[string, number]> = []) => ({ amountCents: 100_000, allocations: charged.map(([payableNoteId, amountCents]) => ({ payableNoteId, amountCents })) });

    beforeEach(() => {
      tx.expense.findFirst.mockResolvedValue(expense());
      tx.payableNote.findFirst.mockResolvedValue({ id: "n1" });
    });

    it("links a piece of the purchase to an issued note, for the owner only", async () => {
      const target = await redirectTarget(() => linkExpenseToNoteFromForm("e-1", form({ payableNoteId: "n1", amount: "600" })));

      expect(requireSuperAdmin).toHaveBeenCalled();
      expect(tx.expenseAllocation.upsert).toHaveBeenCalledWith({
        where: { expenseId_payableNoteId: { expenseId: "e-1", payableNoteId: "n1" } },
        create: { expenseId: "e-1", payableNoteId: "n1", amountCents: 60_000 },
        update: { amountCents: 60_000 },
      });
      expect(target).toBe(`${assigned}&assigned=1`);

      vi.mocked(requireSuperAdmin).mockRejectedValueOnce(new Error("forbidden"));
      await expect(linkExpenseToNoteFromForm("e-1", form({ payableNoteId: "n1", amount: "600" }))).rejects.toThrow("forbidden");
    });

    it("never lets the linked pieces add up to more than the purchase", async () => {
      tx.expense.findFirst.mockResolvedValue(expense([["n2", 70_000]]));

      expect(await redirectTarget(() => linkExpenseToNoteFromForm("e-1", form({ payableNoteId: "n1", amount: "400" })))).toBe(`${assigned}&error=exceeds`);
      expect(tx.expenseAllocation.upsert).not.toHaveBeenCalled();
    });

    it("lets the owner change the piece already linked to the same note", async () => {
      tx.expense.findFirst.mockResolvedValue(expense([["n1", 90_000]]));

      expect(await redirectTarget(() => linkExpenseToNoteFromForm("e-1", form({ payableNoteId: "n1", amount: "1000" })))).toBe(`${assigned}&assigned=1`);
      expect(tx.expenseAllocation.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { amountCents: 100_000 } }));
    });

    it("rejects a missing note or expense and a blank, zero or invalid amount", async () => {
      tx.payableNote.findFirst.mockResolvedValue(null);
      expect(await redirectTarget(() => linkExpenseToNoteFromForm("e-1", form({ payableNoteId: "draft", amount: "100" })))).toBe(`${assigned}&error=notfound`);

      tx.payableNote.findFirst.mockResolvedValue({ id: "n1" });
      for (const amount of ["", "0", "abc"]) {
        expect(await redirectTarget(() => linkExpenseToNoteFromForm("e-1", form({ payableNoteId: "n1", amount })))).toBe(`${assigned}&error=invalid`);
      }
      expect(tx.expenseAllocation.upsert).not.toHaveBeenCalled();
    });

    it("unlinks a note, for the owner only", async () => {
      const target = await redirectTarget(() => unlinkExpenseFromNoteFromForm("e-1", "n1", form()));

      expect(prisma.expenseAllocation.deleteMany).toHaveBeenCalledWith({ where: { expenseId: "e-1", payableNoteId: "n1" } });
      expect(target).toBe(`${assigned}&assigned=1`);

      vi.mocked(requireSuperAdmin).mockRejectedValueOnce(new Error("forbidden"));
      await expect(unlinkExpenseFromNoteFromForm("e-1", "n1", form())).rejects.toThrow("forbidden");
    });
  });
});
