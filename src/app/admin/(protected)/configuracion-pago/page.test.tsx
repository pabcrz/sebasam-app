import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

const settings = vi.hoisted(() => ({
  name: "SEBASAM",
  fullName: "SEBASAM Taller",
  address: "Av. Central",
  mapsUrl: "https://maps.example",
  contactPhone: "555",
  contactWhatsapp: "556",
  hours: { weekdays: "Lunes a viernes", saturday: "Sábado" },
  services: [],
  products: [],
  bankAccounts: [],
}));

vi.mock("@/lib/auth/session", () => ({ requireOperationalRole: vi.fn() }));
vi.mock("@/features/payment-settings/domain", () => ({ getPaymentSettings: vi.fn().mockResolvedValue(settings) }));
vi.mock("@/features/payment-settings/actions", () => ({
  savePaymentSettingsAction: vi.fn(),
  addBankAccountAction: vi.fn(),
  removeBankAccountAction: vi.fn(),
}));

import PaymentSettingsPage from "./page";

describe("payment settings page header contract", () => {
  it("renders the production page and form composition with its header action", async () => {
    render(await PaymentSettingsPage());

    expect(screen.getByTestId("payment-settings-page-frame")).toHaveAttribute("data-layout-width", "admin");
    expect(screen.getByRole("heading", { level: 1, name: "Configuración de pago" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar configuración" })).toHaveAttribute("form", "payment-settings-form");
    expect(screen.getByTestId("payment-settings-form-body")).toHaveAttribute("data-layout-width", "readable");
    expect(screen.getByText("Datos bancarios")).toBeInTheDocument();
  });
});
