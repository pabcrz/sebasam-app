import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { CustomerStatementView } from "@/features/customers/components/customer-statement-view";
import type { CustomerDetailedStatement } from "@/features/customers/customer-statement-queries";
import CustomerStatementPage from "./page";

const { printDocumentUrl, requireOperationalRoleMock, getCustomerDetailedStatementMock } = vi.hoisted(() => ({
  printDocumentUrl: vi.fn(),
  requireOperationalRoleMock: vi.fn(),
  getCustomerDetailedStatementMock: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireOperationalRole: requireOperationalRoleMock,
  isAdminRole: (role: string | null | undefined) => role === "ADMIN" || role === "SUPER_ADMIN",
}));

vi.mock("@/features/customers/customer-statement-queries", () => ({
  getCustomerDetailedStatement: getCustomerDetailedStatementMock,
}));

vi.mock("@/features/payments/actions", () => ({
  applyCustomerCreditAction: vi.fn(),
  recordPaymentAction: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/features/quotes/components/quote-preview-dialog", () => ({
  QuotePreviewDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="quote-preview-dialog">Modal de Cotización</div> : null,
}));

vi.mock("@/features/quotes/lib/print-document", () => ({ printDocumentUrl }));

describe("CustomerStatementView", () => {
  const mockStatement: CustomerDetailedStatement = {
    customer: {
      id: "cust-1",
      name: "Transportes del Norte",
      commercialName: "Transportes del Norte S.A.",
      legalName: "Transportes del Norte S.A. de C.V.",
      email: "contacto@tdn.com",
      phone: "5551234567",
      address: "Av. Industrial 500",
      rfc: "TDN900101XYZ",
    },
    emissionDate: new Date("2026-08-15T18:00:00Z"),
    view: "pending",
    period: "month",
    anchor: "2026-08-15",
    rangeLabel: "Cartera pendiente",
    availableCreditCents: 0,
    availableCreditAtCutoffCents: 0,
    paymentActivity: [],
    summary: {
      initialBalanceCents: 0,
      periodChargesCents: 150000,
      periodPaymentsCents: 50000,
      finalBalanceCents: 100000,
      overdueBalanceCents: 100000,
    },
    notes: [
      {
        id: "wo-1",
        number: "OT-001",
        workOrderId: "wo-1",
        quoteId: "q-1",
        completedAt: new Date("2026-08-01T18:00:00Z"),
        paymentDueDate: new Date("2026-08-08T18:00:00Z"),
        concepts: "Cambiar muelles · Alinear eje",
        vehicleLabel: "ECO: 101 · Kenworth T680 · Placas: 12-AA-3B",
        totalCents: 150000,
        paidCents: 50000,
        paidCentsAtCutoff: 50000,
        remainingCents: 100000,
        paymentState: {
          label: "Vencida",
          balanceCents: 100000,
          variant: "danger",
        },
        previewQuote: {
          id: "q-1",
          number: "COT-001",
          title: "Cotización 1",
          description: null,
          administrative: false,
          vehicleSnapshot: null,
          subtotalCents: 150000,
          discountCents: 0,
          taxCents: 0,
          totalCents: 150000,
          paidCents: 50000,
          remainingCents: 100000,
          validUntil: new Date("2026-09-01T00:00:00Z"),
          customer: { name: "Transportes del Norte S.A." },
          vehicle: null,
          items: [],
          sections: [],
        },
      },
    ],
    business: {
      name: "SEBASAM",
      fullName: "Servicio Básico a Suspensiones y Aire y Muelles",
      address: "Batalla de Casa Blanca 1719B",
      contactPhone: "5556007675",
      contactWhatsapp: "5536239346",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    printDocumentUrl.mockResolvedValue(undefined);
  });

  it("renders statement header, customer info, and pending notes", () => {
    render(<CustomerStatementView statement={mockStatement} />);

    expect(screen.getAllByText("Transportes del Norte S.A.")).toHaveLength(2);
    expect(screen.getAllByText(/Razón social: Transportes del Norte S.A. de C.V./)).toHaveLength(2);
    expect(screen.getByText("RFC: TDN900101XYZ")).toBeInTheDocument();

    // Notes table
    expect(screen.getAllByText("OT-001")).toHaveLength(2);
    expect(screen.getAllByText("Cambiar muelles · Alinear eje")).toHaveLength(3);
    expect(screen.getAllByText(/ECO: 101 · Kenworth T680/)).toHaveLength(2);
    const noteRow = screen.getByTestId("statement-note-OT-001");
    expect(within(noteRow).getByText("$1,500.00")).toBeInTheDocument(); // total
    expect(within(noteRow).getByText("$500.00")).toBeInTheDocument(); // paid
    expect(within(noteRow).getByText("$1,000.00")).toBeInTheDocument(); // remaining
    expect(screen.getAllByText("Vencida")).toHaveLength(2);

    expect(screen.queryByText("BBVA")).not.toBeInTheDocument();
    expect(screen.queryByText(/012180000000000000|1234567890/)).not.toBeInTheDocument();
  });

  it("opens QuotePreviewDialog when clicking note row", () => {
    render(<CustomerStatementView statement={mockStatement} />);

    expect(screen.queryByTestId("quote-preview-dialog")).not.toBeInTheDocument();

    const noteRow = screen.getByTestId("statement-note-OT-001");
    fireEvent.click(noteRow);

    expect(screen.getByTestId("quote-preview-dialog")).toBeInTheDocument();
  });

  it.each(["ADMIN", "SUPER_ADMIN"])("passes the payment action for the %s role", async (role) => {
    requireOperationalRoleMock.mockResolvedValue({ profile: { role } });
    getCustomerDetailedStatementMock.mockResolvedValue(mockStatement);

    render(
      await CustomerStatementPage({
        params: Promise.resolve({ id: "cust-1" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getAllByRole("button", { name: /registrar abono para ot-001/i })).toHaveLength(2);
  });

  it("does not pass the payment action to operational-only ADMIN_ASSISTANT", async () => {
    requireOperationalRoleMock.mockResolvedValue({ profile: { role: "ADMIN_ASSISTANT" } });
    getCustomerDetailedStatementMock.mockResolvedValue(mockStatement);

    render(
      await CustomerStatementPage({
        params: Promise.resolve({ id: "cust-1" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.queryByRole("button", { name: /registrar abono/i })).not.toBeInTheDocument();
  });

  it("prints a note without opening its row preview or rendering a view action", async () => {
    render(<CustomerStatementView statement={mockStatement} />);

    const noteRow = screen.getByTestId("statement-note-OT-001");
    expect(within(noteRow).queryByRole("button", { name: /ver detalle/i })).not.toBeInTheDocument();

    fireEvent.click(within(noteRow).getByRole("button", { name: "Imprimir nota OT-001" }));

    expect(screen.queryByTestId("quote-preview-dialog")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(printDocumentUrl).toHaveBeenCalledWith(
        "/admin/notas/wo-1/print?returnTo=%2Fadmin%2Fcustomers%2Fcust-1%2Festado-de-cuenta%3Fanchor%3D2026-08-15",
      );
    });
  });

  it("triggers window.print when print button is clicked", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<CustomerStatementView statement={mockStatement} />);

    const printButton = screen.getByRole("button", { name: "Imprimir estado de cuenta" });
    fireEvent.click(printButton);

    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });

  it("does not render WhatsApp copy button", () => {
    render(<CustomerStatementView statement={mockStatement} />);
    expect(screen.queryByRole("button", { name: "Copiar resumen para WhatsApp" })).not.toBeInTheDocument();
  });

  it("renders period accounting movements in history view", () => {
    const historyStatement: CustomerDetailedStatement = {
      ...mockStatement,
      view: "history",
      period: "month",
      rangeLabel: "agosto de 2026",
      summary: {
        initialBalanceCents: 50000,
        periodChargesCents: 150000,
        periodPaymentsCents: 70000,
        finalBalanceCents: 130000,
        overdueBalanceCents: 0,
      },
    };

    render(<CustomerStatementView statement={historyStatement} />);

    const initialCard = screen.getByText("Saldo inicial").closest("div");
    expect(within(initialCard!).getByText("$500.00")).toBeInTheDocument();
    expect(screen.getByText("Cargos del período")).toBeInTheDocument();
    expect(screen.getByText("+$1,500.00")).toBeInTheDocument();
    expect(screen.getByText("Abonos del período")).toBeInTheDocument();
    expect(screen.getByText("-$700.00")).toBeInTheDocument();
    expect(screen.getByText("Saldo final")).toBeInTheDocument();
    expect(screen.getByText("$1,300.00")).toBeInTheDocument();
  });
});
