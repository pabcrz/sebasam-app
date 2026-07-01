import { describe, expect, it, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { listCustomers } from "./queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireOperationalRole: vi.fn(),
}));

function getFindManyCall() {
  return (prisma.customer.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
}

describe("listCustomers search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.customer.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it("returns all customers when no query is provided", async () => {
    await listCustomers();

    const call = getFindManyCall();
    expect(call.where).toBeUndefined();
  });

  it("searches name, email, phone, address, notes and related vehicle plates", async () => {
    await listCustomers({ query: "ABC-123" });

    const call = getFindManyCall();
    expect(call.where).toEqual({
      OR: [
        { name: { contains: "ABC-123", mode: "insensitive" } },
        { email: { contains: "ABC-123", mode: "insensitive" } },
        { phone: { contains: "ABC-123", mode: "insensitive" } },
        { address: { contains: "ABC-123", mode: "insensitive" } },
        { notes: { contains: "ABC-123", mode: "insensitive" } },
        { vehicles: { some: { plate: { contains: "ABC-123", mode: "insensitive" } } } },
      ],
    });
  });

  it("limits results to 50 customers", async () => {
    await listCustomers();

    const call = getFindManyCall();
    expect(call.take).toBe(50);
  });
});
