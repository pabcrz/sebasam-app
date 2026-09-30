import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CustomerDetailedStatement } from "../customer-statement-queries";
import { CustomerStatementView } from "./customer-statement-view";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/features/payments/actions", () => ({
  applyCustomerCreditAction: vi.fn(),
}));

describe("CustomerStatementView", () => {
  const baseStatement: CustomerDetailedStatement = {
    customer: {
      id: "cust-1",
      name: "Transportes del Norte",
      commercialName: "Transportes del Norte S.A.",
      legalName: "Transportes del Norte S.A. de C.V.",
      email: "contacto@tdn.com",
      phone: "5551234567",
      address: "Av. Central 123",
      rfc: "TDN010101ABC",
    },
    emissionDate: new Date("2026-08-15T18:00:00Z"),
    view: "pending",
    period: "month",
    anchor: "2026-08",
    rangeLabel: "Cartera pendiente",
    availableCreditCents: 15000, // $150.00
    summary: {
      initialBalanceCents: 0,
      periodChargesCents: 20000,
      periodPaymentsCents: 0,
      finalBalanceCents: 20000,
      overdueBalanceCents: 0,
    },
    notes: [
      {
        id: "wo-1",
        number: "OT-001",
        workOrderId: "wo-1",
        quoteId: "q-1",
        completedAt: new Date("2026-08-01T18:00:00Z"),
        paymentDueDate: new Date("2026-08-20T18:00:00Z"),
        concepts: "Servicio mayor de frenos",
        vehicleLabel: "Kenworth T680",
        totalCents: 20000,
        paidCents: 0,
        paidCentsAtCutoff: 0,
        remainingCents: 20000,
        paymentState: {
          label: "Vencida",
          balanceCents: 20000,
          variant: "danger",
        },
        previewQuote: {
          id: "q-1",
          number: "COT-001",
          title: "Servicio mayor de frenos",
          description: null,
          administrative: false,
          vehicleSnapshot: null,
          subtotalCents: 20000,
          discountCents: 0,
          taxCents: 0,
          totalCents: 20000,
          paidCents: 0,
          remainingCents: 20000,
          validUntil: new Date("2026-08-30T18:00:00Z"),
          customer: { name: "Transportes del Norte S.A." },
          vehicle: null,
          workOrder: { id: "wo-1", status: "COMPLETED" },
          items: [],
          sections: [],
        },
      },
    ],
    business: {
      name: "SEBASAM",
      fullName: "Servicio Básico a Suspensiones y Aire y Muelles",
      address: "Calle Taller 100",
      contactPhone: "5550001122",
      contactWhatsapp: "5550001133",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders customer details, financial cards, and table of notes", () => {
    render(<CustomerStatementView statement={baseStatement} />);

    expect(screen.getByRole("heading", { name: "Transportes del Norte S.A." })).toBeInTheDocument();
    expect(screen.getByText(/RFC: TDN010101ABC/i)).toBeInTheDocument();
    expect(screen.getByText("OT-001")).toBeInTheDocument();
    expect(screen.getByText("Servicio mayor de frenos")).toBeInTheDocument();
    expect(screen.getByText("Kenworth T680")).toBeInTheDocument();
  });

  it("renders available credit banner and apply credit button when credit is available", () => {
    render(<CustomerStatementView statement={baseStatement} />);

    // Credit banner is present
    const banner = screen.getByTestId("customer-available-credit-banner");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent("$150.00");

    // "Aplicar saldo" button is rendered for the pending note
    const applyButton = screen.getByRole("button", { name: /aplicar saldo a favor a nota ot-001/i });
    expect(applyButton).toBeInTheDocument();
  });

  it("does not render credit banner or apply credit button when availableCreditCents is 0", () => {
    const noCreditStatement = {
      ...baseStatement,
      availableCreditCents: 0,
    };

    render(<CustomerStatementView statement={noCreditStatement} />);

    expect(screen.queryByTestId("customer-available-credit-banner")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /aplicar saldo a favor a nota ot-001/i })).not.toBeInTheDocument();
  });

  it("opens note preview dialog when clicking a note row", async () => {
    const user = userEvent.setup();
    render(<CustomerStatementView statement={baseStatement} />);

    await user.click(screen.getByTestId("statement-note-OT-001"));

    // Dialog preview header should appear
    expect(screen.getByRole("heading", { name: /cotización cot-001/i })).toBeInTheDocument();
  });

  it("does not render WhatsApp copy button and keeps Imprimir / PDF button accessible", () => {
    render(<CustomerStatementView statement={baseStatement} />);

    expect(screen.queryByRole("button", { name: /whatsapp/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copiar/i })).not.toBeInTheDocument();

    const printButton = screen.getByRole("button", { name: /imprimir estado de cuenta/i });
    expect(printButton).toBeInTheDocument();
    expect(printButton).toHaveClass("min-h-[44px]");
  });

  it("renders a concise print projection with pending status and reconciled note amounts", () => {
    render(<CustomerStatementView statement={baseStatement} />);

    const printProjection = screen.getByTestId("customer-statement-print");
    expect(printProjection).toHaveClass("hidden", "print:block");
    expect(within(printProjection).getByText("Servicio mayor de frenos")).toBeInTheDocument();
    expect(within(printProjection).getByText("Pendiente")).toBeInTheDocument();
    expect(within(printProjection).getByText("Abono")).toBeInTheDocument();
    expect(within(printProjection).getByText("Total")).toBeInTheDocument();
    expect(within(printProjection).getByText("$0.00")).toBeInTheDocument();
    expect(within(printProjection).getAllByText("$200.00")).toHaveLength(2);
    expect(within(printProjection).getByText("Total de notas")).toBeInTheDocument();
    expect(within(printProjection).getByText("Abonado al 15 de agosto de 2026")).toBeInTheDocument();
    expect(within(printProjection).getByText("Saldo restante")).toBeInTheDocument();
    expect(within(printProjection).queryByText(/Folio|Vehículo|Acciones|Vencida/)).not.toBeInTheDocument();
  });

  it("keeps partial and overdue notes pending in the customer-facing print projection", () => {
    const partiallyPaidStatement: CustomerDetailedStatement = {
      ...baseStatement,
      notes: [
        {
          ...baseStatement.notes[0],
          paidCents: 5000,
          paidCentsAtCutoff: 5000,
          remainingCents: 15000,
          paymentState: { label: "Vencida", balanceCents: 15000, variant: "danger" },
        },
        {
          ...baseStatement.notes[0],
          id: "wo-paid",
          number: "OT-002",
          concepts: "Servicio pagado",
          totalCents: 30000,
          paidCents: 30000,
          paidCentsAtCutoff: 30000,
          remainingCents: 0,
          paymentState: { label: "Pagada", balanceCents: 0, variant: "success" },
        },
      ],
    };

    render(<CustomerStatementView statement={partiallyPaidStatement} />);

    const printProjection = screen.getByTestId("customer-statement-print");
    expect(within(printProjection).getByText("Pendiente")).toBeInTheDocument();
    expect(within(printProjection).getByText("Pagada")).toBeInTheDocument();
    expect(within(printProjection).queryByText("Vencida")).not.toBeInTheDocument();
    expect(within(printProjection).getByText("$50.00")).toBeInTheDocument();
    expect(within(printProjection).getByText("$200.00")).toBeInTheDocument();
    expect(within(printProjection).getByText("$500.00")).toBeInTheDocument();
    expect(within(printProjection).getByText("$350.00")).toBeInTheDocument();
    expect(within(printProjection).getByText("$150.00")).toBeInTheDocument();
  });

  it("renders table with colgroup summing to 100%, repeating header group, and mobile scroll with print-overflow-visible", () => {
    const { container } = render(<CustomerStatementView statement={baseStatement} />);

    // Table container maintains overflow-x-auto and adds print:overflow-visible
    const tableScrollWrapper = container.querySelector(".overflow-x-auto");
    expect(tableScrollWrapper).toBeInTheDocument();
    expect(tableScrollWrapper).toHaveClass("print:overflow-visible");

    // Table has fixed layout on print
    const table = container.querySelector("table");
    expect(table).toHaveClass("print:table-fixed");

    // Thead has print:table-header-group
    const thead = container.querySelector("thead");
    expect(thead).toHaveClass("print:table-header-group");

    // Colgroup has 9 columns summing to exactly 100%
    const cols = container.querySelectorAll("colgroup col");
    expect(cols).toHaveLength(9);
    const widths = Array.from(cols).map((col) => col.className);
    expect(widths).toEqual([
      "w-[8%]",
      "w-[9%]",
      "w-[9%]",
      "w-[22%]",
      "w-[15%]",
      "w-[9%]",
      "w-[9%]",
      "w-[9%]",
      "w-[10%]",
    ]);
  });
});
