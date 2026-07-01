import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteStatus } from "@prisma/client";
import { SharedQuoteView, type SharedQuoteViewProps } from "./shared-quote-view";
import { acceptSharedQuoteAction, declineSharedQuoteAction } from "@/features/quotes/actions";

vi.mock("@/features/quotes/actions", () => ({
  acceptSharedQuoteAction: vi.fn(),
  declineSharedQuoteAction: vi.fn(),
}));

vi.mock("@/features/quotes/components/quote-preview-card", () => ({
  QuotePreviewCard: () => <div data-testid="quote-preview">Vista previa</div>,
}));

const acceptSharedQuoteActionMock = vi.mocked(acceptSharedQuoteAction);
const declineSharedQuoteActionMock = vi.mocked(declineSharedQuoteAction);

function makeQuote(status: QuoteStatus = QuoteStatus.SENT): SharedQuoteViewProps["quote"] {
  return {
    id: "quote-1",
    number: "COT-001",
    status,
    title: "Servicio general",
    description: "Servicio completo",
    administrative: "",
    subtotalCents: 100_00,
    taxCents: 16_00,
    totalCents: 116_00,
    taxEnabled: true,
    validUntil: new Date("2026-07-15T12:00:00.000Z"),
    customerId: "customer-1",
    vehicleId: null,
    vehicleSnapshot: null,
    createdAt: new Date("2026-07-01T12:00:00.000Z"),
    updatedAt: new Date("2026-07-01T12:00:00.000Z"),
    customer: {
      id: "customer-1",
      name: "Cliente Demo",
      email: null,
      phone: null,
      address: null,
      notes: null,
      createdAt: new Date("2026-07-01T12:00:00.000Z"),
      updatedAt: new Date("2026-07-01T12:00:00.000Z"),
    },
    vehicle: null,
    items: [
      {
        id: "item-1",
        quoteId: "quote-1",
        type: "SERVICE",
        description: "Mano de obra",
        quantity: 1,
        unitPriceCents: 100_00,
        totalCents: 100_00,
        sortOrder: 0,
        createdAt: new Date("2026-07-01T12:00:00.000Z"),
        updatedAt: new Date("2026-07-01T12:00:00.000Z"),
      },
    ],
  } as unknown as SharedQuoteViewProps["quote"];
}

describe("SharedQuoteView", () => {
  beforeEach(() => {
    acceptSharedQuoteActionMock.mockReset();
    declineSharedQuoteActionMock.mockReset();
  });

  it("renders whole-quote decision controls for sent shared quotes", () => {
    render(<SharedQuoteView quote={makeQuote()} token="token-123" />);

    expect(screen.getByRole("button", { name: "Aceptar cotización" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Declinar cotización" })).toBeInTheDocument();
    expect(screen.queryByText(/partida/i)).not.toBeInTheDocument();
  });

  it("accepts the full quote and shows the success state", async () => {
    const user = userEvent.setup();
    acceptSharedQuoteActionMock.mockResolvedValue({ success: true });

    render(<SharedQuoteView quote={makeQuote()} token="token-123" />);

    await user.click(screen.getByRole("button", { name: "Aceptar cotización" }));

    expect(acceptSharedQuoteActionMock).toHaveBeenCalledWith("token-123");
    expect(await screen.findByText("Cotización aceptada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aceptar cotización" })).not.toBeInTheDocument();
  });

  it("declines the full quote and shows the declined state", async () => {
    const user = userEvent.setup();
    declineSharedQuoteActionMock.mockResolvedValue({ success: true });

    render(<SharedQuoteView quote={makeQuote()} token="token-123" />);

    await user.click(screen.getByRole("button", { name: "Declinar cotización" }));

    expect(declineSharedQuoteActionMock).toHaveBeenCalledWith("token-123");
    expect(await screen.findByText("Cotización declinada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Declinar cotización" })).not.toBeInTheDocument();
  });

  it("shows an error when the public decision action fails", async () => {
    const user = userEvent.setup();
    acceptSharedQuoteActionMock.mockResolvedValue({ success: false, error: "La cotización ya expiró." });

    render(<SharedQuoteView quote={makeQuote()} token="token-123" />);

    await user.click(screen.getByRole("button", { name: "Aceptar cotización" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("La cotización ya expiró.");
  });
});
