import { afterEach, describe, expect, it, vi } from "vitest";
import { createGeminiProvider, EMBEDDING_DIMENSIONS, ProviderError } from "./provider";

function embedResponse(values: number[]) {
  return { ok: true, json: async () => ({ embedding: { values } }) };
}

function generateResponse(text: string) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text }] } }],
    }),
  };
}

const fetchMock = vi.fn();

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("gemini provider", () => {
  it("throws without an API key", () => {
    expect(() => createGeminiProvider({})).toThrow(ProviderError);
  });

  it("embeds text and validates the 1536 dimension strictly", async () => {
    const values = new Array(EMBEDDING_DIMENSIONS).fill(0.5);
    fetchMock.mockResolvedValue(embedResponse(values));
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGeminiProvider({ GEMINI_API_KEY: "test-key" });
    const result = await provider.embedText("Cambiar bujes");
    expect(result).toHaveLength(EMBEDDING_DIMENSIONS);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("gemini-embedding-2:embedContent");
    expect(String(url)).toContain("https://generativelanguage.googleapis.com/v1beta");
    expect((init as RequestInit).headers).toMatchObject({ "x-goog-api-key": "test-key" });
  });

  it("rejects embeddings with the wrong dimension", async () => {
    fetchMock.mockResolvedValue(embedResponse(new Array(EMBEDDING_DIMENSIONS - 1).fill(0.1)));
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGeminiProvider({ GEMINI_API_KEY: "test-key" });
    await expect(provider.embedText("x")).rejects.toThrow(/Dimensión de embedding/);
  });

  it("rejects responses without embedding values", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGeminiProvider({ GEMINI_API_KEY: "test-key" });
    await expect(provider.embedText("x")).rejects.toThrow(ProviderError);
  });

  it("rejects non-finite embedding values", async () => {
    const values = new Array(EMBEDDING_DIMENSIONS).fill(0.5);
    values[3] = Number.NaN;
    fetchMock.mockResolvedValue(embedResponse(values));
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGeminiProvider({ GEMINI_API_KEY: "test-key" });
    await expect(provider.embedText("x")).rejects.toThrow(/números finitos/);
  });

  it("throws on non-OK embedding responses", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429 });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGeminiProvider({ GEMINI_API_KEY: "test-key" });
    await expect(provider.embedText("x")).rejects.toThrow(/HTTP 429/);
  });

  it("generates text with the system instruction and the configured answer model", async () => {
    fetchMock.mockResolvedValue(generateResponse("hola"));
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGeminiProvider({
      GEMINI_API_KEY: "test-key",
      GEMINI_BASE_URL: "https://example.test/v1beta/",
      GEMINI_ANSWER_MODEL: "custom-answer",
    });
    const result = await provider.generateText({ system: "sys", user: "user" });
    expect(result).toBe("hola");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://example.test/v1beta/models/custom-answer:generateContent");
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.systemInstruction.parts[0].text).toBe("sys");
    expect(body.contents[0].parts[0].text).toBe("user");
  });

  it("throws when the answer response has no text", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ candidates: [] }) });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGeminiProvider({ GEMINI_API_KEY: "test-key" });
    await expect(provider.generateText({ system: "s", user: "u" })).rejects.toThrow(ProviderError);
  });
});