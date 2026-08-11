import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomerStatus, QuoteItemType, QuoteStatus } from "@prisma/client";
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
    id: "quote-1",
    submissionKey: null,
    submissionHash: null,
    number: "COT-001",
    status,
    title: "Servicio general",
    description: "Servicio completo",
    administrative: false, deletedAt: null,
    subtotalCents: 100_00,
    discountCents: 0,
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
        sectionId: null,
        type: QuoteItemType.SERVICE,
        description: "Mano de obra",
        quantity: "1",
        unitPriceCents: 100_00,
        totalCents: 100_00,
        sortOrder: 0,
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

    expect(screen.getByRole("heading", { name: "Servicio general" })).toBeInTheDocument();
    expect(screen.getByText("Folio COT-001")).toBeInTheDocument();
    expect(screen.queryByText(/vista previa/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Enviada")).not.toBeInTheDocument();
    expect(screen.queryByText("SEBASAM")).not.toBeInTheDocument();
    expect(screen.queryByText(/Batalla de Casa Blanca/)).not.toBeInTheDocument();
    expect(screen.getByText("Mano de obra")).toBeInTheDocument();
    expect(screen.getByText(/Servicio · 1 ×/)).toBeInTheDocument();
    expect(screen.getByTestId("quote-total")).toHaveTextContent("$116.00");
    expect(screen.getByRole("button", { name: "Aceptar cotización" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Declinar cotización" })).toBeInTheDocument();
    expect(screen.queryByText(/partida/i)).not.toBeInTheDocument();
  });

  it("keeps final status as secondary feedback without decision controls", () => {
    render(<SharedQuoteView quote={makeQuote(QuoteStatus.APPROVED)} token="token-123" />);

    expect(screen.getByRole("heading", { name: "Servicio general" })).toBeInTheDocument();
    expect(screen.getByText("Aceptada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aceptar cotización" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Declinar cotización" })).not.toBeInTheDocument();
  });

  it("accepts the full quote and shows the success state", async () => {
    const user = userEvent.setup();
    acceptSharedQuoteActionMock.mockResolvedValue({ success: true });

    render(<SharedQuoteView quote={makeQuote()} token="token-123" />);

    await user.click(screen.getByRole("button", { name: "Aceptar cotización" }));

    expect(acceptSharedQuoteActionMock).toHaveBeenCalledWith("token-123");
    const feedback = await screen.findByRole("status");
    expect(feedback).toHaveTextContent("Cotización aceptada");
    expect(feedback).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Aceptar cotización" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Declinar cotización" })).not.toBeInTheDocument();
  });

  it("declines the full quote and shows the declined state", async () => {
    const user = userEvent.setup();
    declineSharedQuoteActionMock.mockResolvedValue({ success: true });

    render(<SharedQuoteView quote={makeQuote()} token="token-123" />);

    await user.click(screen.getByRole("button", { name: "Declinar cotización" }));

    expect(declineSharedQuoteActionMock).toHaveBeenCalledWith("token-123");
    const feedback = await screen.findByRole("status");
    expect(feedback).toHaveTextContent("Cotización declinada");
    expect(feedback).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Aceptar cotización" })).not.toBeInTheDocument();
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
