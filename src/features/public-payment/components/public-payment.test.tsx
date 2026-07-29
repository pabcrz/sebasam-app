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
import { PublicPaymentShell } from "./public-payment-shell";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

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
    quote: {
      id: "quote-123",
      number: "Q-001",
      subtotalCents: 344828,
      taxCents: 55172,
      totalCents: 400000,
      taxEnabled: true,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
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
  it("renders bank details and copy buttons when no props (legacy fallback)", () => {
    render(<BankDataCard />);

    expect(screen.getByText("Titular")).toBeInTheDocument();
    expect(screen.getByText("Banco")).toBeInTheDocument();
    expect(screen.getByText("No. Cuenta")).toBeInTheDocument();
    expect(screen.getByText("CLABE")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /copiar/i })).toHaveLength(2);
  });

  it("shows empty state when bankAccounts is an explicit empty array", () => {
    render(<BankDataCard bankAccounts={[]} />);

    expect(screen.getByTestId("bank-data-empty")).toHaveTextContent(
      "No hay cuentas bancarias registradas.",
    );
    expect(screen.queryByText("Titular")).not.toBeInTheDocument();
    expect(screen.queryByText("No. Cuenta")).not.toBeInTheDocument();
    expect(screen.queryByText("CLABE")).not.toBeInTheDocument();
  });

  it("renders bank data from props", () => {
    render(
      <BankDataCard
        bankAccounts={[
          {
            id: 1,
            accountHolder: "Juan Pérez",
            bankName: "BBVA",
            accountNumber: "987654",
            clabe: "0123 4567 8901 2345",
          },
        ]}
      />,
    );

    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("BBVA")).toBeInTheDocument();
    expect(screen.getByText("987654")).toBeInTheDocument();
    expect(screen.getByText("0123 4567 8901 2345")).toBeInTheDocument();
  });

  it("only renders No. Cuenta row when account number is present and CLABE is empty", () => {
    render(
      <BankDataCard
        bankAccounts={[
          {
            id: 1,
            accountHolder: "Juan Pérez",
            bankName: "BBVA",
            accountNumber: "987654",
            clabe: "",
          },
        ]}
      />,
    );

    expect(screen.getByText("No. Cuenta")).toBeInTheDocument();
    expect(screen.getByText("987654")).toBeInTheDocument();
    expect(screen.queryByText("CLABE")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copiar/i })).toBeInTheDocument();
  });

  it("only renders CLABE row when CLABE is present and account number is empty", () => {
    render(
      <BankDataCard
        bankAccounts={[
          {
            id: 1,
            accountHolder: "Juan Pérez",
            bankName: "BBVA",
            accountNumber: "",
            clabe: "0123 4567 8901 2345",
          },
        ]}
      />,
    );

    expect(screen.getByText("CLABE")).toBeInTheDocument();
    expect(screen.getByText("0123 4567 8901 2345")).toBeInTheDocument();
    expect(screen.queryByText("No. Cuenta")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copiar/i })).toBeInTheDocument();
  });

  it("renders only holder and bank name when both account number and CLABE are empty", () => {
    render(
      <BankDataCard
        bankAccounts={[
          {
            id: 1,
            accountHolder: "Juan Pérez",
            bankName: "BBVA",
            accountNumber: "",
            clabe: "",
          },
        ]}
      />,
    );

    expect(screen.getByText("Titular")).toBeInTheDocument();
    expect(screen.getByText("Banco")).toBeInTheDocument();
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("BBVA")).toBeInTheDocument();
    expect(screen.queryByText("No. Cuenta")).not.toBeInTheDocument();
    expect(screen.queryByText("CLABE")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copiar/i })).not.toBeInTheDocument();
  });

  it("conditionally renders account number and CLABE across multiple accounts", () => {
    render(
      <BankDataCard
        bankAccounts={[
          {
            id: 1,
            accountHolder: "Federico Cruz",
            bankName: "Santander",
            accountNumber: "123456",
            clabe: "",
          },
          {
            id: 2,
            accountHolder: "Federico Cruz",
            bankName: "BBVA",
            accountNumber: "",
            clabe: "5555 5555 5555 5555",
          },
        ]}
      />,
    );

    // First account: account number only, no CLABE
    expect(screen.getByText("123456")).toBeInTheDocument();
    expect(screen.getByText("Santander")).toBeInTheDocument();

    // Second account: CLABE only, no account number
    expect(screen.getByText("5555 5555 5555 5555")).toBeInTheDocument();
    expect(screen.getByText("BBVA")).toBeInTheDocument();

    // Each account has one copy button
    const copyButtons = screen.getAllByRole("button", { name: /copiar/i });
    expect(copyButtons).toHaveLength(2);
  });
});

