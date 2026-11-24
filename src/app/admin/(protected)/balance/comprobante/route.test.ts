// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireExpenseRole: vi.fn(), storeReceipt: vi.fn(), extractReceipt: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireExpenseRole: mocks.requireExpenseRole }));
vi.mock("@/features/balance/expenses/receipts", () => ({ ReceiptError: class ReceiptError extends Error {}, storeReceipt: mocks.storeReceipt }));
vi.mock("@/features/balance/expenses/receipt-extraction", () => ({ extractReceipt: mocks.extractReceipt }));

import { ReceiptError } from "@/features/balance/expenses/receipts";
import { POST } from "./route";

function upload(file?: File) {
  const body = new FormData();
  if (file) body.set("file", file);
  return POST(new Request("http://x/admin/balance/comprobante", { method: "POST", body }));
}

describe("POST /admin/balance/comprobante", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.requireExpenseRole.mockResolvedValue({}); });

  it("stores the file, reads it and returns both", async () => {
    mocks.storeReceipt.mockResolvedValue("abc.jpg");
    mocks.extractReceipt.mockResolvedValue({ amount: 10 });
    const response = await upload(new File(["x"], "foto.jpg", { type: "image/jpeg" }));

    expect(await response.json()).toEqual({ receiptPath: "abc.jpg", extracted: { amount: 10 } });
    expect(mocks.storeReceipt).toHaveBeenCalledWith(expect.any(Uint8Array), "image/jpeg");
  });

  it("keeps the receipt even when it could not be read", async () => {
    mocks.storeReceipt.mockResolvedValue("abc.jpg");
    mocks.extractReceipt.mockResolvedValue(null);
    expect(await (await upload(new File(["x"], "f.jpg", { type: "image/jpeg" }))).json()).toEqual({ receiptPath: "abc.jpg", extracted: null });
  });

  it("answers 403 without storing anything for a user who cannot register expenses", async () => {
    mocks.requireExpenseRole.mockRejectedValue(new Error("forbidden"));
    expect((await upload(new File(["x"], "f.jpg", { type: "image/jpeg" }))).status).toBe(403);
    expect(mocks.storeReceipt).not.toHaveBeenCalled();
  });

  it("answers 400 for a missing file or a refused one", async () => {
    expect((await upload()).status).toBe(400);
    mocks.storeReceipt.mockRejectedValue(new ReceiptError("Formato no admitido."));
    const response = await upload(new File(["x"], "f.exe", { type: "application/x-msdownload" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Formato no admitido.");
  });
});
