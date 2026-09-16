import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { CustomerStatus, QuoteItemType, QuoteStatus, WorkOrderStatus } from "@prisma/client";
import { SharedQuoteView, type SharedQuoteViewProps } from "./shared-quote-view";
import { acceptSharedQuoteAction, declineSharedQuoteAction } from "@/features/quotes/actions";


vi.mock("@/features/quotes/actions", () => ({
  acceptSharedQuoteAction: vi.fn(),
  declineSharedQuoteAction: vi.fn(),
}));

const acceptSharedQuoteActionMock = vi.mocked(acceptSharedQuoteAction);
const declineSharedQuoteActionMock = vi.mocked(declineSharedQuoteAction);

function makeQuote(status: QuoteStatus = QuoteStatus.SENT, workOrderStatus?: WorkOrderStatus): SharedQuoteViewProps["quote"] {
  const quote = {
    id: "quote-1",
    submissionKey: null,
    submissionHash: null,
    number: "COT-001",
    folio: null,
    issuedAt: null,
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
    paymentDueDate: null,
    isLocked: false,
    lockedAt: null,
    lockedById: null,
    lockedReason: null,
    customerId: "customer-1",
    customerContactId: null,
    customerFiscalProfileId: null,
    customerSnapshot: null,
    contactSnapshot: null,
    vehicleId: null,
    vehicleSnapshot: null,
    operationalDate: new Date("2026-07-01T00:00:00.000Z"),
    createdAt: new Date("2026-07-01T12:00:00.000Z"),
    updatedAt: new Date("2026-07-01T12:00:00.000Z"),
    customer: {
      id: "customer-1",
      name: "Cliente Demo",
      commercialName: null,
      legalName: null,
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
        type: QuoteItemType.LABOR,
        description: "Mano de obra",
        quantity: "1",
        unitPriceCents: 100_00,
        totalCents: 100_00,
        includeInPayroll: false,
        customRatePercent: null,
        customPayrollBaseCents: null,
        sortOrder: 0,
      },
    ],
    sections: [],
    workOrder: workOrderStatus ? { status: workOrderStatus } : null,
  };

  return quote as SharedQuoteViewProps["quote"];
}

function makeMultiSectionQuote(status: QuoteStatus = QuoteStatus.SENT): SharedQuoteViewProps["quote"] {
  return {
    ...makeQuote(status),
    items: [],
    sections: [
      {
        id: "sec-1",
        quoteId: "quote-1",
        name: "Aceite y filtros",
        sortOrder: 0,
        isAuthorized: false,
        items: [
          {
            id: "item-1",
            quoteId: "quote-1",
            sectionId: "sec-1",
            type: QuoteItemType.LABOR,
            description: "Cambio de aceite",
            quantity: "1",
            unitPriceCents: 40_00,
            totalCents: 40_00,
            includeInPayroll: false,
            customRatePercent: null,
            customPayrollBaseCents: null,
            sortOrder: 0,
          },
        ],
      },
      {
        id: "sec-2",
        quoteId: "quote-1",
        name: "Frenos",
        sortOrder: 1,
        isAuthorized: false,
        items: [
          {
            id: "item-2",
            quoteId: "quote-1",
            sectionId: "sec-2",
            type: QuoteItemType.LABOR,
            description: "Cambio de balatas",
            quantity: "1",
            unitPriceCents: 60_00,
            totalCents: 60_00,
            includeInPayroll: false,
            customRatePercent: null,
            customPayrollBaseCents: null,
            sortOrder: 0,
          },
        ],
      },
    ],
  };
}

function makePartiallyAuthorizedQuote(status: QuoteStatus = QuoteStatus.SENT): SharedQuoteViewProps["quote"] {
  const quote = makeMultiSectionQuote(status);

  return {
    ...quote,
    sections: quote.sections.map((section) => ({
      ...section,
      isAuthorized: section.id === "sec-1",
    })),
  };
}

function makeLegacyMultiSectionQuote(): SharedQuoteViewProps["quote"] {
  const quote = makeMultiSectionQuote();

  return {
    ...quote,
    sections: quote.sections.map((section) => {
      const legacySection: Omit<typeof section, "isAuthorized"> & { isAuthorized?: boolean } = { ...section };
      delete legacySection.isAuthorized;
      return legacySection;
    }),
  } as SharedQuoteViewProps["quote"];
}