describe("ContactCard", () => {
  it("renders phone and whatsapp", () => {
    render(<ContactCard />);

    expect(screen.getByText("Teléfono fijo")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
  });

  it("renders contact data from props", () => {
    render(
      <ContactCard
        contact={{
          phone: "5511223344",
          whatsapp: "5544332211",
        }}
      />,
    );

    expect(screen.getByText("5511223344")).toBeInTheDocument();
    expect(screen.getByText("5544332211")).toBeInTheDocument();
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
    refresh.mockClear();

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
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refreshes server props after saving the invoice preference", async () => {
    const user = userEvent.setup();
    const setInvoicePreferenceAction = vi.fn().mockResolvedValue({ success: true });
    refresh.mockClear();

    render(
      <PublicPaymentPage
        request={createMockRequest({ status: PaymentRequestStatus.PENDING })}
        setInvoicePreferenceAction={setInvoicePreferenceAction}
        saveFiscalDataAction={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /solo datos de pago/i }));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });
});

describe("PublicPaymentShell", () => {
  it("renders the workshop address as a Google Maps link", () => {
    render(<PublicPaymentShell><p>content</p></PublicPaymentShell>);

    const link = screen.getByRole("link", { name: /Batalla de Casa Blanca/i });
    expect(link).toHaveAttribute("href", "https://maps.app.goo.gl/MYuGBKwabPGbea7y7");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders business data from props", () => {
    render(
      <PublicPaymentShell
        business={{
          name: "Taller Test",
          fullName: "Taller de Prueba SA de CV",
          address: "Calle Falsa 123, CDMX",
          mapsUrl: "https://maps.example.com/test",
        }}
      >
        <p>content</p>
      </PublicPaymentShell>,
    );

    expect(screen.getByRole("heading", { name: "Taller Test" })).toBeInTheDocument();
    expect(screen.getByText("Taller de Prueba SA de CV")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Calle Falsa 123/i });
    expect(link).toHaveAttribute("href", "https://maps.example.com/test");
  });

  it("passes business/bank/contact props through PublicPaymentPage to children", () => {
    const mockRequest = createMockRequest({ status: PaymentRequestStatus.READY_TO_PAY });
    render(
      <PublicPaymentPage
        request={mockRequest}
        setInvoicePreferenceAction={vi.fn()}
        saveFiscalDataAction={vi.fn()}
        business={{
          name: "Custom Business",
          fullName: "Custom Full Name",
          address: "Custom Address 456",
          mapsUrl: "https://maps.example.com/custom",
        }}
        bankAccounts={[
          {
            id: 1,
            accountHolder: "Custom Holder",
            bankName: "Custom Bank",
            accountNumber: "111111",
            clabe: "2222 2222 2222 2222",
          },
        ]}
        contact={{
          phone: "5500000000",
          whatsapp: "5511111111",
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Custom Business" })).toBeInTheDocument();
    expect(screen.getByText("Custom Holder")).toBeInTheDocument();
    expect(screen.getByText("Custom Bank")).toBeInTheDocument();
    expect(screen.getByText("5500000000")).toBeInTheDocument();
    expect(screen.getByText("5511111111")).toBeInTheDocument();
  });
});
