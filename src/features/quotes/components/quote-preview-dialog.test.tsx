import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { listQuotes } from "@/features/quotes/queries";
import { QuotePreviewDialog } from "./quote-preview-dialog";

type QuoteListItem = Awaited<ReturnType<typeof listQuotes>>[number];

function createMockQuote(overrides: Partial<QuoteListItem> = {}): QuoteListItem {
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
    workOrder: null,
    paymentRequests: [],
    ...overrides,
  } as QuoteListItem;
}

describe("QuotePreviewDialog", () => {
  it("opens the dialog and renders quote details", async () => {
    const user = userEvent.setup();
    const quote = createMockQuote();

    render(<QuotePreviewDialog quote={quote} />);

    await user.click(screen.getByRole("button", { name: /ver vista previa de c-001/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Cotización C-001")).toBeInTheDocument();
    expect(screen.queryByText(/vista previa/i)).not.toBeInTheDocument();
    expect(screen.getByText("Constructora del Norte")).toBeInTheDocument();
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

    render(<QuotePreviewDialog quote={quote} />);

    await user.click(screen.getByRole("button", { name: /ver vista previa/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cerrar/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders vehicle information when a vehicle is present", async () => {
    const user = userEvent.setup();
    const quote = createMockQuote({
      vehicle: {
        id: "veh-1",
        customerId: "cust-1",
        brand: "Toyota",
        model: "Hilux",
        year: 2022,
        color: "Blanco",
        plate: "ABC-123",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    render(<QuotePreviewDialog quote={quote} />);

    await user.click(screen.getByRole("button", { name: /ver vista previa/i }));

    expect(screen.getByText("Toyota · Hilux · 2022 · ABC-123")).toBeInTheDocument();
  });

  it("renders the pending balance when the quote has a partial payment", async () => {
    const user = userEvent.setup();
    const quote = createMockQuote({ paidCents: 2500, remainingCents: 9100 });

    render(<QuotePreviewDialog quote={quote} />);

    await user.click(screen.getByRole("button", { name: /ver vista previa/i }));

    expect(screen.getByTestId("quote-payment-balance-indicator")).toHaveTextContent("Saldo pendiente: $91.00");
  });

  it("renders the empty concepts message when the quote has no items", async () => {
    const user = userEvent.setup();
    const quote = createMockQuote({ items: [], subtotalCents: 0, taxCents: 0, totalCents: 0 });

    render(<QuotePreviewDialog quote={quote} />);

    await user.click(screen.getByRole("button", { name: /ver vista previa/i }));

    expect(screen.getByText("Sin conceptos.")).toBeInTheDocument();
  });

  it("opens when controlled open is set to true", () => {
    const quote = createMockQuote();

    const { rerender } = render(<QuotePreviewDialog quote={quote} open={false} onOpenChange={() => {}} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    rerender(<QuotePreviewDialog quote={quote} open onOpenChange={() => {}} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
