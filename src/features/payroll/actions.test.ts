import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuoteItemType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { updatePayrollItemBase } from "./actions";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    quoteItem: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireOperationalRole: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Payroll Actions - updatePayrollItemBase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("successfully updates custom payroll base for a LABOR item", async () => {
    (prisma.quoteItem.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "item-1",
      type: QuoteItemType.LABOR,
      totalCents: 200000,
      includeInPayroll: false,
    });
    (prisma.quoteItem.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "item-1",
      customPayrollBaseCents: 100000,
    });

    const result = await updatePayrollItemBase({
      itemId: "item-1",
      customPayrollBaseCents: 100000,
    });

    expect(requireOperationalRole).toHaveBeenCalledTimes(1);
    expect(prisma.quoteItem.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: { customPayrollBaseCents: 100000 },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/nomina");
    expect(result).toEqual({ success: true });
  });

  it("successfully resets custom payroll base to null (removes adjustment)", async () => {
    (prisma.quoteItem.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "item-1",
      type: QuoteItemType.LABOR,
      totalCents: 200000,
      includeInPayroll: false,
    });
    (prisma.quoteItem.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "item-1",
      customPayrollBaseCents: null,
    });

    const result = await updatePayrollItemBase({
      itemId: "item-1",
      customPayrollBaseCents: null,
    });

    expect(prisma.quoteItem.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: { customPayrollBaseCents: null },
    });
    expect(result).toEqual({ success: true });
  });

  it("supports updating both custom base and custom rate percent (e.g. 55%)", async () => {
    (prisma.quoteItem.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "item-1",
      type: QuoteItemType.LABOR,
      totalCents: 200000,
      includeInPayroll: false,
    });

    const result = await updatePayrollItemBase({
      itemId: "item-1",
      customPayrollBaseCents: 120000,
      customRatePercent: 55,
    });

    expect(prisma.quoteItem.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: { customPayrollBaseCents: 120000, customRatePercent: 55 },
    });
    expect(result).toEqual({ success: true });
  });

  it("supports resetting both base and rate percent to null", async () => {
    (prisma.quoteItem.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "item-1",
      type: QuoteItemType.LABOR,
      totalCents: 200000,
      includeInPayroll: false,
    });

    const result = await updatePayrollItemBase({
      itemId: "item-1",
      customPayrollBaseCents: null,
      customRatePercent: null,
    });

    expect(prisma.quoteItem.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: { customPayrollBaseCents: null, customRatePercent: null },
    });
    expect(result).toEqual({ success: true });
  });

  it("rejects custom base greater than client total cents", async () => {
    (prisma.quoteItem.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "item-1",
      type: QuoteItemType.LABOR,
      totalCents: 100000, // $1,000 charged to client
      includeInPayroll: false,
    });

    const result = await updatePayrollItemBase({
      itemId: "item-1",
      customPayrollBaseCents: 120000, // $1,200 > $1,000
    });

    expect(result).toEqual({
      success: false,
      error: "La base de nómina no puede ser mayor al cobro del cliente.",
    });
    expect(prisma.quoteItem.update).not.toHaveBeenCalled();
  });

  it("validates input: rejects custom rate percent out of range (< 1 or > 100)", async () => {
    const resLow = await updatePayrollItemBase({
      itemId: "item-1",
      customPayrollBaseCents: 100000,
      customRatePercent: 0,
    });
    expect(resLow.success).toBe(false);

    const resHigh = await updatePayrollItemBase({
      itemId: "item-1",
      customPayrollBaseCents: 100000,
      customRatePercent: 105,
    });
    expect(resHigh.success).toBe(false);
  });

  it("supports setting custom payroll base explicitly to 0 cents", async () => {
    (prisma.quoteItem.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "item-1",
      type: QuoteItemType.LABOR,
      totalCents: 100000,
      includeInPayroll: false,
    });

    const result = await updatePayrollItemBase({
      itemId: "item-1",
      customPayrollBaseCents: 0,
    });

    expect(prisma.quoteItem.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: { customPayrollBaseCents: 0 },
    });
    expect(result).toEqual({ success: true });
  });

  it("supports updating an OTHER item when includeInPayroll is true", async () => {
    (prisma.quoteItem.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "item-other",
      type: QuoteItemType.OTHER,
      totalCents: 100000,
      includeInPayroll: true,
    });

    const result = await updatePayrollItemBase({
      itemId: "item-other",
      customPayrollBaseCents: 80000,
    });

    expect(prisma.quoteItem.update).toHaveBeenCalledWith({
      where: { id: "item-other" },
      data: { customPayrollBaseCents: 80000 },
    });
    expect(result).toEqual({ success: true });
  });

  it("rejects non-commissionable items (e.g. MATERIAL)", async () => {
    (prisma.quoteItem.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "item-mat",
      type: QuoteItemType.MATERIAL,
      includeInPayroll: false,
    });

    const result = await updatePayrollItemBase({
      itemId: "item-mat",
      customPayrollBaseCents: 50000,
    });

    expect(prisma.quoteItem.update).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/solo los conceptos de mano de obra/i);
  });

  it("rejects OTHER items when includeInPayroll is false", async () => {
    (prisma.quoteItem.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "item-other-excluded",
      type: QuoteItemType.OTHER,
      includeInPayroll: false,
    });

    const result = await updatePayrollItemBase({
      itemId: "item-other-excluded",
      customPayrollBaseCents: 50000,
    });

    expect(prisma.quoteItem.update).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });

  it("rejects when item is not found", async () => {
    (prisma.quoteItem.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await updatePayrollItemBase({
      itemId: "missing-item",
      customPayrollBaseCents: 50000,
    });

    expect(prisma.quoteItem.update).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no existe o no fue encontrado/i);
  });

  it("validates input: rejects negative amounts", async () => {
    const result = await updatePayrollItemBase({
      itemId: "item-1",
      customPayrollBaseCents: -500,
    });

    expect(prisma.quoteItem.update).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no puede ser negativa/i);
  });

  it("validates input: rejects non-integer cents", async () => {
    const result = await updatePayrollItemBase({
      itemId: "item-1",
      customPayrollBaseCents: 100.5,
    });

    expect(prisma.quoteItem.update).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/entero en centavos/i);
  });

  it("requires operational role check and returns error gracefully", async () => {
    (requireOperationalRole as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Unauthorized")
    );

    const result = await updatePayrollItemBase({
      itemId: "item-1",
      customPayrollBaseCents: 100000,
    });

    expect(result).toEqual({
      success: false,
      error: "Unauthorized",
    });
  });
});
