import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DirectPaymentPage } from "./direct-payment-page";

const mockBusiness = {
  name: "SEBASAM",
  fullName: "Servicio Básico a Suspensiones y Aire y Muelles",
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
  it("renders business header with name and full name", () => {
    render(
      <DirectPaymentPage business={mockBusiness} bankAccounts={mockBankAccounts} contact={mockContact} />,
    );

    expect(screen.getByRole("heading", { name: "SEBASAM" })).toBeInTheDocument();
    expect(
      screen.getByText("Servicio Básico a Suspensiones y Aire y Muelles"),
    ).toBeInTheDocument();
  });

  it("renders bank data from props with multiple accounts", () => {
    render(
      <DirectPaymentPage business={mockBusiness} bankAccounts={mockBankAccounts} contact={mockContact} />,
    );

    // Both Santander and BBVA accounts should be visible
    expect(screen.getByText("Santander")).toBeInTheDocument();
    expect(screen.getByText("BBVA")).toBeInTheDocument();
    expect(screen.getByText("123456")).toBeInTheDocument();
    expect(screen.getByText("4444 4444 4444 4444")).toBeInTheDocument();
    expect(screen.getByText("789012")).toBeInTheDocument();
    expect(screen.getByText("5555 5555 5555 5555")).toBeInTheDocument();
  });

  it("renders account labels for multiple accounts", () => {
    render(
      <DirectPaymentPage business={mockBusiness} bankAccounts={mockBankAccounts} contact={mockContact} />,
    );

    expect(screen.getByText("Cuenta 1")).toBeInTheDocument();
    expect(screen.getByText("Cuenta 2")).toBeInTheDocument();
  });

  it("renders contact data from props", () => {
    render(
      <DirectPaymentPage business={mockBusiness} bankAccounts={mockBankAccounts} contact={mockContact} />,
    );

    expect(screen.getByText("5556007675")).toBeInTheDocument();
    expect(screen.getByText("5536239346")).toBeInTheDocument();
  });

  it("renders the address as a Google Maps link in the footer", () => {
    render(
      <DirectPaymentPage business={mockBusiness} bankAccounts={mockBankAccounts} contact={mockContact} />,
    );

    const link = screen.getByRole("link", { name: /Batalla de Casa Blanca/i });
    expect(link).toHaveAttribute("href", "https://maps.app.goo.gl/test");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders bank data and contact section headings", () => {
    render(
      <DirectPaymentPage business={mockBusiness} bankAccounts={mockBankAccounts} contact={mockContact} />,
    );

    expect(screen.getByRole("heading", { name: "Datos de pago" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Contacto" })).toBeInTheDocument();
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
    expect(screen.getByText("123456")).toBeInTheDocument();
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

  it("renders Titular and Banco labels always even when account number and CLABE are empty", () => {
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

    expect(screen.getByText("Titular")).toBeInTheDocument();
    expect(screen.getByText("Banco")).toBeInTheDocument();
    expect(screen.queryByText("No. Cuenta")).not.toBeInTheDocument();
    expect(screen.queryByText("CLABE")).not.toBeInTheDocument();
  });

  it("renders 'Cuenta exclusiva para facturación' badge when isForInvoicing is true", () => {
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

    expect(screen.getByText("Cuenta exclusiva para facturación")).toBeInTheDocument();
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

    expect(screen.queryByText("Cuenta exclusiva para facturación")).not.toBeInTheDocument();
  });
});
