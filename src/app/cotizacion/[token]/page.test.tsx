import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CustomerStatus, Prisma, QuoteItemType, QuoteStatus } from "@prisma/client";

const getSharedQuoteByTokenMock = vi.hoisted(() => vi.fn());
const sharedQuoteViewMock = vi.hoisted(() => vi.fn(() => <div data-testid="shared-quote-view" />));

vi.mock("@/features/quotes/domain", () => ({
  getSharedQuoteByToken: getSharedQuoteByTokenMock,
  SharedQuoteExpiredError: class SharedQuoteExpiredError extends Error {},
  SharedQuoteRevokedError: class SharedQuoteRevokedError extends Error {},
}));

vi.mock("@/features/public-quotes/components/shared-quote-view", () => ({
  SharedQuoteView: sharedQuoteViewMock,
}));

import CotizacionPage from "./page";

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
        createdAt: new Date("2026-07-01T12:00:00.000Z"),
        updatedAt: new Date("2026-07-01T12:00:00.000Z"),
        submissionKey: "private-key",
        submissionHash: "private-hash",
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
            type: QuoteItemType.SERVICE,
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
          items: [expect.objectContaining({ quantity: "1.5" })],
        }),
      }),
      undefined,
    );
    expect(sharedQuoteViewMock).toHaveBeenCalledWith(
      expect.objectContaining({
        quote: expect.not.objectContaining({ submissionKey: expect.anything(), submissionHash: expect.anything() }),
      }),
      undefined,
    );
  });
});
