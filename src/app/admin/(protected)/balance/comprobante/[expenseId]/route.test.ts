import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireProfile: vi.fn(), findFirst: vi.fn(), receiptUrl: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireProfile: mocks.requireProfile, isAdminRole: (role: string) => ["SUPER_ADMIN", "ADMIN"].includes(role) }));
vi.mock("@/lib/prisma", () => ({ prisma: { expense: { findFirst: mocks.findFirst } } }));
vi.mock("@/features/balance/expenses/receipts", () => ({ receiptUrl: mocks.receiptUrl }));

import { GET } from "./route";

const open = () => GET(new Request("http://x"), { params: Promise.resolve({ expenseId: "e1" }) });
const as = (role: string) => mocks.requireProfile.mockResolvedValue({ profile: { role } });

describe("GET /admin/balance/comprobante/[expenseId]", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.receiptUrl.mockResolvedValue("https://signed.example/r"); });

  it("sends the owner and the patron to a short-lived link", async () => {
    mocks.findFirst.mockResolvedValue({ receiptPath: "abc.jpg" });
    for (const role of ["SUPER_ADMIN", "ADMIN"]) {
      as(role);
      const response = await open();
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("https://signed.example/r");
    }
    expect(mocks.receiptUrl).toHaveBeenCalledWith("abc.jpg");
  });

  it("refuses the assistant and anyone not signed in, without looking the expense up", async () => {
    as("ADMIN_ASSISTANT");
    expect((await open()).status).toBe(403);
    mocks.requireProfile.mockRejectedValue(new Error("no session"));
    expect((await open()).status).toBe(403);
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("answers 404 when the expense has no receipt", async () => {
    as("ADMIN");
    mocks.findFirst.mockResolvedValue({ receiptPath: null });
    expect((await open()).status).toBe(404);
  });
});
