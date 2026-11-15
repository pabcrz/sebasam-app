import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@/components/theme-provider";
import { FontScaleProvider } from "@/components/font-scale-provider";

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

const { requireOperationalRole } = vi.hoisted(() => ({ requireOperationalRole: vi.fn() }));

vi.mock("@/lib/auth/session", () => ({ requireOperationalRole }));
vi.mock("@/features/payment-settings/domain", () => ({ getPaymentSettings: vi.fn().mockResolvedValue(settings) }));
vi.mock("@/features/payment-settings/actions", () => ({
  savePaymentSettingsAction: vi.fn(),
  addBankAccountAction: vi.fn(),
  removeBankAccountAction: vi.fn(),
  setBankAccountPublicSharingAction: vi.fn(),
}));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn(), loading: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import WorkshopPage from "./datos-del-taller/page";
import ContactPage from "./contacto/page";
import BankAccountsPage from "./cuentas-bancarias/page";
import AppearancePage from "./apariencia/page";

async function renderScreen(page: Promise<React.ReactNode>) {
  return render(
    <ThemeProvider>
      <FontScaleProvider>{await page}</FontScaleProvider>
    </ThemeProvider>,
  );
}

describe("configuración setting screens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireOperationalRole.mockResolvedValue({ user: {}, profile: { role: "ADMIN" } });
    localStorage.clear();
  });

  it("datos del taller is its own screen with a back link to the index", async () => {
    await renderScreen(WorkshopPage());

    expect(requireOperationalRole).toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1, name: "Datos del taller" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Configuración" })).toHaveAttribute("href", "/admin/configuracion-pago");
    expect(screen.getByLabelText("Nombre corto")).toHaveValue("SEBASAM");
  });

  it("contacto is its own screen", async () => {
    await renderScreen(ContactPage());

    expect(screen.getByRole("heading", { level: 1, name: "Contacto" })).toBeInTheDocument();
    expect(screen.getByLabelText("Teléfono fijo")).toHaveValue("555");
  });

  it("cuentas bancarias is its own screen with the add action and no inline add form", async () => {
    await renderScreen(BankAccountsPage());

    expect(screen.getByRole("heading", { level: 1, name: "Cuentas bancarias" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar" })).toBeInTheDocument();
    expect(screen.queryByTestId("add-bank-account-form")).not.toBeInTheDocument();
  });

  it("apariencia is its own screen", async () => {
    await renderScreen(AppearancePage());

    expect(screen.getByRole("heading", { level: 1, name: "Apariencia" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Tema" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Tamaño de letra" })).toBeInTheDocument();
  });
});
