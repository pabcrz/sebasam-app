import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuotePreviewCard } from "./quote-preview-card";
import type { QuotePreviewCardProps } from "./quote-preview-card";

describe("QuotePreviewCard", () => {
  const defaultProps: QuotePreviewCardProps = {
    customerName: "Cristian Del Toro",
    vehicle: { plate: "ABC-1234", brand: "Freightliner", model: "Cascadia", year: "2020" },
    title: "Cotización C-0826-001 — Muelles y tensor",
    description: "Abrazaderas de eje: $600 (no incluidas en costo final)",
    administrative: false,
    sections: [
      {
        id: "sec-1",
        name: "General",
        items: [
          {
            type: "LABOR",
            description: "Bajar dos muelles traseras",
            quantity: "1",
            unitPrice: "3000",
          },
          {
            type: "MATERIAL",
            description: "Tornillos de centro",
            quantity: "2",
            unitPrice: "70",
          },
        ],
        rowIds: [],
      },
    ],
    subtotalCents: 314000,
    taxCents: 50240,
    totalCents: 364240,
    validUntil: new Date("2026-09-02T00:00:00.000Z"),
    isNote: false,
    isPrint: true,
  };

  it("renders the concepts table with columns C., Concepto, P. Unitario, and Importe", () => {
    const { container } = render(<QuotePreviewCard {...defaultProps} />);

    const table = screen.getByTestId("quote-items-table");
    expect(container.firstElementChild).not.toHaveClass("print:flex-none");
    expect(screen.getByTestId("preview-notes-text").parentElement).toHaveClass("print:bg-white", "print:border-gray-200");
    expect(table).toBeInTheDocument();
    expect(table).toHaveTextContent("Cant.");
    expect(table).toHaveTextContent("Concepto / Servicio Realizado");
    expect(table).toHaveTextContent("P. Unitario");
    expect(table).toHaveTextContent("Importe");

    expect(table).toHaveTextContent("Bajar dos muelles traseras");
    expect(table).toHaveTextContent("$3,000.00");
    expect(table).toHaveTextContent("Tornillos de centro");
    expect(table).toHaveTextContent("$140.00");
  });

  it("keeps root and section concepts in the print table without a hidden display dependency", () => {
    render(
      <QuotePreviewCard
        {...defaultProps}
        compactItems
        sections={[
          {
            name: "General",
            items: [{ type: "LABOR", description: "Concepto raíz", quantity: "1", unitPrice: "500" }],
            rowIds: [],
          },
          {
            id: "sec-alignment",
            name: "Alineación",
            items: [{ type: "MATERIAL", description: "Concepto de sección", quantity: "2", unitPrice: "100" }],
            rowIds: [],
          },
        ]}
      />,
    );

    const table = screen.getByTestId("quote-items-table");
    expect(table).toHaveTextContent("Concepto raíz");
    expect(table).toHaveTextContent("Concepto de sección");
    expect(table).toHaveClass("sr-only", "md:not-sr-only", "print:not-sr-only");
    expect(table).not.toHaveClass("hidden", "print:block");
  });

  it("renders the service notes before totals and validity text", () => {
    render(<QuotePreviewCard {...defaultProps} />);

    const notes = screen.getByTestId("preview-notes-text");
    const totals = screen.getByTestId("quote-totals-block");

    expect(notes).toHaveTextContent(
      "Abrazaderas de eje: $600 (no incluidas en costo final)",
    );
    expect(notes.compareDocumentPosition(totals) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId("quote-validity")).toHaveTextContent(/Vigente hasta el/);
  });

  it("does not render bank accounts or CLABE in the preview card DOM", () => {
    const { container } = render(<QuotePreviewCard {...defaultProps} />);

    expect(container.textContent).not.toMatch(/CLABE/i);
    expect(container.textContent).not.toMatch(/Santander/i);
    expect(container.textContent).not.toMatch(/Mercado\s*Pago/i);
  });

  it("renders contact info with formatted role or omits it when absent", () => {
    const { rerender } = render(
      <QuotePreviewCard
        {...defaultProps}
        contactName="Juan Chofer"
        contactRole="Operador"
      />,
    );

    const contactInfo = screen.getByTestId("preview-contact-info");
    expect(contactInfo).toHaveTextContent("Operador: Juan Chofer");

    rerender(
      <QuotePreviewCard
        {...defaultProps}
        contactName="Ana Responsable"
        contactRole="Contacto responsable"
      />,
    );
    expect(screen.getByTestId("preview-contact-info")).toHaveTextContent("Contacto responsable: Ana Responsable");

    rerender(
      <QuotePreviewCard
        {...defaultProps}
        contactName="Carlos Facturacion"
        contactRole="Contacto de facturación"
      />,
    );
    expect(screen.getByTestId("preview-contact-info")).toHaveTextContent("Contacto de facturación: Carlos Facturacion");

    rerender(
      <QuotePreviewCard
        {...defaultProps}
        contactName={null}
        contactRole={null}
      />,
    );
    expect(screen.queryByTestId("preview-contact-info")).not.toBeInTheDocument();
  });

  it("maintains accessible touch target on selectable sections in mobile compact view", () => {
    render(
      <QuotePreviewCard
        {...defaultProps}
        compactItems
        selectableSectionIds={["sec-1"]}
        sections={[
          {
            id: "sec-1",
            name: "Frenos",
            items: [{ type: "LABOR", description: "Cambio de pastillas", quantity: "1", unitPrice: "500" }],
            rowIds: [],
          },
          {
            id: "sec-2",
            name: "Suspensión",
            items: [{ type: "LABOR", description: "Revisión muelles", quantity: "1", unitPrice: "800" }],
            rowIds: [],
          },
        ]}
      />,
    );

    const compactContainer = screen.getByTestId("quote-compact-items");
    expect(compactContainer).toHaveClass("grid", "gap-2.5", "sm:gap-3");

    const label = compactContainer.querySelector("label");
    expect(label).toHaveClass("min-h-[40px]");
  });
});
