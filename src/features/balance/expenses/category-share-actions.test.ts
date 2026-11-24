import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth/session";
import { EXPENSE_CATEGORIES } from "./categories";

const redirectMock = vi.hoisted(() => vi.fn((url: string) => { throw new Error(`redirect:${url}`); }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireSuperAdmin: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/prisma", () => ({
  prisma: { expenseCategoryShare: { deleteMany: vi.fn((args) => ({ op: "delete", args })), upsert: vi.fn((args) => ({ op: "upsert", args })) }, $transaction: vi.fn(async (ops: unknown[]) => ops) },
}));

import { saveCategorySharesAction } from "./category-share-actions";

const defaults = () => Object.fromEntries(EXPENSE_CATEGORIES.map((category) => [`share-${category.value}`, String(category.defaultPartsSharePercent)]));
function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ ...defaults(), ...overrides })) data.set(key, value);
  return data;
}
async function target(run: () => Promise<unknown>) {
  try { await run(); } catch (error) { return (error as Error).message.replace("redirect:", ""); }
  return null;
}

describe("saveCategorySharesAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stores only what differs from the default, and removes an override that went back to it", async () => {
    expect(await target(() => saveCategorySharesAction(form({ "share-FUEL_TRANSPORT": "30", "share-RENT": "10" })))).toBe("/admin/configuracion-pago/porcentajes-gastos?saved=1");

    expect(prisma.expenseCategoryShare.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.expenseCategoryShare.upsert).toHaveBeenCalledWith({ where: { category: "FUEL_TRANSPORT" }, create: { category: "FUEL_TRANSPORT", partsSharePercent: 30 }, update: { partsSharePercent: 30 } });
    expect(prisma.expenseCategoryShare.deleteMany).toHaveBeenCalledWith({ where: { category: "PARTS_PURCHASE" } });
    expect(prisma.expenseCategoryShare.deleteMany).toHaveBeenCalledTimes(EXPENSE_CATEGORIES.length - 2);
  });

  it("writes nothing when any value is blank, out of range or not a whole number", async () => {
    for (const bad of ["", "101", "-1", "12.5", "abc"]) {
      expect(await target(() => saveCategorySharesAction(form({ "share-RENT": bad })))).toBe("/admin/configuracion-pago/porcentajes-gastos?error=invalid");
    }
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("is the owner's alone", async () => {
    vi.mocked(requireSuperAdmin).mockRejectedValueOnce(new Error("forbidden"));
    await expect(saveCategorySharesAction(form())).rejects.toThrow("forbidden");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
