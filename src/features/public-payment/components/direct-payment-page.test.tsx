import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DirectPaymentPage } from "./direct-payment-page";

const mockBusiness = {
  businessName: "SEBASAM",
};

const mockLocation = {
  address: "Batalla de Casa Blanca 1719B, CDMX",
  mapsUrl: "https://maps.app.goo.gl/test",
};

const mockBankAccounts = [
  {
    id: 1,
    accountHolder: "Federico Cruz",
    bankName: "Santander",
    accountNumber: "123456",
    clabe: "4444 4444 4444 4444",
  },
  {
    id: 2,
    accountHolder: "Federico Cruz",
    bankName: "BBVA",
    accountNumber: "789012",
    clabe: "5555 5555 5555 5555",
  },
];

const mockContact = {
  phone: "5556007675",
  whatsapp: "5536239346",
};

describe("DirectPaymentPage", () => {
  it("renders business header with the v4 business name", () => {
    render(
      <DirectPaymentPage business={mockBusiness} location={mockLocation} bankAccounts={mockBankAccounts} contact={mockContact} />,
    );

    expect(screen.getByRole("heading", { name: "SEBASAM" })).toBeInTheDocument();
  });

  it("renders bank data from props with multiple accounts", () => {
    render(
      <DirectPaymentPage business={mockBusiness} location={mockLocation} bankAccounts={mockBankAccounts} contact={mockContact} />,
    );

    // Both Santander and BBVA accounts should be visible
    expect(screen.getByText("Santander")).toBeInTheDocument();
    expect(screen.getByText("BBVA")).toBeInTheDocument();
    expect(screen.getByText("1234 56")).toBeInTheDocument();
    expect(screen.getByText("4444 4444 4444 4444")).toBeInTheDocument();
    expect(screen.getByText("7890 12")).toBeInTheDocument();
    expect(screen.getByText("5555 5555 5555 5555")).toBeInTheDocument();
  });

  it("renders each bank account as a separate card", () => {
    render(
      <DirectPaymentPage business={mockBusiness} location={mockLocation} bankAccounts={mockBankAccounts} contact={mockContact} />,
    );

    expect(screen.getAllByTestId("bank-account-card")).toHaveLength(2);
    expect(screen.getAllByText("No. Cuenta")).toHaveLength(2);
  });

  it("renders WhatsApp CTA with link from contact props", () => {
    render(
      <DirectPaymentPage business={mockBusiness} location={mockLocation} bankAccounts={mockBankAccounts} contact={mockContact} />,
    );

const whatsappLink = screen.getByRole("link", { name: /Enviar WhatsApp/i });
    expect(whatsappLink).toHaveAttribute("href", expect.stringContaining("5536239346"));
    expect(screen.getByRole("heading", { name: "Enviar comprobante" })).toBeInTheDocument();
  });

  it("renders the address as a Google Maps link in the footer", () => {
    render(
      <DirectPaymentPage business={mockBusiness} location={mockLocation} bankAccounts={mockBankAccounts} contact={mockContact} />,
    );

    const link = screen.getByRole("link", { name: /Batalla de Casa Blanca/i });
    expect(link).toHaveAttribute("href", "https://maps.app.goo.gl/test");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders bank data and send receipt section headings", () => {
    render(
      <DirectPaymentPage business={mockBusiness} location={mockLocation} bankAccounts={mockBankAccounts} contact={mockContact} />,
    );

    expect(screen.getByRole("heading", { name: "Datos de pago" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Enviar comprobante" })).toBeInTheDocument();
  });

  it("renders only No. Cuenta row when account number is present and CLABE is empty", () => {
    render(
      <DirectPaymentPage
        business={mockBusiness}
        bankAccounts={[
          {
            id: 1,
            accountHolder: "Federico Cruz",
            bankName: "Santander",
            accountNumber: "123456",
            clabe: "",
          },
        ]}
        contact={mockContact}
      />,
    );

    expect(screen.getByText("No. Cuenta")).toBeInTheDocument();
    expect(screen.getByText("1234 56")).toBeInTheDocument();
    expect(screen.queryByText("CLABE")).not.toBeInTheDocument();
  });

  it("renders only CLABE row when CLABE is present and account number is empty", () => {
    render(
      <DirectPaymentPage
        business={mockBusiness}
        bankAccounts={[
          {
            id: 1,
            accountHolder: "Federico Cruz",
            bankName: "Santander",
            accountNumber: "",
            clabe: "4444 4444 4444 4444",
          },
        ]}
        contact={mockContact}
      />,
    );

    expect(screen.getByText("CLABE")).toBeInTheDocument();
    expect(screen.getByText("4444 4444 4444 4444")).toBeInTheDocument();
    expect(screen.queryByText("No. Cuenta")).not.toBeInTheDocument();
  });

  it("renders the bank and account holder when account number and CLABE are empty", () => {
    render(
      <DirectPaymentPage
        business={mockBusiness}
        bankAccounts={[
          {
            id: 1,
            accountHolder: "Federico Cruz",
            bankName: "Santander",
            accountNumber: "",
            clabe: "",
          },
        ]}
        contact={mockContact}
      />,
    );

    expect(screen.getByText("Santander")).toBeInTheDocument();
    expect(screen.getByText("Titular: Federico Cruz")).toBeInTheDocument();
    expect(screen.queryByText("No. Cuenta")).not.toBeInTheDocument();
    expect(screen.queryByText("CLABE")).not.toBeInTheDocument();
  });

  it("renders 'Facturación' badge when isForInvoicing is true", () => {
    render(
      <DirectPaymentPage
        business={mockBusiness}
        bankAccounts={[
          {
            id: 1,
            accountHolder: "Federico Cruz",
            bankName: "Santander",
            accountNumber: "123456",
            clabe: "4444 4444 4444 4444",
            isForInvoicing: true,
          },
        ]}
        contact={mockContact}
      />,
    );

    expect(screen.getByText("Facturación y transferencias")).toBeInTheDocument();
  });

  it("omits invoicing badge when isForInvoicing is false", () => {
    render(
      <DirectPaymentPage
        business={mockBusiness}
        bankAccounts={[
          {
            id: 1,
            accountHolder: "Federico Cruz",
            bankName: "Santander",
            accountNumber: "123456",
            clabe: "4444 4444 4444 4444",
            isForInvoicing: false,
          },
        ]}
        contact={mockContact}
      />,
    );

    expect(screen.queryByText("Facturación")).not.toBeInTheDocument();
  });
});
