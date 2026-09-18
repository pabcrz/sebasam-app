import { describe, expect, it, vi } from "vitest";

const getSharedQuoteStatusByTokenMock = vi.hoisted(() => vi.fn());
const SharedQuoteExpiredErrorMock = vi.hoisted(() => class SharedQuoteExpiredError extends Error {});
const SharedQuoteNotFoundErrorMock = vi.hoisted(() => class SharedQuoteNotFoundError extends Error {});
const SharedQuoteRevokedErrorMock = vi.hoisted(() => class SharedQuoteRevokedError extends Error {});

vi.mock("@/features/quotes/domain", () => ({
  getSharedQuoteStatusByToken: getSharedQuoteStatusByTokenMock,
  SharedQuoteExpiredError: SharedQuoteExpiredErrorMock,
  SharedQuoteNotFoundError: SharedQuoteNotFoundErrorMock,
  SharedQuoteRevokedError: SharedQuoteRevokedErrorMock,
}));

import { GET } from "./route";
import { SharedQuoteRevokedError } from "@/features/quotes/domain";

describe("GET /api/cotizacion/[token]/status", () => {
  it("returns only the public status payload and disables caching", async () => {
    getSharedQuoteStatusByTokenMock.mockResolvedValue({
      revision: "quote-1:SENT:123:active:PLANNED:active:456",
      quoteStatus: "SENT",
      workOrderStatus: "PLANNED",
    });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ token: "public-token" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      available: true,
      revision: "quote-1:SENT:123:active:PLANNED:active:456",
      quoteStatus: "SENT",
      workOrderStatus: "PLANNED",
    });
    expect(getSharedQuoteStatusByTokenMock).toHaveBeenCalledWith("public-token");
  });

  it("reports revoked links as unavailable without exposing quote data", async () => {
    getSharedQuoteStatusByTokenMock.mockRejectedValue(new SharedQuoteRevokedError());

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ token: "public-token" }),
    });

    expect(response.status).toBe(410);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ available: false });
  });
});
