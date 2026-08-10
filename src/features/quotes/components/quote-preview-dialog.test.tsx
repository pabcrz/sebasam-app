import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { QuoteDetail } from "@/features/quotes/queries";
import { QuotePreviewDialog } from "./quote-preview-dialog";

const { loadQuoteDetailAction } = vi.hoisted(() => ({ loadQuoteDetailAction: vi.fn() }));

vi.mock("../actions", () => ({ loadQuoteDetailAction }));

function createMockQuote(overrides: Partial<QuoteDetail> = {}): QuoteDetail {
  return {
    id: "quote-1",
    customerId: "cust-1",
    vehicleId: null,
    number: "C-001",
    status: "DRAFT",
    title: "Servicio general",
    description: "Revisión completa",
    vehicleSnapshot: null,
    subtotalCents: 10000,
    taxCents: 1600,
    totalCents: 11600,
    taxEnabled: true,
    validUntil: new Date("2026-12-31T00:00:00.000Z"),
    approvedAt: null,
    administrative: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    customer: { id: "cust-1", name: "Constructora del Norte" },
    vehicle: null,
    items: [
      {
        id: "item-1",
        quoteId: "quote-1",
        type: "LABOR",
        description: "Cambio de aceite",
        quantity: 2,
        unitPriceCents: 5000,
        totalCents: 10000,
        sortOrder: 0,
      },
    ],
    discountCents: 0,
    sections: [],
    paidCents: 0,
    remainingCents: 11600,
    ...overrides,
  } as QuoteDetail;
}

describe("QuotePreviewDialog", () => {
  beforeEach(() => {
    loadQuoteDetailAction.mockReset();
  });

  it("loads detail only after opening and renders it", async () => {
    const user = userEvent.setup();
    const quote = createMockQuote();
    loadQuoteDetailAction.mockResolvedValue(quote);

    render(<QuotePreviewDialog quote={quote} />);

    expect(loadQuoteDetailAction).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /ver vista previa de c-001/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(loadQuoteDetailAction).toHaveBeenCalledWith("quote-1");
    expect(screen.getByText("Cotización C-001")).toBeInTheDocument();
    expect(await screen.findByText("Constructora del Norte")).toBeInTheDocument();
    expect(screen.getByText("Cotización administrativa")).toBeInTheDocument();
    expect(screen.getByText("Cambio de aceite")).toBeInTheDocument();
    expect(screen.getByText(/Mano de obra · 2 × \$50.00/i)).toBeInTheDocument();
    expect(screen.getByTestId("quote-subtotal")).toHaveTextContent("$100.00");
    expect(screen.getByTestId("quote-tax")).toHaveTextContent("$16.00");
    expect(screen.getByTestId("quote-total")).toHaveTextContent("$116.00");
  });

  it("closes the dialog when the close button is clicked", async () => {
    const user = userEvent.setup();
    const quote = createMockQuote();
    loadQuoteDetailAction.mockResolvedValue(quote);

    render(<QuotePreviewDialog quote={quote} />);

    await user.click(screen.getByRole("button", { name: /ver vista previa/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cerrar/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders sectioned concepts from the detail payload", async () => {
    const user = userEvent.setup();
    const quote = createMockQuote({
      sections: [{
        id: "section-1",
        quoteId: "quote-1",
        name: "Motor",
        sortOrder: 0,
        items: [{
          id: "section-item-1",
          quoteId: "quote-1",
          sectionId: "section-1",
          type: "LABOR",
          description: "Diagnóstico de motor",
          quantity: 1,
          unitPriceCents: 5000,
          totalCents: 5000,
          sortOrder: 0,
        }],
      }],
    });
    loadQuoteDetailAction.mockResolvedValue(quote);

    render(<QuotePreviewDialog quote={quote} />);

    await user.click(screen.getByRole("button", { name: /ver vista previa/i }));

    expect(await screen.findByText("Diagnóstico de motor")).toBeInTheDocument();
    expect(screen.queryByText("Cambio de aceite")).not.toBeInTheDocument();
  });

  it("falls back to legacy root items when sections are empty", async () => {
    const user = userEvent.setup();
    const quote = createMockQuote();
    loadQuoteDetailAction.mockResolvedValue(quote);

    render(<QuotePreviewDialog quote={quote} />);

    await user.click(screen.getByRole("button", { name: /ver vista previa/i }));

    expect(await screen.findByText("Cambio de aceite")).toBeInTheDocument();
  });

  it("shows a retryable failure state when detail loading fails", async () => {
    const user = userEvent.setup();
    const quote = createMockQuote();
    loadQuoteDetailAction.mockRejectedValueOnce(new Error("offline"));
    loadQuoteDetailAction.mockResolvedValueOnce(quote);

    render(<QuotePreviewDialog quote={quote} />);

    await user.click(screen.getByRole("button", { name: /ver vista previa/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar la cotización");
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => expect(loadQuoteDetailAction).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Constructora del Norte")).toBeInTheDocument();
  });
});
