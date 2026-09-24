import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CustomerStatus, Prisma, QuoteItemType, QuoteStatus } from "@prisma/client";

const getSharedQuoteByTokenMock = vi.hoisted(() => vi.fn());
const getSharedQuotePaymentStatusMock = vi.hoisted(() => vi.fn());
const sharedQuoteViewMock = vi.hoisted(() => vi.fn(() => <div data-testid="shared-quote-view" />));

vi.mock("@/features/quotes/domain", () => ({
  getSharedQuoteByToken: getSharedQuoteByTokenMock,
  getSharedQuotePaymentStatus: getSharedQuotePaymentStatusMock,
  SharedQuoteExpiredError: class SharedQuoteExpiredError extends Error {},
  SharedQuoteRevokedError: class SharedQuoteRevokedError extends Error {},
}));

vi.mock("@/features/public-quotes/components/shared-quote-view", () => ({
  SharedQuoteView: sharedQuoteViewMock,
}));

vi.mock("@/features/payment-settings/domain", () => ({
  getPaymentSettings: vi.fn().mockResolvedValue({
    bankAccounts: [],
    name: "SEBASAM",
    fullName: "Servicio y Refacciones para Suspensiones de Aire y Muelles",
    address: "Batalla de Casa Blanca",
    mapsUrl: "not a URL",
    contactPhone: "5556007675",
    contactWhatsapp: "5536239346",
  }),
}));

import CotizacionPage, { generateMetadata } from "./page";
import { SharedQuoteExpiredError, SharedQuoteRevokedError } from "@/features/quotes/domain";

