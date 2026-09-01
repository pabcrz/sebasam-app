import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import {
  createOrReuseCustomerForQuote,
  deleteCustomer,
  deleteCustomerFromForm,
  getCustomerDetail,
  searchCustomersForQuote,
  updateCustomerBasics,
  updateCustomerBasicsFromForm,
} from "./actions";
import { getCustomerAccountStatement, getCustomerById } from "./queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    customer: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    quote: {
      count: vi.fn(),
    },
    payment: {
      count: vi.fn(),
    },
    paymentRequest: {
      count: vi.fn(),
    },
    ledgerEntry: {
      count: vi.fn(),
    },
    vehicle: {
      deleteMany: vi.fn(),
    },
    customerFiscalProfile: {
      deleteMany: vi.fn(),
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

vi.mock("./queries", () => ({
  getCustomerAccountStatement: vi.fn(),
  getCustomerById: vi.fn(),
}));

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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

  it("matches a separated legacy phone beyond ten broad collisions", async () => {
    const legacyCustomer = {
      ...existingCustomer,
      id: "legacy-match",
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
    (prisma.customer.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      ...collisions,
      legacyCustomer,
    ]);

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
    const result = await createOrReuseCustomerForQuote({ name: "Customer", phone: "55 1234 ABCD" });

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
      phone: validUpdate.phone,
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
    const phone = "+52 (55) 1234-5678";
    (prisma.customer.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({ phone });

    await updateCustomerBasics("cust-1", { ...validUpdate, phone });

    expect(prisma.customer.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ phone: "5512345678" }),
    }));
  });

  it("rejects a changed invalid phone", async () => {
    (prisma.customer.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
      phone: validUpdate.phone,
    });

    await expect(updateCustomerBasics("cust-1", {
      ...validUpdate,
      phone: "new invalid phone",
    })).rejects.toThrow();
    expect(prisma.customer.update).not.toHaveBeenCalled();
  });

  it("clears a legacy phone when blank is submitted", async () => {
    (prisma.customer.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
      phone: validUpdate.phone,
    });

    await updateCustomerBasics("cust-1", { ...validUpdate, phone: "" });

    expect(prisma.customer.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ phone: null }),
    }));
  });

  it("applies unchanged legacy compatibility through the form action", async () => {
    (prisma.customer.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
      phone: validUpdate.phone,
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

describe("getCustomerDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("composes the canonical customer and account statement queries", async () => {
    const customer = { id: "cust-1", name: "Constructora del Norte" };
    const statement = { totalContractedCents: 25000, totalPaidCents: 17500, pendingBalanceCents: 7500, movements: [] };
    (getCustomerById as ReturnType<typeof vi.fn>).mockResolvedValue(customer);
    (getCustomerAccountStatement as ReturnType<typeof vi.fn>).mockResolvedValue(statement);

    await expect(getCustomerDetail("cust-1")).resolves.toEqual({ customer, statement });
    expect(getCustomerById).toHaveBeenCalledWith("cust-1");
    expect(getCustomerAccountStatement).toHaveBeenCalledWith("cust-1");
  });

  it("does not calculate an account statement when the customer no longer exists", async () => {
    (getCustomerById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(getCustomerDetail("missing")).resolves.toBeNull();
    expect(getCustomerAccountStatement).not.toHaveBeenCalled();
  });
});

describe("deleteCustomer", () => {
  type MockTx = {
    customer: { findUnique: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
    quote: { count: ReturnType<typeof vi.fn> };
    payment: { count: ReturnType<typeof vi.fn> };
    paymentRequest: { count: ReturnType<typeof vi.fn> };
    ledgerEntry: { count: ReturnType<typeof vi.fn> };
    vehicle: { deleteMany: ReturnType<typeof vi.fn> };
    customerFiscalProfile: { deleteMany: ReturnType<typeof vi.fn> };
  };

  function mockDeleteTx(): MockTx {
    const tx: MockTx = {
      customer: {
        findUnique: vi.fn().mockResolvedValue({ id: "cust-1", name: "Cliente Prueba" }),
        delete: vi.fn().mockResolvedValue({ id: "cust-1" }),
      },
      quote: { count: vi.fn().mockResolvedValue(0) },
      payment: { count: vi.fn().mockResolvedValue(0) },
      paymentRequest: { count: vi.fn().mockResolvedValue(0) },
      ledgerEntry: { count: vi.fn().mockResolvedValue(0) },
      vehicle: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
      customerFiscalProfile: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback: (tx: MockTx) => Promise<unknown>) => callback(tx));
    return tx;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    (requireOperationalRole as ReturnType<typeof vi.fn>).mockResolvedValue({ profile: { id: "admin-1" } });
  });

  it("authorizes and permanently deletes customer and related test vehicles and fiscal profiles", async () => {
    const tx = mockDeleteTx();

    await deleteCustomer("cust-1");

    expect(requireOperationalRole).toHaveBeenCalledTimes(1);
    expect(tx.vehicle.deleteMany).toHaveBeenCalledWith({ where: { customerId: "cust-1" } });
    expect(tx.customerFiscalProfile.deleteMany).toHaveBeenCalledWith({ where: { customerId: "cust-1" } });
    expect(tx.customer.delete).toHaveBeenCalledWith({ where: { id: "cust-1" } });
  });

  it("throws error when customer is not found", async () => {
    const tx = mockDeleteTx();
    tx.customer.findUnique.mockResolvedValue(null);

    await expect(deleteCustomer("missing")).rejects.toThrow("Customer not found.");
    expect(tx.customer.delete).not.toHaveBeenCalled();
  });

  it("rejects deletion when customer has quotes", async () => {
    const tx = mockDeleteTx();
    tx.quote.count.mockResolvedValue(2);

    await expect(deleteCustomer("cust-1")).rejects.toThrow("This customer has quotes and cannot be deleted.");
    expect(tx.customer.delete).not.toHaveBeenCalled();
  });

  it("rejects deletion when customer has payments", async () => {
    const tx = mockDeleteTx();
    tx.payment.count.mockResolvedValue(1);

    await expect(deleteCustomer("cust-1")).rejects.toThrow("This customer has financial activity and cannot be deleted.");
    expect(tx.customer.delete).not.toHaveBeenCalled();
  });

  it("rejects deletion when customer has payment requests", async () => {
    const tx = mockDeleteTx();
    tx.paymentRequest.count.mockResolvedValue(1);

    await expect(deleteCustomer("cust-1")).rejects.toThrow("This customer has payment requests and cannot be deleted.");
    expect(tx.customer.delete).not.toHaveBeenCalled();
  });

  it("rejects deletion when customer has ledger entries", async () => {
    const tx = mockDeleteTx();
    tx.ledgerEntry.count.mockResolvedValue(1);

    await expect(deleteCustomer("cust-1")).rejects.toThrow("This customer has ledger entries and cannot be deleted.");
    expect(tx.customer.delete).not.toHaveBeenCalled();
  });
});

