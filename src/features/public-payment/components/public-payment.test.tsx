import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaymentRequestStatus } from "@prisma/client";
import { InvoiceDecision } from "./invoice-decision";
import { FiscalDataForm } from "./fiscal-data-form";
import { BankDataCard } from "./bank-data-card";
import { ContactCard } from "./contact-card";
import { WhatsAppReceiptCta } from "./whatsapp-receipt-cta";
import { PaymentRequestErrorState } from "./payment-request-error-state";
import { PublicPaymentPage } from "./public-payment-page";

function createMockRequest(overrides: { status?: PaymentRequestStatus; requiresInvoice?: boolean } = {}) {
  return {
    id: "pr-123",
    token: "token-123",
    status: overrides.status ?? PaymentRequestStatus.PENDING,
    customerId: "customer-123",
    quoteId: null,
    workOrderId: null,
    requiresInvoice: overrides.requiresInvoice ?? false,
    customerFiscalProfileId: null,
    fiscalSnapshot: null,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    viewedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    customer: { id: "customer-123", name: "Test Customer" },
    quote: { id: "quote-123", number: "Q-001", totalCents: 400000 },
    workOrder: null,
    customerFiscalProfile: null,
  };
}

describe("InvoiceDecision", () => {
  it("calls onDecision(false) when payment-only option is selected", async () => {
    const user = userEvent.setup();
    const onDecision = vi.fn();
    render(<InvoiceDecision onDecision={onDecision} />);

    await user.click(screen.getByRole("button", { name: /solo datos de pago/i }));

    expect(onDecision).toHaveBeenCalledWith(false);
  });

  it("calls onDecision(true) when invoice option is selected", async () => {
    const user = userEvent.setup();
    const onDecision = vi.fn();
    render(<InvoiceDecision onDecision={onDecision} />);

    await user.click(screen.getByRole("button", { name: /requiero factura/i }));

    expect(onDecision).toHaveBeenCalledWith(true);
  });

  it("disables buttons while pending", () => {
    render(<InvoiceDecision onDecision={vi.fn()} isPending />);

    expect(screen.getByRole("button", { name: /solo datos de pago/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /requiero factura/i })).toBeDisabled();
  });
});

describe("FiscalDataForm", () => {
  it("submits required fields when valid", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue(undefined);
    render(<FiscalDataForm action={action} />);

    await user.type(screen.getByLabelText(/nombre completo/i), "Juan Pérez");
    await user.type(screen.getByLabelText(/rfc/i), "PEPJ800101ABC");
    await user.type(screen.getByLabelText(/régimen fiscal/i), "612");
    await user.type(screen.getByLabelText(/uso de cfdi/i), "G03");
    await user.type(screen.getByLabelText(/código postal fiscal/i), "01000");
    await user.click(screen.getByRole("button", { name: /guardar datos fiscales/i }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));

    const formData = action.mock.calls[0][0] as FormData;
    expect(formData.get("personType")).toBe("INDIVIDUAL");
    expect(formData.get("businessName")).toBe("Juan Pérez");
    expect(formData.get("taxId")).toBe("PEPJ800101ABC");
    expect(formData.get("taxRegime")).toBe("612");
    expect(formData.get("cfdiUse")).toBe("G03");
    expect(formData.get("zipCode")).toBe("01000");
  });

  it("switches person type to BUSINESS and updates label", async () => {
    const user = userEvent.setup();
    render(<FiscalDataForm action={vi.fn()} />);

    await user.click(screen.getByRole("tab", { name: /empresa/i }));

    expect(screen.getByLabelText(/razón social/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/nombre completo/i)).not.toBeInTheDocument();
  });

  it("displays server error when provided", () => {
    render(<FiscalDataForm action={vi.fn()} serverError="RFC inválido" />);

    expect(screen.getByRole("alert")).toHaveTextContent("RFC inválido");
  });
});

describe("BankDataCard", () => {
  it("renders bank details and copy buttons", () => {
    render(<BankDataCard />);

    expect(screen.getByText("Titular")).toBeInTheDocument();
    expect(screen.getByText("Banco")).toBeInTheDocument();
    expect(screen.getByText("No. Cuenta")).toBeInTheDocument();
    expect(screen.getByText("CLABE")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /copiar/i })).toHaveLength(2);
  });
});

describe("ContactCard", () => {
  it("renders phone and whatsapp", () => {
    render(<ContactCard />);

    expect(screen.getByText("Teléfono fijo")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
  });
});

describe("WhatsAppReceiptCta", () => {
  it("renders WhatsApp link with reference", () => {
    render(<WhatsAppReceiptCta reference="Q-001" />);

    const link = screen.getByRole("link", { name: /enviar whatsapp/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("wa.me"));
    expect(link).toHaveAttribute("href", expect.stringContaining("Q-001"));
    expect(link).toHaveAttribute("target", "_blank");
  });
});

describe("PaymentRequestErrorState", () => {
  it.each([
    ["not-found", "Enlace no válido"],
    ["expired", "Enlace vencido"],
    ["cancelled", "Enlace cancelado"],
  ] as const)("renders %s state", (type, title) => {
    render(<PaymentRequestErrorState type={type} />);

    expect(screen.getByRole("heading")).toHaveTextContent(title);
  });
});

describe("PublicPaymentPage", () => {
  it("shows decision when request is pending", () => {
    render(
      <PublicPaymentPage
        request={createMockRequest({ status: PaymentRequestStatus.PENDING })}
        setInvoicePreferenceAction={vi.fn()}
        saveFiscalDataAction={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: /qué necesitas compartir/i })).toBeInTheDocument();
  });

  it("shows fiscal form when invoice is required", () => {
    render(
      <PublicPaymentPage
        request={createMockRequest({ status: PaymentRequestStatus.FISCAL_DATA_REQUIRED, requiresInvoice: true })}
        setInvoicePreferenceAction={vi.fn()}
        saveFiscalDataAction={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: /captura de datos fiscales/i })).toBeInTheDocument();
  });

  it("shows payment data when ready to pay", () => {
    render(
      <PublicPaymentPage
        request={createMockRequest({ status: PaymentRequestStatus.READY_TO_PAY })}
        setInvoicePreferenceAction={vi.fn()}
        saveFiscalDataAction={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: /datos de pago/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /enviar comprobante/i })).toBeInTheDocument();
  });

  it("submits invoice preference and displays returned error", async () => {
    const user = userEvent.setup();
    const setInvoicePreferenceAction = vi.fn().mockResolvedValue({ success: false, error: "Token vencido" });

    render(
      <PublicPaymentPage
        request={createMockRequest({ status: PaymentRequestStatus.PENDING })}
        setInvoicePreferenceAction={setInvoicePreferenceAction}
        saveFiscalDataAction={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /requiero factura/i }));

    await waitFor(() => expect(setInvoicePreferenceAction).toHaveBeenCalledWith(true));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Token vencido"));
  });
});
