import { describe, expect, it, vi } from "vitest";

const getSharedQuoteByTokenMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/quotes/domain", () => ({
  getSharedQuoteByToken: getSharedQuoteByTokenMock,
}));

vi.mock("next/og", () => {
  class MockImageResponse {
    element: unknown;
    options: unknown;
    type: string;
    constructor(element: unknown, options?: unknown) {
      this.element = element;
      this.options = options;
      this.type = "image-response";
    }
  }
  return {
    ImageResponse: MockImageResponse,
  };
});

import OpengraphImage, { size, contentType } from "./opengraph-image";

describe("OpengraphImage for /cotizacion/[token]", () => {
  it("exports correct size and contentType", () => {
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(contentType).toBe("image/png");
  });

  it("renders quote details for valid token without badge or price", async () => {
    getSharedQuoteByTokenMock.mockResolvedValue({
      quote: {
        id: "quote-1",
        number: "C-0826-007",
        title: "Cambio de muelles",
        customer: { name: "Transportes San Juan" },
        vehicle: { brand: "Kenworth", model: "T680", plate: "99-AA-11" },
        vehicleSnapshot: null,
        operationalDate: new Date("2026-08-26T00:00:00.000Z"),
        workOrder: null,
      },
    });

    const response = (await OpengraphImage({
      params: Promise.resolve({ token: "valid-token" }),
    })) as unknown as { element: React.ReactElement; options: unknown; type: string };

    expect(response.type).toBe("image-response");
    expect(getSharedQuoteByTokenMock).toHaveBeenCalledWith("valid-token");
    expect(response.options).toEqual({ width: 1200, height: 630 });
  });

  it("renders fallback image when quote is not found or fails", async () => {
    getSharedQuoteByTokenMock.mockRejectedValue(new Error("Quote not found"));

    const response = (await OpengraphImage({
      params: Promise.resolve({ token: "invalid-token" }),
    })) as unknown as { element: React.ReactElement; options: unknown; type: string };

    expect(response.type).toBe("image-response");
    expect(response.options).toEqual({ width: 1200, height: 630 });
  });
});
