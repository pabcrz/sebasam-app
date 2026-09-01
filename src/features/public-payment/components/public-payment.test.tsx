import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BankDataCard } from "./bank-data-card";
import { ContactCard } from "./contact-card";
import { WhatsAppReceiptCta } from "./whatsapp-receipt-cta";
import { PaymentRequestErrorState } from "./payment-request-error-state";
import { PublicPaymentPage } from "./public-payment-page";
import { PublicPaymentShell } from "./public-payment-shell";

function createMockRequest(requiresInvoice = false) {
  return {
    id: "pr-123",
    token: "token-123",
    status: "READY_TO_PAY" as const,
    customerId: "customer-123",
    quoteId: null,
    workOrderId: null,
    requiresInvoice,
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
    render(<ContactCard contact={{ phone: "5556007675", whatsapp: "5536239346" }} />);

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
  it("renders payment data section with bank accounts, contact, reference, and WhatsApp CTA", () => {
    render(
      <PublicPaymentPage
        request={createMockRequest()}
        bankAccounts={[
          {
            id: 1,
            accountHolder: "Juan Pérez",
            bankName: "BBVA",
            accountNumber: "987654",
            clabe: "0123 4567 8901 2345",
          },
        ]}
        contact={{
          phone: "5511223344",
          whatsapp: "5544332211",
        }}
      />,
    );

    expect(screen.getByText("Q-001")).toBeInTheDocument();
    expect(screen.getByText(/Total: \$4,000\.00/)).toBeInTheDocument();
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("BBVA")).toBeInTheDocument();
    expect(screen.getByText("5511223344")).toBeInTheDocument();
    expect(screen.getByText("5544332211")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /enviar whatsapp/i })).toBeInTheDocument();
  });

  it("renders payment data directly without invoice decision or fiscal-form elements", () => {
    render(<PublicPaymentPage request={createMockRequest(true)} />);

    expect(screen.queryByRole("heading", { name: /qué necesitas compartir/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /captura de datos fiscales/i })).not.toBeInTheDocument();
    expect(screen.getByText("Q-001")).toBeInTheDocument();
  });

  it("shows the payment badge in the shell", () => {
    render(<PublicPaymentPage request={createMockRequest()} />);

    expect(screen.getAllByText("Datos para transferencia").length).toBeGreaterThanOrEqual(1);
  });
});

describe("PublicPaymentShell", () => {
  it("does not invent identity values when business settings are absent", () => {
    render(<PublicPaymentShell><p>content</p></PublicPaymentShell>);

    expect(screen.queryByRole("heading", { name: "SEBASAM" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Batalla de Casa Blanca/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders the workshop address as a Google Maps link", () => {
    render(<PublicPaymentShell location={{ address: "Batalla de Casa Blanca", mapsUrl: "https://maps.example.test" }}><p>content</p></PublicPaymentShell>);

    const link = screen.getByRole("link", { name: /Batalla de Casa Blanca/i });
    expect(link).toHaveAttribute("href", "https://maps.example.test");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders an address without a valid map URL as text", () => {
    render(<PublicPaymentShell location={{ address: "Batalla de Casa Blanca", mapsUrl: "not a URL" }}><p>content</p></PublicPaymentShell>);

    expect(screen.getByText("Batalla de Casa Blanca")).not.toHaveAttribute("href");
    expect(screen.queryByRole("link", { name: /Batalla de Casa Blanca/i })).not.toBeInTheDocument();
  });

  it("renders business data from props", () => {
    render(
      <PublicPaymentShell
        business={{
          businessName: "Taller Test",
        }}
        location={{ address: "Calle Falsa 123, CDMX", mapsUrl: "https://maps.example.com/test" }}
      >
        <p>content</p>
      </PublicPaymentShell>,
    );

    expect(screen.getByRole("heading", { name: "Taller Test" })).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Calle Falsa 123/i });
    expect(link).toHaveAttribute("href", "https://maps.example.com/test");
  });

  it("passes business/bank/contact props through PublicPaymentPage to children", () => {
    const mockRequest = createMockRequest();
    render(
      <PublicPaymentPage
        request={mockRequest}
        business={{
          businessName: "Custom Business",
        }}
        location={{ address: "Custom Address 456", mapsUrl: "https://maps.example.com/custom" }}
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

  it("renders payment contacts once in the contact card instead of duplicating them in the header", () => {
    render(
      <PublicPaymentPage
        request={createMockRequest()}
        business={{ businessName: "Custom Business", phone: "5500000000", whatsapp: "5511111111" }}
        contact={{ phone: "5500000000", whatsapp: "5511111111" }}
      />,
    );

    expect(screen.getAllByText("5500000000")).toHaveLength(1);
    expect(screen.getAllByText("5511111111")).toHaveLength(1);
  });
});
