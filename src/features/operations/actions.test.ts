import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { createOperationalWork, convertOperationalWorkToQuote } from "./actions";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    operationalWork: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn() },
    quote: { findUniqueOrThrow: vi.fn() },
  },
}));

vi.mock("@/lib/auth/session", () => ({ requireOperationalRole: vi.fn() }));
vi.mock("@/features/quotes/lib/sequence", () => ({ nextQuoteNumber: vi.fn(), nextOperationalWorkNumber: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const masterId = "11111111-1111-4111-8111-111111111111";
const input = { masterId, plate: "ABC123", concepts: [{ description: "Inspection", quantity: 1 }] };

describe("operational work actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOperationalRole).mockResolvedValue({} as never);
  });

  it("validates the active WORKER MASTER inside the transaction", async () => {
    const tx = {
      userProfile: { findFirst: vi.fn().mockResolvedValue(null) },
      customer: { findUnique: vi.fn() },
      operationalWork: { create: vi.fn() },
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(tx as never));

    await expect(createOperationalWork(input)).rejects.toThrow("active or valid");
    expect(tx.operationalWork.create).not.toHaveBeenCalled();
  });

  it("returns the existing quote on conversion retry without creating another quote", async () => {
    const existingQuote = { id: "quote-1", number: "C-0826-001" };
    const tx = {
      userProfile: { findFirst: vi.fn().mockResolvedValue({ id: masterId }) },
      operationalWork: { findUnique: vi.fn().mockResolvedValue({ masterId, convertedQuoteId: existingQuote.id, concepts: [] }) },
      quote: { findUniqueOrThrow: vi.fn().mockResolvedValue(existingQuote), create: vi.fn() },
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(tx as never));

    await expect(convertOperationalWorkToQuote("work-1")).resolves.toEqual(existingQuote);
    expect(tx.quote.create).not.toHaveBeenCalled();
    expect(tx.quote.findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: existingQuote.id } });
  });
});
