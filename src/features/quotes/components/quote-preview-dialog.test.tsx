import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { QuoteListSummary } from "@/features/quotes/queries";
import { QuotePreviewDialog } from "./quote-preview-dialog";

function createMockQuote(overrides: Partial<QuoteListSummary> = {}): QuoteListSummary {
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
    operationalDate: new Date("2026-07-01T00:00:00.000Z"),
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
  } as QuoteListSummary;
}

describe("QuotePreviewDialog", () => {
  it("renders the supplied quote content immediately when opened", async () => {
    const user = userEvent.setup();
    const quote = createMockQuote();

    render(<QuotePreviewDialog quote={quote} />);

    await user.click(screen.getByRole("button", { name: /ver vista previa de c-001/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Cotización C-001")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText("Constructora del Norte")).toBeInTheDocument();
    expect(screen.getByText("Cotización administrativa")).toBeInTheDocument();
    expect(screen.getAllByText("Cambio de aceite")[0]).toBeInTheDocument();
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

  it("renders sectioned concepts from the supplied payload", async () => {
    const user = userEvent.setup();
    const quote = createMockQuote({
      sections: [{
        id: "section-1",
        quoteId: "quote-1",
        name: "General",
        sortOrder: 0,
        isAuthorized: false,
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
    render(<QuotePreviewDialog quote={quote} />);

    await user.click(screen.getByRole("button", { name: /ver vista previa/i }));

    expect(screen.getAllByText("Diagnóstico de motor")[0]).toBeInTheDocument();
    expect(screen.queryByText("Cambio de aceite")).not.toBeInTheDocument();
  });

  it("falls back to legacy root items when sections are empty", async () => {
    const user = userEvent.setup();
    const quote = createMockQuote();

    render(<QuotePreviewDialog quote={quote} />);

    await user.click(screen.getByRole("button", { name: /ver vista previa/i }));

    expect(screen.getAllByText("Cambio de aceite")[0]).toBeInTheDocument();
  });
});
