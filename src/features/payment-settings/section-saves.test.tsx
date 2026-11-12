import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PaymentSettingsData } from "./domain";
import { ContactSettingsForm } from "./components/contact-settings-form";
import { WorkshopSettingsForm } from "./components/workshop-settings-form";
import { BankAccountsSection } from "./components/bank-accounts-section";

// Regression: these run the real server actions against a mocked domain layer,
// so they prove what reaches the stored payment settings row, not just the FormData.
const { updatePaymentSettings, addBankAccount, mockToast } = vi.hoisted(() => ({
  updatePaymentSettings: vi.fn(),
  addBankAccount: vi.fn(),
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => "toast-1"),
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireOperationalRole: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/features/payment-settings/domain", () => ({
  updatePaymentSettings,
  addBankAccount,
  removeBankAccount: vi.fn(),
  setBankAccountPublicSharing: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: mockToast,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const settings: PaymentSettingsData = {
  name: "SEBASAM",
  fullName: "Servicio Básico a Suspensiones y Aire y Muelles",
  address: "Batalla de Casa Blanca 1719B, CDMX",
  mapsUrl: "https://maps.app.goo.gl/test",
  contactPhone: "5556007675",
  contactWhatsapp: "5536239346",
  hours: { weekdays: "Lunes a viernes", saturday: "Sábado" },
  services: [],
  products: [],
  bankAccounts: [],
};

const changeBar = () => screen.getByRole("region", { name: "Cambios sin guardar" });

describe("saving one settings section leaves the other stored values unchanged", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updatePaymentSettings.mockResolvedValue(undefined);
    addBankAccount.mockResolvedValue(undefined);
    mockToast.loading.mockReturnValue("toast-1");
  });

  it("saving Contacto writes the stored workshop values back unchanged", async () => {
    const user = userEvent.setup();
    render(<ContactSettingsForm settings={settings} />);

    await user.clear(screen.getByLabelText("Teléfono fijo"));
    await user.type(screen.getByLabelText("Teléfono fijo"), "5550001111");
    await user.click(within(changeBar()).getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(updatePaymentSettings).toHaveBeenCalledTimes(1));
    expect(updatePaymentSettings).toHaveBeenCalledWith({
      name: settings.name,
      fullName: settings.fullName,
      address: settings.address,
      mapsUrl: settings.mapsUrl,
      contactPhone: "5550001111",
      contactWhatsapp: settings.contactWhatsapp,
    });
  });

  it("saving Datos del taller writes the stored contact values back unchanged", async () => {
    const user = userEvent.setup();
    render(<WorkshopSettingsForm settings={settings} />);

    await user.clear(screen.getByLabelText("Nombre corto"));
    await user.type(screen.getByLabelText("Nombre corto"), "Taller Norte");
    await user.click(within(changeBar()).getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(updatePaymentSettings).toHaveBeenCalledTimes(1));
    expect(updatePaymentSettings).toHaveBeenCalledWith({
      name: "Taller Norte",
      fullName: settings.fullName,
      address: settings.address,
      mapsUrl: settings.mapsUrl,
      contactPhone: settings.contactPhone,
      contactWhatsapp: settings.contactWhatsapp,
    });
  });

  it("adding a bank account does not write the payment settings row", async () => {
    const user = userEvent.setup();
    render(<BankAccountsSection bankAccounts={[]} />);

    await user.click(screen.getByRole("button", { name: "Agregar" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Titular"), "Juan Pérez");
    await user.type(within(dialog).getByLabelText("Banco"), "BBVA");
    await user.type(within(dialog).getByLabelText("No. de cuenta"), "789012");
    await user.click(within(dialog).getByRole("button", { name: "Agregar cuenta" }));

    await waitFor(() => expect(addBankAccount).toHaveBeenCalledTimes(1));
    expect(updatePaymentSettings).not.toHaveBeenCalled();
  });
});
