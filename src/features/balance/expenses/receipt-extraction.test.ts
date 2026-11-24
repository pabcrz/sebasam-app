import { afterEach, describe, expect, it, vi } from "vitest";
import { extractReceipt } from "./receipt-extraction";

const env = { GEMINI_API_KEY: "k" };
const answer = (value: unknown) => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: typeof value === "string" ? value : JSON.stringify(value) }] } }] }) });

describe("extractReceipt", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads the receipt fields from the model's JSON, sending the image inline", async () => {
    const fetchMock = vi.fn().mockResolvedValue(answer({ spentAt: "2026-11-20", amount: 850.5, supplier: "Gasolinera", category: "FUEL_TRANSPORT", invoiced: false }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await extractReceipt(new Uint8Array([1, 2, 3]), "image/jpeg", env)).toEqual({ spentAt: "2026-11-20", amount: 850.5, supplier: "Gasolinera", category: "FUEL_TRANSPORT", invoiced: false });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.contents[0].parts[1].inlineData).toEqual({ mimeType: "image/jpeg", data: "AQID" });
  });

  it("turns a field it cannot trust into null instead of failing the whole reading", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(answer({ spentAt: "ayer", amount: -5, supplier: "Casa", category: "VACACIONES", invoiced: "tal vez" })));
    expect(await extractReceipt(new Uint8Array([1]), "image/png", env)).toEqual({ spentAt: null, amount: null, supplier: "Casa", category: null, invoiced: null });
  });

  it("returns null, never throws, with no key, a failed request or an answer that is not JSON", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await extractReceipt(new Uint8Array([1]), "image/png", {})).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    expect(await extractReceipt(new Uint8Array([1]), "image/png", env)).toBeNull();
    fetchMock.mockResolvedValueOnce(answer("no sé"));
    expect(await extractReceipt(new Uint8Array([1]), "image/png", env)).toBeNull();
    fetchMock.mockRejectedValueOnce(new Error("network"));
    expect(await extractReceipt(new Uint8Array([1]), "image/png", env)).toBeNull();
  });
});
