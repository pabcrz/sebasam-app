import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocumentPreview, type DocumentPreviewProps } from "./document-preview";

const baseProps: DocumentPreviewProps = {
  typeLabel: "Cotización",
  statusLabel: "Borrador",
  customer: { name: "Cristian Del Toro", phone: "55 1234 5678" },
  driverName: "Juan Chofer",
  unitLine: "ECO 42 · Freightliner Cascadia 2020",
  service: "Muelles y tensor",
  sections: [
    {
      id: "sec-1",
      name: "Lado izquierdo",
      subtotalCents: 200000,
      rows: [
        { id: "r1", quantityLabel: "1", description: "Bajar muelle izquierda", unitPriceCents: 70000, lineTotalCents: 70000 },
        { id: "r2", quantityLabel: "4", description: "Gomas de columpio", unitPriceCents: 32500, lineTotalCents: 130000 },
      ],
    },
    {
      id: "sec-2",
      name: "Lado derecho",
      subtotalCents: 135000,
      rows: [
        { id: "r3", quantityLabel: "1", description: "Hoja 2a", unitPriceCents: 65000, lineTotalCents: 65000 },
        { id: "r4", quantityLabel: "1", description: "Bajar muelle derecha", unitPriceCents: 70000, lineTotalCents: 70000 },
      ],
    },
  ],
  totals: { subtotalCents: 335000, discountCents: 0, taxCents: 53600, totalCents: 388600, partialNotice: null },
  notes: "Cambio de hojas en ambos lados.\n- Se revisan bujes.\n- Precio sujeto a cambio.",
  issuedText: "Cotizada el 2 de noviembre de 2026",
  validityText: "Vigente hasta 18 de noviembre de 2026",
};

