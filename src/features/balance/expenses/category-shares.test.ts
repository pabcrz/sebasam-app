import { describe, expect, it, vi } from "vitest";
import { categoryShareFor, getCategoryShares } from "./category-shares";

const client = (overrides: Array<{ category: string; partsSharePercent: number }>) =>
  ({ expenseCategoryShare: { findMany: vi.fn().mockResolvedValue(overrides), findUnique: vi.fn(async ({ where }: { where: { category: string } }) => overrides.find((row) => row.category === where.category) ?? null) } }) as never;

describe("category shares", () => {
  it("uses the code's default for every category, and the owner's setting where there is one", async () => {
    const shares = await getCategoryShares(client([{ category: "FUEL_TRANSPORT", partsSharePercent: 30 }]));
    expect(shares.FUEL_TRANSPORT).toBe(30);
    expect(shares.PARTS_PURCHASE).toBe(100);
    expect(shares.RENT).toBe(0);
    expect(Object.keys(shares)).toHaveLength(10);
  });

  it("looks up one category with the same rule", async () => {
    const withOverride = client([{ category: "RENT", partsSharePercent: 10 }]);
    expect(await categoryShareFor(withOverride, "RENT")).toBe(10);
    expect(await categoryShareFor(withOverride, "FUEL_TRANSPORT")).toBe(50);
  });
});
