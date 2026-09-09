import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import { CustomerStatementView } from "@/features/customers/components/customer-statement-view";
import type { CustomerDetailedStatement } from "@/features/customers/customer-statement-queries";

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
    bankAccounts: [
      {
        id: 1,
        bankName: "BBVA",
        accountHolder: "SEBASAM",
        accountNumber: "1234567890",
        clabe: "012180000000000000",
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
  });

  it("renders statement header, customer info, and pending notes", () => {
    render(<CustomerStatementView statement={mockStatement} />);

    expect(screen.getByText("Transportes del Norte S.A.")).toBeInTheDocument();
    expect(screen.getByText(/Razón social: Transportes del Norte S.A. de C.V./)).toBeInTheDocument();
    expect(screen.getByText("RFC: TDN900101XYZ")).toBeInTheDocument();

    // Notes table
    expect(screen.getByText("OT-001")).toBeInTheDocument();
    expect(screen.getByText("Cambiar muelles · Alinear eje")).toBeInTheDocument();
    expect(screen.getByText(/ECO: 101 · Kenworth T680/)).toBeInTheDocument();
    const noteRow = screen.getByTestId("statement-note-OT-001");
    expect(within(noteRow).getByText("$1,500.00")).toBeInTheDocument(); // total
    expect(within(noteRow).getByText("$500.00")).toBeInTheDocument(); // paid
    expect(within(noteRow).getByText("$1,000.00")).toBeInTheDocument(); // remaining
    expect(screen.getByText("Vencida")).toBeInTheDocument();

    // Bank transfer details
    expect(screen.getByText("BBVA")).toBeInTheDocument();
    expect(screen.getByText(/CLABE: 012180000000000000/)).toBeInTheDocument();
  });

  it("opens QuotePreviewDialog when clicking note row", () => {
    render(<CustomerStatementView statement={mockStatement} />);

    expect(screen.queryByTestId("quote-preview-dialog")).not.toBeInTheDocument();

    const noteRow = screen.getByTestId("statement-note-OT-001");
    fireEvent.click(noteRow);

    expect(screen.getByTestId("quote-preview-dialog")).toBeInTheDocument();
  });

  it("triggers window.print when print button is clicked", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<CustomerStatementView statement={mockStatement} />);

    const printButton = screen.getByRole("button", { name: "Imprimir estado de cuenta" });
    fireEvent.click(printButton);

    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });

  it("copies WhatsApp summary to clipboard", async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextSpy },
    });

    render(<CustomerStatementView statement={mockStatement} />);

    const copyButton = screen.getByRole("button", { name: "Copiar resumen para WhatsApp" });
    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(writeTextSpy).toHaveBeenCalledTimes(1);
    const copiedText = writeTextSpy.mock.calls[0][0];
    expect(copiedText).toContain("*ESTADO DE CUENTA - SEBASAM*");
    expect(copiedText).toContain("OT-001");
    expect(copiedText).toContain("Cambiar muelles · Alinear eje");
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