describe("deleteCustomerFromForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireOperationalRole as ReturnType<typeof vi.fn>).mockResolvedValue({ profile: { id: "admin-1" } });
  });

  it("authorizes, deletes customer, revalidates paths and redirects to /admin/customers?deleted=1", async () => {
    const tx = {
      customer: {
        findUnique: vi.fn().mockResolvedValue({ id: "cust-1", name: "Cliente Prueba" }),
        delete: vi.fn().mockResolvedValue({ id: "cust-1" }),
      },
      quote: { count: vi.fn().mockResolvedValue(0) },
      payment: { count: vi.fn().mockResolvedValue(0) },
      paymentRequest: { count: vi.fn().mockResolvedValue(0) },
      ledgerEntry: { count: vi.fn().mockResolvedValue(0) },
      vehicle: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
      customerFiscalProfile: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    };
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback: (t: typeof tx) => Promise<unknown>) => callback(tx));

    const formData = new FormData();
    formData.set("customerId", "cust-1");

    await deleteCustomerFromForm(formData);

    expect(requireOperationalRole).toHaveBeenCalledTimes(1);
    expect(tx.customer.delete).toHaveBeenCalledWith({ where: { id: "cust-1" } });
    expect(redirect).toHaveBeenCalledWith("/admin/customers?deleted=1");
  });

  it("redirects with cannot-delete error when deletion is rejected due to activity", async () => {
    const tx = {
      customer: {
        findUnique: vi.fn().mockResolvedValue({ id: "cust-1", name: "Cliente Prueba" }),
        delete: vi.fn(),
      },
      quote: { count: vi.fn().mockResolvedValue(1) },
      payment: { count: vi.fn().mockResolvedValue(0) },
      paymentRequest: { count: vi.fn().mockResolvedValue(0) },
      ledgerEntry: { count: vi.fn().mockResolvedValue(0) },
      vehicle: { deleteMany: vi.fn() },
      customerFiscalProfile: { deleteMany: vi.fn() },
    };
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback: (t: typeof tx) => Promise<unknown>) => callback(tx));

    const formData = new FormData();
    formData.set("customerId", "cust-1");

    await deleteCustomerFromForm(formData);

    expect(redirect).toHaveBeenCalledWith("/admin/customers/cust-1/edit?error=cannot-delete");
  });
});