describe("DocumentPreview", () => {
  it("renders no workshop header inside the app", () => {
    render(<DocumentPreview {...baseProps} />);

    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.queryByTestId("document-preview-header")).not.toBeInTheDocument();
    expect(screen.getByTestId("document-preview").querySelector("header")).toBeNull();
  });

  it("is a white card with the card radius and shadow, no border, centered at a 760px maximum width", () => {
    render(<DocumentPreview {...baseProps} />);

    const card = screen.getByTestId("document-preview-card");
    expect(card).toHaveClass(
      "bg-[var(--color-surface)]",
      "rounded-[var(--radius-lg)]",
      "shadow-[var(--shadow-card)]",
      "mx-auto",
      "max-w-[760px]",
    );
    expect(card.className).not.toMatch(/(^|\s)border(-|\s|$)/);
  });

  it("shows client name and phone in one column and the unit with its driver in the other, on a gray block", () => {
    render(<DocumentPreview {...baseProps} />);

    const block = screen.getByRole("region", { name: "Cliente y unidad" });
    expect(block).toHaveClass("grid-cols-2", "bg-[var(--color-surface-muted)]", "rounded-[var(--radius-sm)]");
    expect(within(block).getByText("Cristian Del Toro")).toBeInTheDocument();
    expect(within(block).getByText("55 1234 5678")).toBeInTheDocument();
    expect(within(block).getByText("ECO 42 · Freightliner Cascadia 2020")).toBeInTheDocument();
    expect(within(block).getByText("Chofer: Juan Chofer")).toBeInTheDocument();
  });

  it("omits the driver line when the data has no driver", () => {
    render(<DocumentPreview {...baseProps} driverName={null} />);

    const block = screen.getByRole("region", { name: "Cliente y unidad" });
    expect(within(block).getByText("ECO 42 · Freightliner Cascadia 2020")).toBeInTheDocument();
    expect(within(block).queryByText(/Chofer:/)).not.toBeInTheDocument();
  });

  it("keeps the service label between a top and a bottom rule", () => {
    render(<DocumentPreview {...baseProps} />);

    expect(screen.getByTestId("document-preview-service")).toHaveClass("border-y");
  });

  it("shows a CANT. · CONCEPTO · UNITARIO · IMPORTE header above the rows", () => {
    render(<DocumentPreview {...baseProps} />);

    const head = screen.getByTestId("document-preview-table-head");
    expect(within(head).getByText("CANT.")).toBeInTheDocument();
    expect(within(head).getByText("CONCEPTO")).toBeInTheDocument();
    expect(within(head).getByText("UNITARIO")).toBeInTheDocument();
    expect(within(head).getByText("IMPORTE")).toBeInTheDocument();
  });

  it("shows the unit price next to the line total and drops the old per-unit detail line", () => {
    render(<DocumentPreview {...baseProps} />);

    const row = screen.getByText("Gomas de columpio").closest("li")!;
    expect(within(row).getByText("4")).toBeInTheDocument();
    expect(within(row).getByText("$325.00")).toBeInTheDocument();
    expect(within(row).getByText("$1,300.00")).toBeInTheDocument();
    expect(screen.queryByText(/c\/u/)).not.toBeInTheDocument();
  });

  it("turns every note line into a list item, dropping the leading dash", () => {
    render(<DocumentPreview {...baseProps} />);

    const notes = screen.getByTestId("document-preview-notes");
    const items = within(notes).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "Cambio de hojas en ambos lados.",
      "Se revisan bujes.",
      "Precio sujeto a cambio.",
    ]);
  });

  it("gives notes and payment methods each its own gray rounded block with an 11px uppercase label", () => {
    render(<DocumentPreview {...baseProps} />);

    for (const [testId, label] of [
      ["document-preview-notes", "Notas"],
      ["document-preview-payment-methods", "Formas de pago"],
    ] as const) {
      const block = screen.getByTestId(testId);
      expect(block).toHaveClass("bg-[var(--color-surface-muted)]", "rounded-[var(--radius-sm)]");
      expect(block).not.toHaveClass("border-t");
      expect(within(block).getByText(label)).toHaveClass("text-[11px]", "uppercase");
    }
  });

  it("shows a section header strip with the subtotal of each section", () => {
    render(<DocumentPreview {...baseProps} />);

    const strips = screen.getAllByTestId("document-preview-section-header");
    expect(strips).toHaveLength(2);
    expect(strips[0]).toHaveTextContent("Lado izquierdo");
    expect(within(strips[0]!).getByTestId("document-preview-section-subtotal")).toHaveTextContent("$2,000.00");
    expect(within(strips[1]!).getByTestId("document-preview-section-subtotal")).toHaveTextContent("$1,350.00");
  });

  it("always shows the strip and subtotal, including for a single section", () => {
    render(<DocumentPreview {...baseProps} sections={[baseProps.sections[0]!]} />);

    const strips = screen.getAllByTestId("document-preview-section-header");
    expect(strips).toHaveLength(1);
    expect(within(strips[0]!).getByTestId("document-preview-section-subtotal")).toHaveTextContent("$2,000.00");
    expect(screen.getByText("Bajar muelle izquierda")).toBeInTheDocument();
  });

  it("puts the amount in words on the left and the figures on the right of one totals block", () => {
    render(<DocumentPreview {...baseProps} />);

    const totals = screen.getByRole("region", { name: "Totales" });
    expect(totals).toHaveClass("bg-[var(--color-surface-muted)]");
    const row = screen.getByTestId("document-preview-totals-row");
    const words = within(totals).getByTestId("quote-total-in-words");
    const figures = totals.querySelector("dl")!;
    expect(row).toContainElement(words);
    expect(row).toContainElement(figures);
    expect(words).toHaveTextContent(/pesos 00\/100 M\.N\./i);
    expect(words.compareDocumentPosition(figures) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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

  it("ends with one small line of the dates that exist", () => {
    const { rerender } = render(<DocumentPreview {...baseProps} />);

    expect(screen.getByTestId("document-preview-dates")).toHaveTextContent(
      "Cotizada el 2 de noviembre de 2026 · Vigente hasta 18 de noviembre de 2026",
    );

    rerender(<DocumentPreview {...baseProps} issuedText={null} />);
    expect(screen.getByTestId("document-preview-dates")).toHaveTextContent("Vigente hasta 18 de noviembre de 2026");
    expect(screen.getByTestId("document-preview-dates")).not.toHaveTextContent("Cotizada");
  });

  it("shows step shortcuts above the card only when the host supplies them", async () => {
    const user = userEvent.setup();
    const onClient = vi.fn();
    const { rerender } = render(<DocumentPreview {...baseProps} />);

    expect(screen.queryByTestId("document-preview-step-shortcuts")).not.toBeInTheDocument();

    rerender(
      <DocumentPreview
        {...baseProps}
        stepShortcuts={[
          { label: "Cliente", onSelect: onClient },
          { label: "Conceptos", onSelect: vi.fn() },
          { label: "Notas", onSelect: vi.fn() },
        ]}
      />,
    );

    const shortcuts = screen.getByTestId("document-preview-step-shortcuts");
    const card = screen.getByTestId("document-preview-card");
    expect(shortcuts.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await user.click(within(shortcuts).getByRole("button", { name: "✎ Cliente" }));
    expect(onClient).toHaveBeenCalledTimes(1);
    expect(within(shortcuts).getByRole("button", { name: "✎ Conceptos" })).toBeInTheDocument();
    expect(within(shortcuts).getByRole("button", { name: "✎ Notas" })).toBeInTheDocument();
  });

  it("never owns an inner scroll: the root has no overflow-y class", () => {
    render(<DocumentPreview {...baseProps} />);

    const root = screen.getByTestId("document-preview");
    expect(root.className).not.toMatch(/overflow-y-/);
    expect(root).not.toHaveClass("overflow-y-auto", "overflow-y-scroll");
  });
});
