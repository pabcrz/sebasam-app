import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { DocumentPreview, type DocumentPreviewProps } from "./document-preview";

const baseProps: DocumentPreviewProps = {
  typeLabel: "Cotización",
  statusLabel: "Borrador",
  customer: { name: "Cristian Del Toro" },
  contactLine: "Operador: Juan Chofer",
  unitLine: "ECO 42 · Freightliner Cascadia 2020",
  service: "Muelles y tensor",
  sections: [
    {
      id: "sec-1",
      name: "Lado izquierdo",
      subtotalCents: 200000,
      rows: [
        { id: "r1", quantityLabel: "1", description: "Bajar muelle izquierda", lineTotalCents: 70000, unitDetailLabel: null },
        { id: "r2", quantityLabel: "4", description: "Gomas de columpio", lineTotalCents: 130000, unitDetailLabel: "4 × $325.00 c/u" },
      ],
    },
    {
      id: "sec-2",
      name: "Lado derecho",
      subtotalCents: 135000,
      rows: [
        { id: "r3", quantityLabel: "1", description: "Hoja 2a", lineTotalCents: 65000, unitDetailLabel: null },
        { id: "r4", quantityLabel: "1", description: "Bajar muelle derecha", lineTotalCents: 70000, unitDetailLabel: null },
      ],
    },
  ],
  showSectionHeaders: true,
  totals: { subtotalCents: 335000, discountCents: 0, taxCents: 53600, totalCents: 388600, partialNotice: null },
  notes: "Cambio de hojas en ambos lados.\n- Se revisan bujes.\n- Precio sujeto a cambio.",
  validityText: "Vigente hasta el 18 de noviembre de 2026.",
};

describe("DocumentPreview", () => {
  it("renders no workshop header inside the app", () => {
    render(<DocumentPreview {...baseProps} />);

    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.queryByTestId("document-preview-header")).not.toBeInTheDocument();
    expect(screen.getByTestId("document-preview").querySelector("header")).toBeNull();
  });

  it("turns note lines that start with '-' into a bullet list", () => {
    render(<DocumentPreview {...baseProps} />);

    const notes = screen.getByTestId("document-preview-notes");
    const items = within(notes).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual(["Se revisan bujes.", "Precio sujeto a cambio."]);
    expect(within(notes).getByText("Cambio de hojas en ambos lados.").closest("li")).toBeNull();
  });

  it("shows a section header strip with the subtotal of each section", () => {
    render(<DocumentPreview {...baseProps} />);

    const strips = screen.getAllByTestId("document-preview-section-header");
    expect(strips).toHaveLength(2);
    expect(strips[0]).toHaveTextContent("Lado izquierdo");
    expect(within(strips[0]!).getByTestId("document-preview-section-subtotal")).toHaveTextContent("$2,000.00");
    expect(within(strips[1]!).getByTestId("document-preview-section-subtotal")).toHaveTextContent("$1,350.00");
  });

  it("omits section headers when a single unnamed section does not need them", () => {
    render(<DocumentPreview {...baseProps} sections={[baseProps.sections[0]!]} showSectionHeaders={false} />);

    expect(screen.queryByTestId("document-preview-section-header")).not.toBeInTheDocument();
    expect(screen.getByText("Bajar muelle izquierda")).toBeInTheDocument();
  });

  it("renders totals with amount in words, subtotal, IVA and the big total", () => {
    render(<DocumentPreview {...baseProps} />);

    const totals = screen.getByRole("region", { name: "Totales" });
    expect(within(totals).getByTestId("quote-total-in-words")).toHaveTextContent(/pesos 00\/100 M\.N\./i);
    expect(within(totals).getByTestId("quote-subtotal")).toHaveTextContent("$3,350.00");
    expect(within(totals).getByTestId("quote-tax")).toHaveTextContent("$536.00");
    expect(within(totals).getByTestId("quote-total")).toHaveTextContent("$3,886.00");
  });

  it("renders the payment methods block with efectivo, transferencia and tarjeta de débito y crédito", () => {
    render(<DocumentPreview {...baseProps} />);

    const methods = screen.getByRole("region", { name: "Formas de pago" });
    expect(methods).toHaveTextContent("Efectivo");
    expect(methods).toHaveTextContent("Transferencia");
    expect(methods).toHaveTextContent("Tarjeta de débito y crédito");
  });

  it("never owns an inner scroll: the root has no overflow-y class", () => {
    render(<DocumentPreview {...baseProps} />);

    const root = screen.getByTestId("document-preview");
    expect(root.className).not.toMatch(/overflow-y-/);
    expect(root).not.toHaveClass("overflow-y-auto", "overflow-y-scroll");
  });
});
