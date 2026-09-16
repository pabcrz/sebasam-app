import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { QuoteListSummary } from "@/features/quotes/queries";
import { QuotePreviewDialog, toQuotePreviewCardProps } from "./quote-preview-dialog";

type MockQuoteInput = Partial<Omit<QuoteListSummary, "customerContact">> & {
  customerContact?: Partial<NonNullable<QuoteListSummary["customerContact"]>> | null;
  contactSnapshot?: unknown;
  customerSnapshot?: unknown;
};

function createMockQuote(overrides: MockQuoteInput = {}): QuoteListSummary {
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
        sectionId: null,
        type: "LABOR",
        description: "Cambio de aceite",
        quantity: 2,
        unitPriceCents: 5000,
        totalCents: 10000,
        includeInPayroll: false,
        customRatePercent: null,
        customPayrollBaseCents: null,
        payrollConfigLockedAt: null,
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
      items: [{
        id: "section-item-1",
        quoteId: "quote-1",
        sectionId: "section-1",
        type: "LABOR",
        description: "Diagnóstico de motor",
        quantity: 1,
        unitPriceCents: 5000,
        totalCents: 5000,
        includeInPayroll: false,
        customRatePercent: null,
        customPayrollBaseCents: null,
        payrollConfigLockedAt: null,
        sortOrder: 0,
      }],
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
          includeInPayroll: false,
          customRatePercent: null,
          customPayrollBaseCents: null,
          payrollConfigLockedAt: null,
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

  it("keeps root and section concepts when both are present", () => {
    const preview = toQuotePreviewCardProps(createMockQuote({
      items: [
        {
          id: "root-item-1",
          quoteId: "quote-1",
          sectionId: null,
          type: "LABOR",
          description: "Cambio de aceite",
          quantity: 2,
          unitPriceCents: 5000,
          totalCents: 10000,
          includeInPayroll: false,
          customRatePercent: null,
          customPayrollBaseCents: null,
          payrollConfigLockedAt: null,
          sortOrder: 0,
        },
        {
          id: "section-item-1",
          quoteId: "quote-1",
          sectionId: "section-1",
          type: "LABOR",
          description: "Cambio de aceite",
          quantity: 1,
          unitPriceCents: 5000,
          totalCents: 5000,
          includeInPayroll: false,
          customRatePercent: null,
          customPayrollBaseCents: null,
          payrollConfigLockedAt: null,
          sortOrder: 0,
        },
      ],
      sections: [{
        id: "section-1",
        quoteId: "quote-1",
        name: "Frenos",
        sortOrder: 0,
        isAuthorized: false,
        items: [{
          id: "section-item-1",
          quoteId: "quote-1",
          sectionId: "section-1",
          type: "LABOR",
          description: "Cambio de aceite",
          quantity: 1,
          unitPriceCents: 5000,
          totalCents: 5000,
          includeInPayroll: false,
          customRatePercent: null,
          customPayrollBaseCents: null,
          payrollConfigLockedAt: null,
          sortOrder: 0,
        }],
      }],
    }));

    expect(preview.sections).toHaveLength(2);
    expect(preview.sections[0]?.items[0]?.description).toBe("Cambio de aceite");
    expect(preview.sections[0]?.items).toHaveLength(1);
    expect(preview.sections[1]?.items[0]?.description).toBe("Cambio de aceite");
    expect(preview.sections[1]?.items).toHaveLength(1);
  });

  it("does not render redundant print button inside the preview dialog", async () => {
    const user = userEvent.setup();
    render(<QuotePreviewDialog quote={createMockQuote({
      id: "quote-preview-1",
      workOrder: { id: "wo-preview-active-1", status: "IN_PROGRESS" } as QuoteListSummary["workOrder"],
    })} />);

    await user.click(screen.getByRole("button", { name: /ver vista previa/i }));

    expect(screen.queryByRole("link", { name: /imprimir/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/imprimir cotización/i)).not.toBeInTheDocument();
  });

  it("renders contact with role 'Operador' when DRIVER is present in snapshot", async () => {
    const user = userEvent.setup();
    const quote = createMockQuote({
      contactSnapshot: {
        id: "c-1",
        name: "Roberto Chofer",
        role: "DRIVER",
      },
    });

    render(<QuotePreviewDialog quote={quote} />);
    await user.click(screen.getByRole("button", { name: /ver vista previa/i }));

    expect(screen.getByText("Operador: Roberto Chofer")).toBeInTheDocument();
  });

  it("renders contact with role 'Contacto responsable' and 'Contacto de facturación'", async () => {
    const user = userEvent.setup();
    const contactQuote = createMockQuote({
      contactSnapshot: {
        id: "c-2",
        name: "Maria Directora",
        role: "CONTACT",
      },
    });

    const { unmount } = render(<QuotePreviewDialog quote={contactQuote} />);
    await user.click(screen.getByRole("button", { name: /ver vista previa/i }));
    expect(screen.getByText("Contacto responsable: Maria Directora")).toBeInTheDocument();
    unmount();

    const billingQuote = createMockQuote({
      contactSnapshot: {
        id: "c-3",
        name: "Carlos Contador",
        role: "BILLING",
      },
    });
    render(<QuotePreviewDialog quote={billingQuote} />);
    await user.click(screen.getByRole("button", { name: /ver vista previa/i }));
    expect(screen.getByText("Contacto de facturación: Carlos Contador")).toBeInTheDocument();
  });

  it("prioritizes contact snapshot over changed live customer contact", async () => {
    const user = userEvent.setup();
    const quote = createMockQuote({
      contactSnapshot: {
        id: "c-historical",
        name: "Chofer Histórico",
        role: "DRIVER",
      },
      customerContact: {
        id: "c-live",
        name: "Nuevo Chofer Vivo",
        role: "CONTACT",
        phone: "5511223344",
      },
    });

    render(<QuotePreviewDialog quote={quote} />);
    await user.click(screen.getByRole("button", { name: /ver vista previa/i }));

    expect(screen.getByText("Operador: Chofer Histórico")).toBeInTheDocument();
    expect(screen.queryByText(/Nuevo Chofer Vivo/)).not.toBeInTheDocument();
  });

  it("falls back to live customer contact when contactSnapshot is null", async () => {
    const user = userEvent.setup();
    const quote = createMockQuote({
      contactSnapshot: null,
      customerContact: {
        id: "c-live",
        name: "Contacto Vivo",
        role: "CONTACT",
        phone: "5511223344",
      },
    });

    render(<QuotePreviewDialog quote={quote} />);
    await user.click(screen.getByRole("button", { name: /ver vista previa/i }));

    expect(screen.getByText("Contacto responsable: Contacto Vivo")).toBeInTheDocument();
  });

  it("does not render a contact line when no contact is selected", async () => {
    const user = userEvent.setup();
    const quote = createMockQuote({
      contactSnapshot: null,
      customerContact: null,
    });

    render(<QuotePreviewDialog quote={quote} />);
    await user.click(screen.getByRole("button", { name: /ver vista previa/i }));

    expect(screen.queryByText(/Operador:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Chofer:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Contacto:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Contacto responsable:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Contacto de facturación:/)).not.toBeInTheDocument();
  });

  it("has accessible touch target on close button", async () => {
    const user = userEvent.setup();
    render(<QuotePreviewDialog quote={createMockQuote()} />);
    await user.click(screen.getByRole("button", { name: /ver vista previa/i }));

    const closeButton = screen.getByRole("button", { name: /cerrar/i });
    expect(closeButton).toHaveClass("min-h-[40px]", "min-w-[40px]");
  });
});
