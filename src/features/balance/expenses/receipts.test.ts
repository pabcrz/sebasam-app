import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({ upload: vi.fn(), createBucket: vi.fn(), createSignedUrl: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => ({ storage: { from: () => ({ upload: storage.upload, createSignedUrl: storage.createSignedUrl }), createBucket: storage.createBucket } }) }));

import { MAX_RECEIPT_BYTES, ReceiptError, receiptUrl, storeReceipt } from "./receipts";

describe("storeReceipt", () => {
  beforeEach(() => { vi.clearAllMocks(); storage.upload.mockResolvedValue({ error: null }); });

  it("stores an image or PDF under a generated name and returns it", async () => {
    const path = await storeReceipt(new Uint8Array([1]), "image/jpeg");
    expect(path).toMatch(/^[0-9a-f-]{36}\.jpg$/);
    expect(storage.upload).toHaveBeenCalledWith(path, expect.any(Uint8Array), { contentType: "image/jpeg" });
    expect(await storeReceipt(new Uint8Array([1]), "application/pdf")).toMatch(/\.pdf$/);
  });

  it("refuses other formats, empty files and files over the limit without touching Storage", async () => {
    await expect(storeReceipt(new Uint8Array([1]), "text/html")).rejects.toBeInstanceOf(ReceiptError);
    await expect(storeReceipt(new Uint8Array(0), "image/png")).rejects.toBeInstanceOf(ReceiptError);
    await expect(storeReceipt(new Uint8Array(MAX_RECEIPT_BYTES + 1), "image/png")).rejects.toBeInstanceOf(ReceiptError);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("creates the private bucket the first time and retries", async () => {
    storage.upload.mockResolvedValueOnce({ error: { message: "Bucket not found" } });
    storage.createBucket.mockResolvedValue({ error: null });
    await storeReceipt(new Uint8Array([1]), "image/png");
    expect(storage.createBucket).toHaveBeenCalledWith("expense-receipts", expect.objectContaining({ public: false }));
    expect(storage.upload).toHaveBeenCalledTimes(2);
  });

  it("reports a failed upload without leaking the provider's message", async () => {
    storage.upload.mockResolvedValue({ error: { message: "secret provider detail" } });
    await expect(storeReceipt(new Uint8Array([1]), "image/png")).rejects.toThrow("No se pudo guardar el comprobante.");
  });
});

describe("receiptUrl", () => {
  it("signs a link of one minute, or returns null", async () => {
    storage.createSignedUrl.mockResolvedValueOnce({ data: { signedUrl: "https://signed" }, error: null });
    expect(await receiptUrl("a.jpg")).toBe("https://signed");
    expect(storage.createSignedUrl).toHaveBeenCalledWith("a.jpg", 60);
    storage.createSignedUrl.mockResolvedValueOnce({ data: null, error: { message: "x" } });
    expect(await receiptUrl("a.jpg")).toBeNull();
  });
});
