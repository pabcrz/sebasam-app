import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BankAccountData } from "@/features/payment-settings/domain";
import { BankAccountsSection } from "./bank-accounts-section";

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

const mockAddAction = vi.fn();
const mockRemoveAction = vi.fn();
const mockShareAction = vi.fn();

vi.mock("../actions", () => ({
  addBankAccountAction: (formData: FormData) => mockAddAction(formData),
  removeBankAccountAction: (accountId: number) => mockRemoveAction(accountId),
  setBankAccountPublicSharingAction: (accountId: number, enabled: boolean) =>
    mockShareAction(accountId, enabled),
}));

const bankAccounts: BankAccountData[] = [
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
];

function renderSection(accounts: BankAccountData[] = bankAccounts) {
  return render(<BankAccountsSection bankAccounts={accounts} />);
}

describe("BankAccountsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddAction.mockResolvedValue({ success: true });
    mockRemoveAction.mockResolvedValue({ success: true });
    mockShareAction.mockResolvedValue({ success: true });
    mockToast.loading.mockReturnValue("toast-1");
  });

  it("shows each account as a card with its use and holder", () => {
    renderSection();

    expect(screen.getByRole("heading", { name: "Santander" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "BBVA" })).toBeInTheDocument();
    expect(screen.getByText("Facturación y transferencias")).toBeInTheDocument();
    expect(screen.getByText("Solo transferencias")).toBeInTheDocument();
    expect(screen.getByDisplayValue("4444 4444 4444 4444")).toBeInTheDocument();
  });

  it("keeps the add form out of the page until Agregar opens a sheet", async () => {
    const user = userEvent.setup();
    renderSection();

    expect(screen.queryByTestId("add-bank-account-form")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Agregar" }));

    const dialog = screen.getByRole("dialog", { name: "Agregar cuenta bancaria" });
    expect(within(dialog).getByTestId("add-bank-account-form")).toBeInTheDocument();
  });

  it("adds an account from the sheet and closes it on success", async () => {
    const user = userEvent.setup();
    renderSection([]);

    await user.click(screen.getByRole("button", { name: "Agregar" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Titular"), "Juan Pérez");
    await user.type(within(dialog).getByLabelText("Banco"), "Santander");
    await user.type(within(dialog).getByLabelText("No. de cuenta"), "789012");
    await user.click(within(dialog).getByRole("button", { name: "Agregar cuenta" }));

    await waitFor(() =>
      expect(mockToast.success).toHaveBeenCalledWith("Cuenta agregada.", { id: "toast-1" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the sheet open and shows the error when the account is incomplete", async () => {
    mockAddAction.mockResolvedValue({ success: false, error: "Ingresa No. de cuenta o CLABE." });
    const user = userEvent.setup();
    renderSection([]);

    await user.click(screen.getByRole("button", { name: "Agregar" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Titular"), "Juan Pérez");
    await user.type(within(dialog).getByLabelText("Banco"), "Santander");
    await user.click(within(dialog).getByRole("button", { name: "Agregar cuenta" }));

    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith("Ingresa No. de cuenta o CLABE.", { id: "toast-1" }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not mark accountNumber or clabe as required, and explains that one is needed", async () => {
    const user = userEvent.setup();
    renderSection([]);

    await user.click(screen.getByRole("button", { name: "Agregar" }));
    const dialog = screen.getByRole("dialog");

    expect(within(dialog).getByLabelText("No. de cuenta")).not.toBeRequired();
    expect(within(dialog).getByLabelText("CLABE")).not.toBeRequired();
    expect(within(dialog).getByText("Ingresa No. de cuenta, CLABE o ambos.")).toBeInTheDocument();
  });

  it("copies the public link of a shareable account", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });
    renderSection();

    await user.click(screen.getByRole("button", { name: "Copiar enlace público" }));

    expect(writeTextMock).toHaveBeenCalledWith(
      `${window.location.origin}/datos-de-pago/cuenta/santander-token`,
    );
    expect(screen.getByText("Copiado")).toBeInTheDocument();
  });

  it("shows the public link only for shareable accounts", () => {
    renderSection();

    expect(screen.getAllByRole("button", { name: "Copiar enlace público" })).toHaveLength(1);
    expect(screen.getByText("Enlace público apagado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir enlace" })).toHaveAttribute(
      "href",
      "/datos-de-pago/cuenta/santander-token",
    );
  });

  it("toggles public sharing through the existing action", async () => {
    const user = userEvent.setup();
    renderSection();

    const checkboxes = screen.getAllByLabelText("Compartir esta cuenta públicamente");
    await user.click(checkboxes[1]);

    await waitFor(() => expect(mockShareAction).toHaveBeenCalledWith(2, true));
  });

  it("asks for confirmation before removing an account and removes it only when confirmed", async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("button", { name: "Eliminar cuenta BBVA" }));
    const dialog = screen.getByRole("dialog", { name: "¿Eliminar cuenta BBVA?" });
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(mockRemoveAction).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Eliminar cuenta BBVA" }));
    await user.click(within(screen.getByRole("dialog", { name: "¿Eliminar cuenta BBVA?" })).getByRole("button", { name: "Eliminar cuenta" }));

    await waitFor(() => expect(mockRemoveAction).toHaveBeenCalledWith(2));
    expect(mockToast.success).toHaveBeenCalledWith("Cuenta eliminada.", { id: "toast-1" });
  });

  it("styles the remove control as an outlined danger action", () => {
    renderSection();

    const remove = screen.getByRole("button", { name: "Eliminar cuenta Santander" });
    expect(remove).toHaveClass("border-[var(--color-status-danger-border)]");
  });

  it("shows an empty state that points to Agregar when there are no accounts", () => {
    renderSection([]);

    expect(screen.getByText(/no hay cuentas bancarias registradas/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar" })).toBeInTheDocument();
  });
});
