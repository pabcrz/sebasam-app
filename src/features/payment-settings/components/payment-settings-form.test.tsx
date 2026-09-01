import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaymentSettingsForm, type PaymentSettingsFormProps } from "./payment-settings-form";

const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => "toast-1"),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: mockToast,
}));

const mockSaveAction = vi.fn();
const mockAddAction = vi.fn();
const mockRemoveAction = vi.fn();
const mockShareAction = vi.fn();

vi.mock("../actions", () => ({
  savePaymentSettingsAction: (formData: FormData) => mockSaveAction(formData),
  addBankAccountAction: (formData: FormData) => mockAddAction(formData),
  removeBankAccountAction: (accountId: number) => mockRemoveAction(accountId),
  setBankAccountPublicSharingAction: (accountId: number, enabled: boolean) =>
    mockShareAction(accountId, enabled),
}));

const defaultSettings: PaymentSettingsFormProps["settings"] = {
  name: "SEBASAM",
  fullName: "Servicio Básico a Suspensiones y Aire y Muelles",
  address: "Batalla de Casa Blanca 1719B, CDMX",
  mapsUrl: "https://maps.app.goo.gl/test",
  contactPhone: "5556007675",
  contactWhatsapp: "5536239346",
  hours: { weekdays: "Lunes a viernes", saturday: "Sábado" },
  services: ["Alineación"],
  products: ["Bujes"],
  bankAccounts: [
    {
      id: 1,
      accountHolder: "Federico Cruz",
      bankName: "Santander",
      accountNumber: "123456",
      clabe: "4444 4444 4444 4444",
      isForInvoicing: true,
      isPubliclyShareable: true,
      publicToken: "santander-token",
      sortOrder: 0,
    },
    {
      id: 2,
      accountHolder: "Federico Cruz",
      bankName: "BBVA",
      accountNumber: "789012",
      clabe: "5555 5555 5555 5555",
      isForInvoicing: false,
      isPubliclyShareable: false,
      publicToken: "bbva-token",
      sortOrder: 1,
    },
  ],
};

function renderForm(props?: Partial<PaymentSettingsFormProps>) {
  return render(<PaymentSettingsForm settings={defaultSettings} {...props} />);
}

