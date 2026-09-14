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
  it("uses the quote folio and clean vehicle unit for a quote without work", async () => {
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
      title: { absolute: "CristianDelToro-freightliner-C-001" },
    });
  });

  it("prioritizes plate in filename for completed work without emitting Nota", async () => {
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
      title: { absolute: "JosePerez-ABC1234-C-002" },
    });
  });

  it("omits unit when vehicle is null without changing the print route", async () => {
    getQuoteByIdMock.mockResolvedValue({
      id: "quote-3",
      number: "C-003",
      folio: "C-140826-01",
      customer: { name: "José Pérez" },
      vehicle: null,
      vehicleSnapshot: null,
      operationalDate: new Date("2026-08-14T00:00:00.000Z"),
      workOrder: { status: "ASSIGNED", folio: null },
    });

    const metadata = await generateMetadata({ params: Promise.resolve({ id: "quote-3" }) });

    expect(metadata).toEqual({
      title: { absolute: "JosePerez-C-140826-01" },
    });
  });

  it("formats filename without customer and without SinCliente when customer is absent", async () => {
    getQuoteByIdMock.mockResolvedValue({
      id: "quote-4",
      number: "C-004",
      customer: null,
      customerSnapshot: null,
      vehicle: { economicNumber: "Eco 10" },
      vehicleSnapshot: null,
      operationalDate: new Date("2026-08-14T00:00:00.000Z"),
      workOrder: null,
    });

    const metadata = await generateMetadata({ params: Promise.resolve({ id: "quote-4" }) });

    expect(metadata).toEqual({
      title: { absolute: "Eco10-C-004" },
    });
    expect((metadata.title as { absolute: string }).absolute).not.toContain("SinCliente");
    expect((metadata.title as { absolute: string }).absolute).not.toContain("Sincliente");
  });

  it("returns fallback title 'Cotización' with absolute object when quote is not found", async () => {
    getQuoteByIdMock.mockResolvedValue(null);

    const metadata = await generateMetadata({ params: Promise.resolve({ id: "quote-unknown" }) });

    expect(metadata).toEqual({
      title: { absolute: "Cotización" },
    });
  });
});