describe("CotizacionPage", () => {
  it("serializes Decimal quote item quantities before rendering the client view", async () => {
    getSharedQuoteByTokenMock.mockResolvedValue({
      quote: {
        id: "quote-1",
        number: "COT-001",
        status: QuoteStatus.SENT,
        title: "Servicio general",
        description: "Servicio completo",
        administrative: false,
        subtotalCents: 100_00,
        taxCents: 16_00,
        totalCents: 116_00,
        taxEnabled: true,
        approvedAt: null,
        validUntil: new Date("2026-07-15T12:00:00.000Z"),
        customerId: "customer-1",
        vehicleId: null,
        vehicleSnapshot: null,
        operationalDate: new Date("2026-06-15T00:00:00.000Z"),
        createdAt: new Date("2026-07-01T12:00:00.000Z"),
        updatedAt: new Date("2026-07-01T12:00:00.000Z"),
        customer: {
          id: "customer-1",
          name: "Cliente Demo",
          email: null,
          phone: null,
          address: null,
          notes: null,
          status: CustomerStatus.ACTIVE,
          createdAt: new Date("2026-07-01T12:00:00.000Z"),
          updatedAt: new Date("2026-07-01T12:00:00.000Z"),
        },
        vehicle: null,
        items: [
          {
            id: "item-1",
            quoteId: "quote-1",
            type: QuoteItemType.LABOR,
            description: "Mano de obra",
            quantity: new Prisma.Decimal("1.5"),
            unitPriceCents: 100_00,
            totalCents: 150_00,
            sortOrder: 0,
          },
        ],
      },
    });

    render(await CotizacionPage({ params: Promise.resolve({ token: "token-123" }) }));

    expect(screen.getByTestId("shared-quote-view")).toBeInTheDocument();
    expect(getSharedQuoteByTokenMock).toHaveBeenCalledWith("token-123");
    expect(sharedQuoteViewMock).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "token-123",
        quote: expect.objectContaining({
          operationalDate: new Date("2026-06-15T00:00:00.000Z"),
          items: [expect.objectContaining({ quantity: "1.5" })],
        }),
      }),
      undefined,
    );
    expect(screen.getByAltText("Logo de SEBASAM")).toHaveAttribute("src", expect.stringContaining("logo-white-short.png"));
    expect(screen.getByText("Servicio y Refacciones para Suspensiones de Aire y Muelles")).toHaveClass("font-mono", "print:text-[10px]");
    expect(screen.getByText("Batalla de Casa Blanca")).not.toHaveAttribute("href");
    expect(screen.queryByRole("link", { name: /Batalla de Casa Blanca/i })).not.toBeInTheDocument();
  });

  it("keeps private customer fields out of the public client DTO and loads completed Note payment status", async () => {
    getSharedQuoteByTokenMock.mockResolvedValue({
      quote: {
        id: "quote-private", number: "N-001", folio: "N-001", status: QuoteStatus.ARCHIVED,
        title: "Public service", description: null, vehicleSnapshot: null, subtotalCents: 100,
        discountCents: 0, taxCents: 0, totalCents: 100, taxEnabled: false,
        validUntil: new Date("2026-07-15T12:00:00.000Z"), administrative: false,
        operationalDate: new Date("2026-06-15T00:00:00.000Z"), isLocked: true, paymentDueDate: null,
        customer: { name: "Public customer", email: "private@example.com", address: "Private address" },
        customerContact: { name: "Private contact", phone: "5551111111" },
        customerFiscalProfile: { taxId: "PRIVATE-TAX-ID" }, vehicle: null, items: [], sections: [],
        workOrder: { id: "wo-1", status: "COMPLETED", folio: "N-001" },
      },
    });
    getSharedQuotePaymentStatusMock.mockResolvedValue({ paidCents: 0, remainingCents: 100, isSettled: false });

    render(await CotizacionPage({ params: Promise.resolve({ token: "private-token" }) }));

    const clientQuote = (sharedQuoteViewMock.mock.calls.at(-1) as unknown as [{ quote: Record<string, unknown> }])[0].quote;
    expect(clientQuote.customer).toEqual({ name: "Public customer" });
    expect(JSON.stringify(clientQuote)).not.toContain("private@example.com");
    expect(JSON.stringify(clientQuote)).not.toContain("PRIVATE-TAX-ID");
    expect(getSharedQuotePaymentStatusMock).toHaveBeenCalledWith("wo-1");
  });

  describe("generateMetadata", () => {
    it("generates dynamic filename title and OpenGraph metadata when token is valid", async () => {
      getSharedQuoteByTokenMock.mockResolvedValue({
        quote: {
          id: "quote-1",
          number: "COT-001",
          customer: { name: "Cristian Del Toro" },
          vehicle: { brand: "freightliner", model: null, plate: null },
          vehicleSnapshot: null,
          operationalDate: new Date("2026-06-18T00:00:00.000Z"),
          workOrder: null,
        },
      });

      const metadata = await generateMetadata({ params: Promise.resolve({ token: "valid-token" }) });

      expect(metadata).toEqual({
        title: { absolute: "CristianDelToro-freightliner-COT-001" },
        description: "Cotización para Cristian Del Toro - freightliner - Sin placas",
        openGraph: {
          title: "Cristian Del Toro · freightliner - Sin placas · Cotización COT-001 | SEBASAM",
          description: "Cotización para Cristian Del Toro - freightliner - Sin placas",
          type: "website",
        },
        twitter: {
          card: "summary_large_image",
          title: "Cristian Del Toro · freightliner - Sin placas · Cotización COT-001 | SEBASAM",
          description: "Cotización para Cristian Del Toro - freightliner - Sin placas",
        },
      });
    });

    it("generates dynamic filename title using C folio when available", async () => {
      getSharedQuoteByTokenMock.mockResolvedValue({
        quote: {
          id: "quote-1",
          number: "COT-001",
          folio: "C-180626-01",
          customer: { name: "Cristian Del Toro" },
          vehicle: { brand: "freightliner", model: null, plate: null },
          vehicleSnapshot: null,
          operationalDate: new Date("2026-06-18T00:00:00.000Z"),
          workOrder: null,
        },
      });

      const metadata = await generateMetadata({ params: Promise.resolve({ token: "valid-token" }) });

      expect(metadata).toEqual({
        title: { absolute: "CristianDelToro-freightliner-C-180626-01" },
        description: "Cotización para Cristian Del Toro - freightliner - Sin placas",
        openGraph: {
          title: "Cristian Del Toro · freightliner - Sin placas · Cotización C-180626-01 | SEBASAM",
          description: "Cotización para Cristian Del Toro - freightliner - Sin placas",
          type: "website",
        },
        twitter: {
          card: "summary_large_image",
          title: "Cristian Del Toro · freightliner - Sin placas · Cotización C-180626-01 | SEBASAM",
          description: "Cotización para Cristian Del Toro - freightliner - Sin placas",
        },
      });
    });

    it("presents assigned work as a Nota while retaining the quote folio without emitting Nota in filename", async () => {
      getSharedQuoteByTokenMock.mockResolvedValue({
        quote: {
          id: "quote-1",
          number: "COT-001",
          folio: "C-180626-01",
          customer: { name: "Cristian Del Toro" },
          vehicle: { brand: "freightliner", model: null, plate: null },
          vehicleSnapshot: null,
          operationalDate: new Date("2026-06-18T00:00:00.000Z"),
          workOrder: { status: "ASSIGNED", folio: null },
        },
      });

      const metadata = await generateMetadata({ params: Promise.resolve({ token: "valid-token" }) });

      expect(metadata).toEqual({
        title: { absolute: "CristianDelToro-freightliner-C-180626-01" },
        description: "Nota para Cristian Del Toro - freightliner - Sin placas",
        openGraph: {
          title: "Cristian Del Toro · freightliner - Sin placas · Nota C-180626-01 | SEBASAM",
          description: "Nota para Cristian Del Toro - freightliner - Sin placas",
          type: "website",
        },
        twitter: {
          card: "summary_large_image",
          title: "Cristian Del Toro · freightliner - Sin placas · Nota C-180626-01 | SEBASAM",
          description: "Nota para Cristian Del Toro - freightliner - Sin placas",
        },
      });
    });

    it("formats filename without customer and without SinCliente when customer is absent", async () => {
      getSharedQuoteByTokenMock.mockResolvedValue({
        quote: {
          id: "quote-anon",
          number: "COT-002",
          folio: "C-180626-02",
          customer: null,
          customerSnapshot: null,
          vehicle: { economicNumber: "Eco 8" },
          vehicleSnapshot: null,
          operationalDate: new Date("2026-06-18T00:00:00.000Z"),
          workOrder: null,
        },
      });

      const metadata = await generateMetadata({ params: Promise.resolve({ token: "anon-token" }) });

      expect(metadata.title).toEqual({ absolute: "Eco8-C-180626-02" });
      expect((metadata.title as { absolute: string }).absolute).not.toContain("SinCliente");
      expect((metadata.title as { absolute: string }).absolute).not.toContain("Sincliente");
    });

    it("returns safe fallback metadata when token is expired", async () => {
      getSharedQuoteByTokenMock.mockRejectedValue(new SharedQuoteExpiredError());

      const metadata = await generateMetadata({ params: Promise.resolve({ token: "expired-token" }) });

      expect(metadata).toEqual({
        title: { absolute: "Cotización" },
        description: "Portal de clientes SEBASAM para gestión de servicios y cotizaciones.",
        openGraph: {
          title: "Cotización | SEBASAM",
          description: "Portal de clientes SEBASAM para gestión de servicios y cotizaciones.",
          type: "website",
        },
        twitter: {
          card: "summary_large_image",
          title: "Cotización | SEBASAM",
          description: "Portal de clientes SEBASAM para gestión de servicios y cotizaciones.",
        },
      });
    });

    it("returns safe fallback metadata when token is revoked", async () => {
      getSharedQuoteByTokenMock.mockRejectedValue(new SharedQuoteRevokedError());

      const metadata = await generateMetadata({ params: Promise.resolve({ token: "revoked-token" }) });

      expect(metadata).toEqual({
        title: { absolute: "Cotización" },
        description: "Portal de clientes SEBASAM para gestión de servicios y cotizaciones.",
        openGraph: {
          title: "Cotización | SEBASAM",
          description: "Portal de clientes SEBASAM para gestión de servicios y cotizaciones.",
          type: "website",
        },
        twitter: {
          card: "summary_large_image",
          title: "Cotización | SEBASAM",
          description: "Portal de clientes SEBASAM para gestión de servicios y cotizaciones.",
        },
      });
    });

    it("returns safe fallback metadata when token is not found or invalid", async () => {
      getSharedQuoteByTokenMock.mockRejectedValue(new Error("Not found"));

      const metadata = await generateMetadata({ params: Promise.resolve({ token: "invalid-token" }) });

      expect(metadata).toEqual({
        title: { absolute: "Cotización" },
        description: "Portal de clientes SEBASAM para gestión de servicios y cotizaciones.",
        openGraph: {
          title: "Cotización | SEBASAM",
          description: "Portal de clientes SEBASAM para gestión de servicios y cotizaciones.",
          type: "website",
        },
        twitter: {
          card: "summary_large_image",
          title: "Cotización | SEBASAM",
          description: "Portal de clientes SEBASAM para gestión de servicios y cotizaciones.",
        },
      });
    });
  });
});
