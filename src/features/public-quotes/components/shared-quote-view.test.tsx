import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteItemType, QuoteStatus } from "@prisma/client";
import { SharedQuoteView, type SharedQuoteViewProps } from "./shared-quote-view";
import { acceptSharedQuoteAction, declineSharedQuoteAction } from "@/features/quotes/actions";

vi.mock("@/features/quotes/actions", () => ({
  acceptSharedQuoteAction: vi.fn(),
  declineSharedQuoteAction: vi.fn(),
}));

const acceptSharedQuoteActionMock = vi.mocked(acceptSharedQuoteAction);
const declineSharedQuoteActionMock = vi.mocked(declineSharedQuoteAction);

function makeQuote(status: QuoteStatus = QuoteStatus.SENT): SharedQuoteViewProps["quote"] {
  const quote: SharedQuoteViewProps["quote"] = {
    number: "COT-001",
    status,
    title: "Servicio general",
    description: "Servicio completo",
    subtotalCents: 100_00,
    taxCents: 16_00,
    totalCents: 116_00,
    validUntil: new Date("2026-07-15T12:00:00.000Z"),
    vehicleSnapshot: null,
    createdAt: new Date("2026-07-01T12:00:00.000Z"),
    customer: {
      name: "Cliente Demo",
    },
    vehicle: null,
    items: [
      {
        type: QuoteItemType.SERVICE,
        description: "Mano de obra",
        quantity: "1",
        unitPriceCents: 100_00,
        totalCents: 100_00,
      },
    ],
  };

  return quote;
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
    expect(screen.getByRole("article", { name: "Servicio general" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Conceptos de la cotización" })).toBeInTheDocument();
    expect(screen.queryByText("Enviada")).not.toBeInTheDocument();
    expect(screen.queryByText("Vista previa de cotización")).not.toBeInTheDocument();
  });

  it("accepts the full quote and shows the success state", async () => {
    const user = userEvent.setup();
    acceptSharedQuoteActionMock.mockResolvedValue({ success: true });

    render(<SharedQuoteView quote={makeQuote()} token="token-123" />);

    await user.click(screen.getByRole("button", { name: "Aceptar cotización" }));

    expect(acceptSharedQuoteActionMock).toHaveBeenCalledWith("token-123");
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Cotización aceptada");
    expect(status).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Aceptar cotización" })).not.toBeInTheDocument();
  });

  it("declines the full quote and shows the declined state", async () => {
    const user = userEvent.setup();
    declineSharedQuoteActionMock.mockResolvedValue({ success: true });

    render(<SharedQuoteView quote={makeQuote()} token="token-123" />);

    await user.click(screen.getByRole("button", { name: "Declinar cotización" }));

    expect(declineSharedQuoteActionMock).toHaveBeenCalledWith("token-123");
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Cotización declinada");
    expect(status).toHaveFocus();
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