describe("PaymentSettingsForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveAction.mockResolvedValue({ success: true });
    mockAddAction.mockResolvedValue({ success: true });
    mockRemoveAction.mockResolvedValue({ success: true });
    mockShareAction.mockResolvedValue({ success: true });
    mockToast.loading.mockReturnValue("toast-1");
  });

  it("renders all business and contact fields with default values", () => {
    renderForm();

    expect(screen.getByLabelText("Nombre corto")).toHaveValue("SEBASAM");
    expect(screen.getByLabelText("Nombre completo")).toHaveValue(
      "Servicio Básico a Suspensiones y Aire y Muelles",
    );
    expect(screen.getByLabelText("Dirección")).toHaveValue("Batalla de Casa Blanca 1719B, CDMX");
    expect(screen.getByLabelText("URL de Google Maps")).toHaveValue("https://maps.app.goo.gl/test");
    expect(screen.getByLabelText("Teléfono fijo")).toHaveValue("5556007675");
    expect(screen.getByLabelText("WhatsApp")).toHaveValue("5536239346");
  });

  it("renders existing bank accounts as read-only fields", () => {
    renderForm();

    // Account 1 (Santander) — use display value to find the read-only inputs
    expect(screen.getByDisplayValue("Santander")).toBeInTheDocument();
    expect(screen.getByDisplayValue("123456")).toBeInTheDocument();
    expect(screen.getByDisplayValue("4444 4444 4444 4444")).toBeInTheDocument();

    // Account 2 (BBVA) should also be visible
    expect(screen.getByDisplayValue("BBVA")).toBeInTheDocument();
    expect(screen.getByDisplayValue("789012")).toBeInTheDocument();
    expect(screen.getByDisplayValue("5555 5555 5555 5555")).toBeInTheDocument();
  });

  it("renders remove button for each bank account", () => {
    renderForm();

    // Two accounts = two remove buttons
    const removeButtons = screen.getAllByRole("button", { name: /eliminar cuenta/i });
    expect(removeButtons).toHaveLength(2);
    expect(removeButtons[0]).toHaveClass("bg-[var(--color-status-danger)]");
    expect(removeButtons[0].querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("shows invoicing status and exposes an accessible add-account checkbox", () => {
    renderForm();

    expect(screen.getByText("Para facturación")).toBeInTheDocument();
    expect(screen.getByText("No usada para facturación")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Usar esta cuenta para facturación" })).toBeInTheDocument();
  });

  it("renders add bank account form with empty fields", () => {
    renderForm();

    expect(screen.getByText("Agregar cuenta bancaria")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /agregar cuenta/i })).toBeInTheDocument();
  });

  it("shows empty state when no bank accounts exist", () => {
    const emptySettings = { ...defaultSettings, bankAccounts: [] };
    render(<PaymentSettingsForm settings={emptySettings} />);

    expect(screen.getByText(/no hay cuentas bancarias registradas/i)).toBeInTheDocument();
  });

  it("renders three section headings", () => {
    renderForm();

    expect(screen.getByRole("heading", { name: "Negocio" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Datos bancarios" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Contacto" })).toBeInTheDocument();
  });

  it("calls save action with updated values on submit", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.clear(screen.getByLabelText("Nombre corto"));
    await user.type(screen.getByLabelText("Nombre corto"), "Nuevo Nombre");

    fireEvent.submit(screen.getByTestId("payment-settings-form"));

    await waitFor(() => expect(mockSaveAction).toHaveBeenCalledTimes(1));

    const formData = mockSaveAction.mock.calls[0][0] as FormData;
    expect(formData.get("name")).toBe("Nuevo Nombre");
  });

  it("shows success toast after save", async () => {
    renderForm();

    fireEvent.submit(screen.getByTestId("payment-settings-form"));

    await waitFor(() =>
      expect(mockToast.success).toHaveBeenCalledWith(
        "Configuración guardada.",
        { id: "toast-1" },
      ),
    );
  });

  it("locks the header save action while the real form action is pending", async () => {
    let resolveSave!: (value: { success: boolean }) => void;
    mockSaveAction.mockImplementation(() => new Promise((resolve) => { resolveSave = resolve; }));
    const user = userEvent.setup();
    renderForm();
    const save = screen.getByRole("button", { name: "Guardar configuración" });

    await user.click(save);
    expect(save).toBeDisabled();
    await user.click(save);
    expect(mockSaveAction).toHaveBeenCalledTimes(1);

    resolveSave({ success: true });
    await waitFor(() => expect(save).not.toBeDisabled());
  });

  it("shows error toast when action fails", async () => {
    mockSaveAction.mockResolvedValue({ success: false });

    renderForm();

    fireEvent.submit(screen.getByTestId("payment-settings-form"));

    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(
        "No se pudieron guardar los cambios.",
        { id: "toast-1" },
      ),
    );
  });

  it("shows error toast for initial saveError prop", () => {
    renderForm({ saveError: "Error de prueba" });

    expect(mockToast.error).toHaveBeenCalledWith("Error de prueba");
  });

  describe("add bank account validation", () => {
    it("does not mark accountNumber or clabe as required", () => {
      renderForm();
      const addForm = screen.getByTestId("add-bank-account-form");

      const accountNumberInput = within(addForm).getByLabelText("No. de cuenta");
      const clabeInput = within(addForm).getByLabelText("CLABE");

      expect(accountNumberInput).not.toBeRequired();
      expect(clabeInput).not.toBeRequired();
    });

    it("shows helper text explaining at least one is required", () => {
      renderForm();

      expect(
        screen.getByText("Ingresa No. de cuenta, CLABE o ambos."),
      ).toBeInTheDocument();
    });

    it("rejects submission when account number and CLABE are both empty", async () => {
      mockAddAction.mockResolvedValue({
        success: false,
        error: "Ingresa No. de cuenta o CLABE.",
      });
      const user = userEvent.setup();
      renderForm();
      const addForm = screen.getByTestId("add-bank-account-form");

      // Fill required holder + bank but leave both accountNumber and clabe empty
      await user.type(within(addForm).getByLabelText("Titular"), "Juan Pérez");
      await user.type(within(addForm).getByLabelText("Banco"), "Santander");
      await user.click(within(addForm).getByRole("button", { name: /agregar cuenta/i }));

      await waitFor(() =>
        expect(mockToast.error).toHaveBeenCalledWith(
          "Ingresa No. de cuenta o CLABE.",
          { id: "toast-1" },
        ),
      );
    });

    it("accepts submission with account number only", async () => {
      mockAddAction.mockResolvedValue({ success: true });
      const user = userEvent.setup();
      renderForm();
      const addForm = screen.getByTestId("add-bank-account-form");

      await user.type(within(addForm).getByLabelText("Titular"), "Juan Pérez");
      await user.type(within(addForm).getByLabelText("Banco"), "Santander");
      await user.type(within(addForm).getByLabelText("No. de cuenta"), "789012");

      await user.click(within(addForm).getByRole("button", { name: /agregar cuenta/i }));

      await waitFor(() =>
        expect(mockToast.success).toHaveBeenCalledWith(
          "Cuenta agregada.",
          { id: "toast-1" },
        ),
      );
    });

    it("accepts submission with CLABE only", async () => {
      mockAddAction.mockResolvedValue({ success: true });
      const user = userEvent.setup();
      renderForm();
      const addForm = screen.getByTestId("add-bank-account-form");

      await user.type(within(addForm).getByLabelText("Titular"), "Juan Pérez");
      await user.type(within(addForm).getByLabelText("Banco"), "Santander");
      await user.type(within(addForm).getByLabelText("CLABE"), "8888 8888 8888 8888");

      await user.click(within(addForm).getByRole("button", { name: /agregar cuenta/i }));

      await waitFor(() =>
        expect(mockToast.success).toHaveBeenCalledWith(
          "Cuenta agregada.",
          { id: "toast-1" },
        ),
      );
    });

    it("accepts submission with both account number and CLABE", async () => {
      mockAddAction.mockResolvedValue({ success: true });
      const user = userEvent.setup();
      renderForm();
      const addForm = screen.getByTestId("add-bank-account-form");

      await user.type(within(addForm).getByLabelText("Titular"), "Juan Pérez");
      await user.type(within(addForm).getByLabelText("Banco"), "Santander");
      await user.type(within(addForm).getByLabelText("No. de cuenta"), "789012");
      await user.type(within(addForm).getByLabelText("CLABE"), "8888 8888 8888 8888");

      await user.click(within(addForm).getByRole("button", { name: /agregar cuenta/i }));

      await waitFor(() =>
        expect(mockToast.success).toHaveBeenCalledWith(
          "Cuenta agregada.",
          { id: "toast-1" },
        ),
      );
    });
  });

  describe("remove bank account", () => {
    it("removes the account selected through its accessible delete control", async () => {
      const user = userEvent.setup();
      renderForm();

      await user.click(screen.getAllByRole("button", { name: /eliminar cuenta/i })[1]);

      await waitFor(() => expect(mockRemoveAction).toHaveBeenCalledWith(2));
    });

    it("shows success toast when a bank account is removed", async () => {
      const user = userEvent.setup();
      renderForm();

      const removeButtons = screen.getAllByRole("button", { name: /eliminar cuenta/i });
      await user.click(removeButtons[0]);

      await waitFor(() =>
        expect(mockToast.success).toHaveBeenCalledWith(
          "Cuenta eliminada.",
          { id: "toast-1" },
        ),
      );
    });
  });

  describe("shareable bank accounts", () => {
    it("renders the share checkbox for each bank account and copy button when enabled", () => {
      renderForm();

      const checkboxes = screen.getAllByLabelText("Compartir esta cuenta públicamente");
      expect(checkboxes).toHaveLength(2);
      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[1]).not.toBeChecked();

      expect(screen.getByRole("button", { name: "Copiar enlace público" })).toBeInTheDocument();
    });

    it("calls setBankAccountPublicSharingAction when toggling sharing checkbox", async () => {
      const user = userEvent.setup();
      renderForm();

      const checkboxes = screen.getAllByLabelText("Compartir esta cuenta públicamente");
      await user.click(checkboxes[1]);

      await waitFor(() => expect(mockShareAction).toHaveBeenCalledWith(2, true));
    });

    it("copies the public URL to clipboard when clicking copy link", async () => {
      const user = userEvent.setup();
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        configurable: true,
        writable: true,
      });

      renderForm();

      const copyButton = screen.getByRole("button", { name: "Copiar enlace público" });
      await user.click(copyButton);

      expect(writeTextMock).toHaveBeenCalledWith(
        expect.stringContaining("/datos-de-pago/cuenta/santander-token"),
      );
    });
  });
});
