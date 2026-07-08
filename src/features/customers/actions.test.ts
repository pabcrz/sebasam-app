import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { createOrReuseCustomerForQuote } from "./actions";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireOperationalRole: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const existingCustomer = {
  id: "cust-existing",
  name: "Taller   Central",
  email: "cliente@example.com",
  phone: "55 1111 2222",
  address: null,
  status: "ACTIVE",
  notes: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

describe("createOrReuseCustomerForQuote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireOperationalRole as ReturnType<typeof vi.fn>).mockResolvedValue({ profile: { id: "admin-1" } });
    (prisma.customer.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.customer.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...existingCustomer,
      id: "cust-new",
      name: "Nuevo Cliente",
      email: null,
      phone: null,
    });
  });

  it("reuses a comparable customer instead of creating a duplicate", async () => {
    (prisma.customer.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([existingCustomer]);

    const result = await createOrReuseCustomerForQuote({
      name: " taller   central ",
      email: "cliente@example.com",
      phone: "55 1111 2222",
      address: "",
      notes: "",
    });

    expect(result).toEqual({ success: true, customer: existingCustomer, reused: true });
    expect(prisma.customer.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: expect.arrayContaining([
          {
            AND: [
              { name: { contains: "taller", mode: "insensitive" } },
              { name: { contains: "central", mode: "insensitive" } },
            ],
          },
        ]),
      }),
    }));
    expect(prisma.customer.create).not.toHaveBeenCalled();
  });

  it("requires an operational role before reading or creating customers", async () => {
    (requireOperationalRole as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Unauthorized"));

    await expect(createOrReuseCustomerForQuote({ name: "Nuevo Cliente" })).rejects.toThrow("Unauthorized");

    expect(prisma.customer.findMany).not.toHaveBeenCalled();
    expect(prisma.customer.create).not.toHaveBeenCalled();
  });

  it("creates a customer when no comparable customer exists", async () => {
    const result = await createOrReuseCustomerForQuote({
      name: "Nuevo Cliente",
      email: "",
      phone: "",
      address: "",
      notes: "",
    });

    expect(prisma.customer.create).toHaveBeenCalledWith({
      data: {
        name: "Nuevo Cliente",
        email: null,
        phone: null,
        address: null,
        notes: null,
      },
    });
    expect(result).toMatchObject({ success: true, reused: false, customer: { id: "cust-new" } });
  });

  it("returns an error result for invalid customer input", async () => {
    const result = await createOrReuseCustomerForQuote({ name: "", email: "not-an-email" });

    expect(result).toEqual({ success: false, error: "invalid" });
    expect(prisma.customer.findMany).not.toHaveBeenCalled();
    expect(prisma.customer.create).not.toHaveBeenCalled();
  });
});
