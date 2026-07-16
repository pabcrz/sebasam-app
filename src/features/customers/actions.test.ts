import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import {
  createOrReuseCustomerForQuote,
  searchCustomersForQuote,
  updateCustomerBasics,
  updateCustomerBasicsFromForm,
} from "./actions";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
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
      phone: "",
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

  it("matches a legacy phone with separated final digits beyond ten broad collisions", async () => {
    const legacyCustomer = {
      ...existingCustomer,
      name: "Different Name",
      email: null,
      phone: "55 1111 2-2-2-2",
    };
    const collisions = Array.from({ length: 11 }, (_, index) => ({
      ...existingCustomer,
      id: `collision-${index}`,
      name: "New Customer",
      phone: `55${String(index).padStart(4, "0")}2222`,
    }));
    (prisma.customer.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([...collisions, legacyCustomer]);

    const result = await createOrReuseCustomerForQuote({
      name: "New Customer",
      phone: "+52 55 1111 2222",
    });

    expect(prisma.customer.findMany).toHaveBeenCalledWith({
      where: {
        AND: [
          { phone: { not: null } },
          { phone: { not: "" } },
        ],
      },
      orderBy: [{ id: "asc" }],
    });
    expect(prisma.customer.findMany).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true, customer: legacyCustomer, reused: true });
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

  it("persists a nonblank phone as canonical national digits", async () => {
    await createOrReuseCustomerForQuote({
      name: "Nuevo Cliente",
      phone: "+52 (55) 1234-5678",
    });

    expect(prisma.customer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ phone: "5512345678" }),
    });
  });

  it("returns an error result for invalid customer input", async () => {
    const result = await createOrReuseCustomerForQuote({
      name: "Customer",
      phone: "55 1234 ABCD",
    });

    expect(result).toEqual({ success: false, error: "invalid" });
    expect(prisma.customer.findMany).not.toHaveBeenCalled();
    expect(prisma.customer.create).not.toHaveBeenCalled();
  });
});

describe("updateCustomerBasics", () => {
  const validUpdate = {
    name: "Updated Customer",
    email: "",
    phone: "legacy extension ABC",
    address: "Updated address",
    notes: "",
    status: "ACTIVE",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (requireOperationalRole as ReturnType<typeof vi.fn>).mockResolvedValue({ profile: { id: "admin-1" } });
    (prisma.customer.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "cust-1" });
  });

  it("preserves an unchanged invalid legacy phone during unrelated edits", async () => {
    (prisma.customer.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
      phone: "legacy extension ABC",
    });

    await updateCustomerBasics("cust-1", validUpdate);

    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: "cust-1" },
      data: {
        name: "Updated Customer",
        email: null,
        address: "Updated address",
        status: "ACTIVE",
        notes: null,
      },
    });
  });

  it("normalizes an unchanged canonicalizable legacy phone", async () => {
    (prisma.customer.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
      phone: "+52 (55) 1234-5678",
    });

    await updateCustomerBasics("cust-1", {
      ...validUpdate,
      phone: "+52 (55) 1234-5678",
    });

    expect(prisma.customer.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ phone: "5512345678" }),
    }));
  });

  it("rejects a newly changed invalid nonblank phone", async () => {
    (prisma.customer.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
      phone: "legacy extension ABC",
    });

    await expect(updateCustomerBasics("cust-1", {
      ...validUpdate,
      phone: "new invalid phone",
    })).rejects.toThrow();
    expect(prisma.customer.update).not.toHaveBeenCalled();
  });

  it("applies unchanged legacy compatibility through the form action", async () => {
    (prisma.customer.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
      phone: "legacy extension ABC",
    });
    const formData = new FormData();
    Object.entries(validUpdate).forEach(([key, value]) => formData.set(key, value));

    await updateCustomerBasicsFromForm("cust-1", formData);

    expect(prisma.customer.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.not.objectContaining({ phone: expect.anything() }),
    }));
  });
});

describe("searchCustomersForQuote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireOperationalRole as ReturnType<typeof vi.fn>).mockResolvedValue({ profile: { id: "admin-1" } });
    (prisma.customer.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it("requires operational auth and searches all supported customer fields with a minimal result", async () => {
    await searchCustomersForQuote({ query: "ABC-123" });

    expect(requireOperationalRole).toHaveBeenCalledOnce();
    expect(prisma.customer.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { name: { contains: "ABC-123", mode: "insensitive" } },
          { email: { contains: "ABC-123", mode: "insensitive" } },
          { phone: { contains: "ABC-123", mode: "insensitive" } },
          { address: { contains: "ABC-123", mode: "insensitive" } },
          { notes: { contains: "ABC-123", mode: "insensitive" } },
          { vehicles: { some: { plate: { contains: "ABC-123", mode: "insensitive" } } } },
        ],
      },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      take: 20,
      select: { id: true, name: true },
    });
  });

  it("does not query customers when auth fails", async () => {
    (requireOperationalRole as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Unauthorized"));

    await expect(searchCustomersForQuote({ query: "Acme" })).rejects.toThrow("Unauthorized");
    expect(prisma.customer.findMany).not.toHaveBeenCalled();
  });
});
