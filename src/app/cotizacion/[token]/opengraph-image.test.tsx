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

function collectText(node: unknown): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(collectText).join("");
  }
  if (node && typeof node === "object" && "props" in node) {
    return collectText((node as { props: { children?: unknown } }).props.children);
  }
  return "";
}

function collectImages(node: unknown): Array<{ src?: string; style?: Record<string, unknown> }> {
  if (Array.isArray(node)) return node.flatMap(collectImages);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as { type?: unknown; props: { src?: string; style?: Record<string, unknown>; children?: unknown } };
  return [
    ...(element.type === "img" ? [{ src: element.props.src, style: element.props.style }] : []),
    ...collectImages(element.props.children),
  ];
}

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
    expect(collectText(response.element)).toContain("Transportes San Juan");
    expect(collectText(response.element)).toContain("Kenworth T680");
    expect(collectText(response.element).indexOf("Transportes San Juan")).toBeLessThan(
      collectText(response.element).indexOf("C-0826-007"),
    );
    expect(collectImages(response.element)).toEqual([
      expect.objectContaining({ src: expect.stringContaining("data:image/png;base64,") }),
    ]);
  });

  it("renders assigned work as a service note", async () => {
    getSharedQuoteByTokenMock.mockResolvedValue({
      quote: {
        id: "quote-1",
        number: "C-0826-007",
        title: "Cambio de muelles",
        customer: { name: "Transportes San Juan" },
        vehicle: { brand: "Kenworth", model: "T680", plate: "99-AA-11" },
        vehicleSnapshot: null,
        operationalDate: new Date("2026-08-26T00:00:00.000Z"),
        workOrder: { status: "ASSIGNED", folio: null },
      },
    });

    const response = (await OpengraphImage({
      params: Promise.resolve({ token: "valid-token" }),
    })) as unknown as { element: unknown };

    expect(collectText(response.element)).toContain("NOTA DE SERVICIO");
  });

  it("renders fallback image when quote is not found or fails", async () => {
    getSharedQuoteByTokenMock.mockRejectedValue(new Error("Quote not found"));

    const response = (await OpengraphImage({
      params: Promise.resolve({ token: "invalid-token" }),
    })) as unknown as { element: React.ReactElement; options: unknown; type: string };

    expect(response.type).toBe("image-response");
    expect(response.options).toEqual({ width: 1200, height: 630 });
    expect(collectImages(response.element)).toEqual([
      expect.objectContaining({ src: expect.stringContaining("data:image/png;base64,") }),
    ]);
  });
});
