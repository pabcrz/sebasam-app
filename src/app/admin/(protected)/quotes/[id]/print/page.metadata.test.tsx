import { describe, expect, it, vi } from "vitest";

const getQuoteByIdMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/quotes/queries", () => ({ getQuoteById: getQuoteByIdMock }));
vi.mock("@/features/payment-settings/domain", () => ({ getPaymentSettings: vi.fn() }));
vi.mock("@/features/public-quotes/components/public-quote-shell", () => ({ PublicQuoteShell: () => null }));
vi.mock("@/features/public-quotes/components/shared-quote-view", () => ({ SharedQuoteView: () => null }));
vi.mock("./print-controls", () => ({ PrintControls: () => null }));
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));

import { generateMetadata } from "./page";

describe("QuotePrintPage generateMetadata", () => {
  it("generates dynamic title based on customer, vehicle, and operational date", async () => {
    getQuoteByIdMock.mockResolvedValue({
      id: "quote-1",
      number: "C-001",
      customer: { name: "Cristian Del Toro" },
      vehicle: { brand: "freightliner", model: null, plate: null },
      vehicleSnapshot: null,
      operationalDate: new Date("2026-06-18T00:00:00.000Z"),
      workOrder: null,
    });

    const metadata = await generateMetadata({ params: Promise.resolve({ id: "quote-1" }) });

    expect(metadata).toEqual({
      title: "CristianDelToro-freightliner-18062026",
    });
  });

  it("prioritizes vehicle plate when available and handles completed work order", async () => {
    getQuoteByIdMock.mockResolvedValue({
      id: "quote-2",
      number: "C-002",
      customer: { name: "José Pérez" },
      vehicle: { brand: "Freightliner", model: "Cascadia", plate: "ABC1234" },
      vehicleSnapshot: null,
      operationalDate: new Date("2026-08-14T00:00:00.000Z"),
      workOrder: { status: "COMPLETED" },
    });

    const metadata = await generateMetadata({ params: Promise.resolve({ id: "quote-2" }) });

    expect(metadata).toEqual({
      title: "JosePerez-ABC1234-14082026",
    });
  });

  it("returns fallback title 'Cotización' when quote is not found", async () => {
    getQuoteByIdMock.mockResolvedValue(null);

    const metadata = await generateMetadata({ params: Promise.resolve({ id: "quote-unknown" }) });

    expect(metadata).toEqual({
      title: "Cotización",
    });
  });
});