describe("SharedQuoteView", () => {
  beforeEach(() => {
    acceptSharedQuoteActionMock.mockReset();
    declineSharedQuoteActionMock.mockReset();
  });

  it("renders whole-quote decision controls for sent shared quotes", () => {
    render(<SharedQuoteView quote={makeQuote()} token="token-123" />);

    expect(screen.getByRole("heading", { name: "Servicio general" })).toBeInTheDocument();
    expect(screen.queryByText(/vista previa/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Enviada")).not.toBeInTheDocument();
    expect(screen.queryByText("SEBASAM")).not.toBeInTheDocument();
    expect(screen.queryByText(/Batalla de Casa Blanca/)).not.toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByText("Mano de obra")).toBeInTheDocument();
    expect(screen.getByTestId("quote-total")).toHaveTextContent("$116.00");
    expect(screen.getByRole("button", { name: "Aceptar cotización" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Declinar cotización" })).toBeInTheDocument();
    expect(screen.queryByText(/partida/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Progreso de la cotización" })).not.toBeInTheDocument();
  });

  it("uses clear focus rings for public quotation actions", () => {
    render(<SharedQuoteView quote={makeQuote()} token="token-123" />);

    expect(screen.getByRole("button", { name: "Aceptar cotización" })).toHaveClass("focus-visible:!ring-white", "focus-visible:!ring-offset-2");
    expect(screen.getByRole("button", { name: "Declinar cotización" })).toHaveClass("focus-visible:!ring-[var(--color-primary)]", "focus-visible:!ring-offset-2");
  });

  it("shows the Imprimir label beside the printer icon at desktop breakpoints", () => {
    render(<SharedQuoteView quote={makeQuote()} token="token-123" />);

    const printControl = screen.getByRole("button", { name: "Imprimir documento" });
    expect(printControl.querySelector("svg")).toBeInTheDocument();
    expect(screen.getByText("Imprimir")).toHaveClass("hidden", "sm:inline");
  });

  it("keeps the mobile icon-only print control accessible and tappable", () => {
    render(<SharedQuoteView quote={makeQuote()} token="token-123" />);

    const printControl = screen.getByRole("button", { name: "Imprimir documento" });
    expect(printControl).toHaveAttribute("title", "Imprimir documento");
    expect(printControl).toHaveClass(
      "min-h-11",
      "min-w-11",
      "print:hidden",
    );
    expect(printControl).toHaveClass(
      "fixed",
      "bottom-[calc(1rem+env(safe-area-inset-bottom))]",
      "right-4",
      "z-40",
    );
    expect(screen.getByText("Imprimir")).toHaveClass("hidden", "sm:inline");
  });

  it("keeps the print action floating above the reserved document edge", () => {
    render(<SharedQuoteView quote={makeQuote()} token="token-123" />);

    const printControl = screen.getByRole("button", { name: "Imprimir documento" });
    expect(printControl).toHaveClass("fixed", "sm:bottom-5", "sm:right-5", "z-40");
    expect(printControl.parentElement).toHaveClass(
      "pb-[calc(4.75rem+env(safe-area-inset-bottom))]",
      "sm:pb-20",
      "print:pb-0",
    );
  });

  it("uses the neutral outline variant instead of the primary acceptance treatment", () => {
    render(<SharedQuoteView quote={makeQuote()} token="token-123" />);

    const printControl = screen.getByRole("button", { name: "Imprimir documento" });
    expect(printControl).toHaveClass(
      "border",
      "border-[var(--color-border-light)]",
      "bg-[var(--color-surface)]",
      "text-[var(--color-text-main)]",
      "shadow-lg",
    );
    expect(printControl).not.toHaveClass("bg-[image:var(--gradient-primary)]");
  });

  it("prints the public quote in the current tab", async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);

    render(<SharedQuoteView quote={makeQuote()} token="token-123" />);

    await user.click(screen.getByRole("button", { name: "Imprimir documento" }));

    expect(print).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Imprimir documento" })).not.toHaveAttribute("target");
    print.mockRestore();
  });

  it("keeps the print control interactive for a completed public note", async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);

    render(
      <SharedQuoteView
        quote={makeQuote(QuoteStatus.APPROVED, WorkOrderStatus.COMPLETED)}
        token="token-123"
        isNote
      />,
    );

    await user.click(screen.getByRole("button", { name: "Imprimir documento" }));

    expect(print).toHaveBeenCalledOnce();
    print.mockRestore();
  });

  it("renders accessible compact item details below the table breakpoint", () => {
    render(<SharedQuoteView quote={makeMultiSectionQuote()} token="token-123" />);

    const compactItems = screen.getByTestId("quote-compact-items");
    expect(compactItems).toHaveClass("md:hidden", "print:hidden");
    expect(within(compactItems).getByRole("list", { name: "Aceite y filtros conceptos" })).toBeInTheDocument();
    expect(within(compactItems).getByText("Cambio de aceite").closest("li")).toHaveTextContent("Cambio de aceite");
    expect(within(compactItems).getByText("Cambio de aceite").closest("li")).toHaveTextContent("$40.00");

    expect(screen.getByTestId("quote-items-table")).toHaveClass("sr-only", "md:not-sr-only", "print:not-sr-only");
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();
    expect(screen.getByTestId("quote-items-table")).not.toHaveClass("border", "rounded-[var(--radius-sm)]");
    expect(table.querySelector("tbody")).toHaveClass("divide-y-0");
    expect(within(table).getByRole("columnheader", { name: "Cant." }).closest("tr")).not.toHaveClass("border-b");
    expect(within(table).getByText("Aceite y filtros").closest("tr")).not.toHaveClass("border-b");
    expect(within(table).getByRole("columnheader", { name: "Cant." })).toHaveClass("py-1.5", "print:py-1");
    expect(within(table).getByText("Cambio de aceite").closest("td")).toHaveClass("py-1.5", "print:py-1");
  });

  it("renders root and section concepts exactly once in the print document", () => {
    const quote = makeMultiSectionQuote();
    quote.sections[0]!.items[0]!.description = "Concepto repetido";
    quote.items = [{
      id: "root-item-1",
      quoteId: quote.id,
      sectionId: null,
      type: "LABOR",
      description: "Concepto repetido",
      quantity: "1",
      unitPriceCents: 2_000,
      totalCents: 2_000,
      includeInPayroll: false,
      customRatePercent: null,
      customPayrollBaseCents: null,
      sortOrder: 0,
    }, ...quote.sections.flatMap((section) => section.items)];

    render(<SharedQuoteView quote={quote} token="" isPrint />);

    const table = screen.getByTestId("quote-items-table");
    expect(within(table).getAllByText("Concepto repetido")).toHaveLength(2);
    expect(within(table).getAllByText("Cambio de balatas")).toHaveLength(1);
    expect(table).not.toHaveClass("hidden", "print:block");
    expect(screen.getByTestId("quote-total")).toHaveTextContent("$139.20");
  });

  it("renders a root-only print fixture", () => {
    render(<SharedQuoteView quote={makeQuote()} token="" isPrint />);

    const table = screen.getByTestId("quote-items-table");
    expect(within(table).getAllByText("Mano de obra")).toHaveLength(1);
    expect(table).toHaveClass("overflow-x-auto", "print:overflow-visible");
    expect(table).not.toHaveClass("border", "rounded-[var(--radius-sm)]");
    expect(table.querySelector("tbody")).toHaveClass("divide-y-0", "print:table-row-group");
    expect(table.querySelector("tbody")).not.toHaveClass("divide-y");
    expect(within(table).getByRole("columnheader", { name: "Cant." })).toHaveClass("print:py-1");
    expect(screen.getByTestId("quote-total")).toHaveTextContent("$116.00");
  });

  it("uses compact typography and row spacing for printed concepts", () => {
    render(<SharedQuoteView quote={makeQuote()} token="" isPrint />);

    const tableContainer = screen.getByTestId("quote-items-table");
    const table = screen.getByRole("table");
    expect(table).toHaveClass("print:text-[11px]", "print:leading-tight");
    expect(tableContainer).not.toHaveClass("print:border-gray-200", "print:rounded-[var(--radius-sm)]");
    expect(table.querySelector("tbody")).not.toHaveClass("print:divide-blue-100");
    expect(within(table).getByRole("columnheader", { name: "Cant." }).closest("tr")).not.toHaveClass("print:border-gray-200");
    expect(within(table).getByText("Mano de obra").closest("td")).toHaveClass("print:py-1");
  });

  it.each([
    [undefined, "Aceptada"],
    [WorkOrderStatus.ASSIGNED, "Orden asignada / En proceso"],
    [WorkOrderStatus.IN_PROGRESS, "Orden asignada / En proceso"],
    [WorkOrderStatus.COMPLETED, "Finalizada"],
  ])("derives approved progress from work order status %s", (workOrderStatus, currentStage) => {
    render(<SharedQuoteView quote={makeQuote(QuoteStatus.APPROVED, workOrderStatus)} token="token-123" />);
    const progress = screen.getByRole("list", { name: "Progreso de la cotización" });
    expect(within(progress).getByText(currentStage)).toHaveAttribute("aria-current", "step");
  });

  it("keeps final status as secondary feedback without decision controls", () => {
    render(<SharedQuoteView quote={makeQuote(QuoteStatus.APPROVED)} token="token-123" />);

    expect(screen.getByRole("heading", { name: "Servicio general" })).toBeInTheDocument();
    expect(screen.getAllByText(/Aceptada/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole("button", { name: "Aceptar cotización" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Declinar cotización" })).not.toBeInTheDocument();
  });

  it("does not expose customer decisions for an active work order link", () => {
    render(<SharedQuoteView quote={makeQuote(QuoteStatus.APPROVED, WorkOrderStatus.ASSIGNED)} token="token-123" />);

    expect(screen.getByRole("list", { name: "Progreso de la cotización" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aceptar cotización" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Declinar cotización" })).not.toBeInTheDocument();
  });

  it("shows all sections with authorization status after partial approval", () => {
    render(<SharedQuoteView quote={makePartiallyAuthorizedQuote(QuoteStatus.APPROVED)} token="token-123" />);

    const table = screen.getByRole("table");
    expect(within(table).getByText("Cambio de aceite")).toBeInTheDocument();
    const pendingItem = within(table).getByText("Cambio de balatas").closest("tr");
    if (!pendingItem) throw new Error("Pending section item row was not rendered.");
    expect(pendingItem).toHaveClass("opacity-40");
    expect(screen.getAllByText("Autorizada")).toHaveLength(2);
    expect(screen.queryByTestId("section-toggle-sec-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("section-toggle-sec-2")).not.toBeInTheDocument();
  });

  it("accepts the full quote and shows the success state", async () => {
    const user = userEvent.setup();
    acceptSharedQuoteActionMock.mockResolvedValue({ success: true });

    render(<SharedQuoteView quote={makeQuote()} token="token-123" />);

    await user.click(screen.getByRole("button", { name: "Aceptar cotización" }));

    expect(acceptSharedQuoteActionMock).toHaveBeenCalledWith("token-123", []);
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

  describe("partial authorization by sections", () => {
    it("selects all sections by default for pending sent quotes", () => {
      render(<SharedQuoteView quote={makeMultiSectionQuote(QuoteStatus.SENT)} token="token-123" />);

      expect(screen.getByTestId("section-toggle-sec-1")).toBeChecked();
      expect(screen.getByTestId("section-toggle-sec-2")).toBeChecked();
      expect(screen.getByRole("button", { name: "Aceptar cotización" })).toBeInTheDocument();
      expect(screen.getByTestId("quote-total")).toHaveTextContent("$116.00");
    });

    it("allows the customer to uncheck a section and accept partially", async () => {
      const user = userEvent.setup();
      render(<SharedQuoteView quote={makeMultiSectionQuote(QuoteStatus.SENT)} token="token-123" />);

      await user.click(screen.getByTestId("section-toggle-sec-2"));

      expect(screen.getByTestId("section-toggle-sec-1")).toBeChecked();
      expect(screen.getByTestId("section-toggle-sec-2")).not.toBeChecked();
      expect(screen.getByRole("button", { name: "Aceptar 1 sección" })).toBeInTheDocument();
      expect(screen.getByTestId("quote-total")).toHaveTextContent("$46.40");
    });

    it("disables accept when every section is unchecked", async () => {
      const user = userEvent.setup();
      render(<SharedQuoteView quote={makeMultiSectionQuote(QuoteStatus.SENT)} token="token-123" />);

      await user.click(screen.getByTestId("section-toggle-sec-1"));
      await user.click(screen.getByTestId("section-toggle-sec-2"));

      const accept = screen.getByRole("button", { name: "Seleccione al menos una sección" });
      expect(accept).toBeDisabled();
    });

    it("sends selected section ids when accepting", async () => {
      const user = userEvent.setup();
      acceptSharedQuoteActionMock.mockResolvedValue({ success: true });

      render(<SharedQuoteView quote={makeMultiSectionQuote(QuoteStatus.SENT)} token="token-123" />);

      await user.click(screen.getByTestId("section-toggle-sec-2"));
      await user.click(screen.getByRole("button", { name: "Aceptar 1 sección" }));

      expect(acceptSharedQuoteActionMock).toHaveBeenCalledWith("token-123", ["sec-1"]);
    });

    it("selects only authorized sections when quote is already APPROVED", () => {
      render(<SharedQuoteView quote={makePartiallyAuthorizedQuote(QuoteStatus.APPROVED)} token="token-123" />);

      expect(screen.getByTestId("quote-total")).toHaveTextContent("$46.40");
      expect(screen.getByText(/Total correspondiente únicamente a los conceptos autorizados/)).toBeInTheDocument();
      expect(screen.getAllByText("Autorizada")).toHaveLength(2);
    });

    it("selects every section for legacy quotes without authorization state", () => {
      render(<SharedQuoteView quote={makeLegacyMultiSectionQuote()} token="token-123" />);

      expect(screen.getByTestId("section-toggle-sec-1")).toBeChecked();
      expect(screen.getByTestId("section-toggle-sec-2")).toBeChecked();
      expect(screen.getByRole("button", { name: "Aceptar cotización" })).toBeInTheDocument();
      expect(screen.getByTestId("quote-total")).toHaveTextContent("$116.00");
    });

    it("renders complete totals and hides decision controls in isPrint mode", () => {
      render(<SharedQuoteView quote={makePartiallyAuthorizedQuote()} token="" isPrint={true} />);

      expect(screen.getByTestId("quote-total")).toHaveTextContent("$116.00");
      expect(screen.queryByRole("button", { name: /Aceptar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Declinar/i })).not.toBeInTheDocument();
      expect(screen.queryByTestId("section-toggle-sec-1")).not.toBeInTheDocument();
    });

    it("keeps table context together for long print output", () => {
      render(<SharedQuoteView quote={makeMultiSectionQuote()} token="" isPrint={true} />);

      const table = screen.getByRole("table");
      expect(screen.queryByTestId("quote-compact-items")).not.toBeInTheDocument();
      expect(within(table).getAllByText("Cambio de aceite")).toHaveLength(1);
      expect(within(table).getAllByText("Cambio de balatas")).toHaveLength(1);
      expect(screen.getByTestId("quote-total")).toHaveTextContent("$116.00");
      expect(table.querySelector("thead")).toHaveClass("print:table-header-group");
      expect(screen.getByText("Aceite y filtros").closest("tr")).toHaveClass("print:break-after-avoid");
      expect(screen.getByText("Cambio de aceite").closest("tr")).toHaveClass("print:break-before-avoid", "print:break-inside-avoid");
      expect(screen.getByTestId("quote-totals-block")).toHaveClass("print:break-inside-avoid");
    });

    it("hides decision controls when isNote is true", () => {
      render(<SharedQuoteView quote={makeQuote(QuoteStatus.SENT)} token="token-123" isNote={true} />);

      expect(screen.queryByRole("button", { name: /Aceptar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Declinar/i })).not.toBeInTheDocument();
    });

    it("hides decision controls when quote is locked", () => {
      const quote = {
        ...makeQuote(QuoteStatus.SENT),
        isLocked: true,
      };
      render(<SharedQuoteView quote={quote} token="token-123" />);

      expect(screen.queryByRole("button", { name: /Aceptar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Declinar/i })).not.toBeInTheDocument();
    });

  it("renders paymentDueDate when in note mode", () => {
      const quote = {
        ...makeQuote(QuoteStatus.APPROVED, WorkOrderStatus.COMPLETED),
        paymentDueDate: new Date("2026-09-30T00:00:00.000Z"),
      };
      render(<SharedQuoteView quote={quote} token="token-123" isNote={true} />);

      expect(screen.getByTestId("note-due-date")).toBeInTheDocument();
      expect(screen.getByText(/Fecha de vencimiento de pago/i)).toBeInTheDocument();
      expect(screen.queryByTestId("quote-validity")).not.toBeInTheDocument();
    });
  });

  it("exposes only note payment data and keeps account text selectable in print mode", () => {
    const bankAccounts = [{
      id: 1,
      accountHolder: "SEBASAM",
      bankName: "Santander",
      accountNumber: "1234 5678",
      clabe: "012345678901234567",
    }];

    const { rerender } = render(
      <SharedQuoteView
        quote={makeQuote(QuoteStatus.APPROVED, WorkOrderStatus.COMPLETED)}
        token="token-123"
        isNote
        bankAccounts={bankAccounts}
      />,
    );

    expect(screen.getByTestId("note-payment-data")).toBeInTheDocument();
    expect(screen.getByText("1234 5678")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /copiar/i })).toHaveLength(2);

    rerender(
      <SharedQuoteView
        quote={makeQuote(QuoteStatus.APPROVED, WorkOrderStatus.COMPLETED)}
        token=""
        isNote
        isPrint
        bankAccounts={bankAccounts}
      />,
    );

    expect(screen.getByText("1234 5678")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /copiar/i })[0]).toHaveClass("print:hidden");
  });
});
