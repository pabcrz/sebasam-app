import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PaymentSettingsData } from "@/features/payment-settings/domain";
import { ContactSettingsForm } from "./contact-settings-form";

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

describe("ContactSettingsForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveAction.mockResolvedValue({ success: true });
    mockToast.loading.mockReturnValue("toast-1");
  });

  it("shows the contact fields with their stored values and no change bar", () => {
    render(<ContactSettingsForm settings={settings} />);

    expect(screen.getByLabelText("Teléfono fijo")).toHaveValue("5556007675");
    expect(screen.getByLabelText("WhatsApp")).toHaveValue("5536239346");
    expect(changeBar()).not.toBeInTheDocument();
  });

  it("shows the change bar for an edit and Cancelar restores the stored phone", async () => {
    const user = userEvent.setup();
    render(<ContactSettingsForm settings={settings} />);

    await user.clear(screen.getByLabelText("Teléfono fijo"));
    await user.type(screen.getByLabelText("Teléfono fijo"), "5550001111");

    const bar = changeBar();
    expect(bar).toBeInTheDocument();
    await user.click(within(bar!).getByRole("button", { name: "Cancelar" }));

    expect(screen.getByLabelText("Teléfono fijo")).toHaveValue("5556007675");
    expect(changeBar()).not.toBeInTheDocument();
  });

  it("carries the stored workshop fields as hidden inputs so saving contact does not clear them", () => {
    const { container } = render(<ContactSettingsForm settings={settings} />);

    const hidden = (name: string) =>
      container.querySelector<HTMLInputElement>(`input[type="hidden"][name="${name}"]`)?.value;

    expect(hidden("name")).toBe("SEBASAM");
    expect(hidden("fullName")).toBe(settings.fullName);
    expect(hidden("address")).toBe(settings.address);
    expect(hidden("mapsUrl")).toBe(settings.mapsUrl);
  });

  it("saves the contact fields and submits the stored workshop values", async () => {
    const user = userEvent.setup();
    render(<ContactSettingsForm settings={settings} />);

    await user.clear(screen.getByLabelText("WhatsApp"));
    await user.type(screen.getByLabelText("WhatsApp"), "5550002222");
    await user.click(within(changeBar()!).getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mockSaveAction).toHaveBeenCalledTimes(1));
    const formData = mockSaveAction.mock.calls[0][0] as FormData;
    expect(formData.get("contactWhatsapp")).toBe("5550002222");
    expect(formData.get("contactPhone")).toBe(settings.contactPhone);
    expect(formData.get("name")).toBe(settings.name);
    expect(formData.get("fullName")).toBe(settings.fullName);
    expect(formData.get("address")).toBe(settings.address);
    expect(formData.get("mapsUrl")).toBe(settings.mapsUrl);

    await waitFor(() => expect(changeBar()).not.toBeInTheDocument());
    expect(mockToast.success).toHaveBeenCalledWith("Configuración guardada.", { id: "toast-1" });
  });
});
