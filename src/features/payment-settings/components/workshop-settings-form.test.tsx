import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PaymentSettingsData } from "@/features/payment-settings/domain";
import { WorkshopSettingsForm } from "./workshop-settings-form";

const { mockToast, mockRefresh } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => "toast-1"),
  },
  mockRefresh: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: mockToast,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const mockSaveAction = vi.fn();

vi.mock("../actions", () => ({
  savePaymentSettingsAction: (formData: FormData) => mockSaveAction(formData),
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

const changeBar = () => screen.queryByRole("region", { name: "Cambios sin guardar" });

describe("WorkshopSettingsForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveAction.mockResolvedValue({ success: true });
    mockToast.loading.mockReturnValue("toast-1");
  });

  it("shows the workshop fields with their stored values and no change bar", () => {
    render(<WorkshopSettingsForm settings={settings} />);

    expect(screen.getByLabelText("Nombre corto")).toHaveValue("SEBASAM");
    expect(screen.getByLabelText("Nombre completo")).toHaveValue(settings.fullName);
    expect(screen.getByLabelText("Dirección")).toHaveValue(settings.address);
    expect(screen.getByLabelText("URL de Google Maps")).toHaveValue(settings.mapsUrl);
    expect(changeBar()).not.toBeInTheDocument();
  });

  it("previews the customer header from the draft without saving", async () => {
    const user = userEvent.setup();
    render(<WorkshopSettingsForm settings={settings} />);
    const preview = screen.getByTestId("workshop-preview");

    expect(within(preview).getByRole("heading", { name: "SEBASAM" })).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Nombre corto"));
    await user.type(screen.getByLabelText("Nombre corto"), "Taller Norte");

    expect(within(preview).getByRole("heading", { name: "Taller Norte" })).toBeInTheDocument();
    expect(within(preview).getByText(settings.address)).toBeInTheDocument();
    expect(mockSaveAction).not.toHaveBeenCalled();
  });

  it("shows the change bar only while there are unsaved changes; Cancelar restores stored values", async () => {
    const user = userEvent.setup();
    render(<WorkshopSettingsForm settings={settings} />);

    await user.type(screen.getByLabelText("Nombre corto"), " Norte");

    const bar = changeBar();
    expect(bar).toBeInTheDocument();
    expect(within(bar!).getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(within(bar!).getByRole("button", { name: "Guardar" })).toBeInTheDocument();

    await user.click(within(bar!).getByRole("button", { name: "Cancelar" }));

    expect(screen.getByLabelText("Nombre corto")).toHaveValue("SEBASAM");
    expect(changeBar()).not.toBeInTheDocument();
  });

  it("saves the workshop fields and submits the stored contact values untouched", async () => {
    const user = userEvent.setup();
    render(<WorkshopSettingsForm settings={settings} />);

    await user.clear(screen.getByLabelText("Nombre corto"));
    await user.type(screen.getByLabelText("Nombre corto"), "Taller Norte");
    await user.click(within(changeBar()!).getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mockSaveAction).toHaveBeenCalledTimes(1));
    const formData = mockSaveAction.mock.calls[0][0] as FormData;
    expect(formData.get("name")).toBe("Taller Norte");
    expect(formData.get("contactPhone")).toBe(settings.contactPhone);
    expect(formData.get("contactWhatsapp")).toBe(settings.contactWhatsapp);
  });

  it("clears the change bar and refreshes the screen after a successful save", async () => {
    const user = userEvent.setup();
    render(<WorkshopSettingsForm settings={settings} />);

    await user.clear(screen.getByLabelText("Nombre corto"));
    await user.type(screen.getByLabelText("Nombre corto"), "Taller Norte");
    await user.click(within(changeBar()!).getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(changeBar()).not.toBeInTheDocument());
    expect(mockToast.success).toHaveBeenCalledWith("Configuración guardada.", { id: "toast-1" });
    expect(mockRefresh).toHaveBeenCalled();
    expect(screen.getByLabelText("Nombre corto")).toHaveValue("Taller Norte");
  });

  it("keeps the draft and shows the server error when the save fails", async () => {
    mockSaveAction.mockResolvedValue({
      success: false,
      error: "La URL de Google Maps debe comenzar con http:// o https://.",
    });
    const user = userEvent.setup();
    render(<WorkshopSettingsForm settings={settings} />);

    await user.clear(screen.getByLabelText("Nombre corto"));
    await user.type(screen.getByLabelText("Nombre corto"), "Taller Norte");
    await user.click(within(changeBar()!).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(
        "La URL de Google Maps debe comenzar con http:// o https://.",
        { id: "toast-1" },
      ),
    );
    expect(changeBar()).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre corto")).toHaveValue("Taller Norte");
  });

  it("locks Guardar in the change bar while the save is pending", async () => {
    let resolveSave!: (value: { success: boolean }) => void;
    mockSaveAction.mockImplementation(() => new Promise((resolve) => { resolveSave = resolve; }));
    const user = userEvent.setup();
    render(<WorkshopSettingsForm settings={settings} />);

    await user.type(screen.getByLabelText("Nombre corto"), " Norte");
    const save = within(changeBar()!).getByRole("button", { name: "Guardar" });
    await user.click(save);

    expect(save).toBeDisabled();
    await user.click(save);
    expect(mockSaveAction).toHaveBeenCalledTimes(1);

    resolveSave({ success: true });
    await waitFor(() => expect(changeBar()).not.toBeInTheDocument());
  });
});
