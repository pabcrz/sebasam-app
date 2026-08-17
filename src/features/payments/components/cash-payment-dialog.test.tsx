import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CashPaymentDialog } from "./cash-payment-dialog";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

function renderDialog(action = vi.fn()) {
  return render(
    <CashPaymentDialog
      action={action}
      quoteNumber="C-001"
      totalCents={10000}
      paidCents={2500}
      remainingCents={7500}
    />,
  );
}

describe("CashPaymentDialog", () => {
  it("refreshes membership once after success but not after failure", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockRejectedValueOnce(new Error("Falló")).mockResolvedValueOnce({ payment: { amountCents: 7500 }, paidCents: 10000, remainingCents: 0 });
    renderDialog(action);
    await user.click(screen.getByRole("button", { name: /registrar pago para/i }));
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));
    await screen.findByRole("alert");
    expect(refresh).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });
  it("shows the quote total, paid amount, and remaining balance", () => {
    renderDialog();

    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("$100.00")).toBeInTheDocument();
    expect(screen.getByText("$25.00")).toBeInTheDocument();
    expect(screen.getByText("Saldo pendiente")).toBeInTheDocument();
    expect(screen.getByText("$75.00")).toBeInTheDocument();
  });

  it("blocks an overpayment immediately and accepts a corrected partial amount", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue({
      payment: { amountCents: 1250 },
      paidCents: 3750,
      remainingCents: 6250,
    });
    renderDialog(action);

    await user.click(screen.getByRole("button", { name: /registrar pago para/i }));
    const amount = screen.getByRole("textbox", { name: /monto recibido/i });
    const errorSlot = document.getElementById("cash-amount-error-C-001");
    expect(amount).toHaveValue("75.00");
    expect(errorSlot).toBeEmptyDOMElement();
    expect(errorSlot).toHaveClass("min-h-4", "text-xs");
    expect(errorSlot).not.toHaveAttribute("role");
    await user.clear(amount);
    await user.type(amount, "75.01");
    expect(screen.getByRole("alert")).toHaveTextContent("El pago no puede exceder el saldo pendiente.");
    expect(errorSlot).toHaveAttribute("role", "alert");
    expect(amount).toHaveAttribute("aria-invalid", "true");
    expect(amount).toHaveAttribute("aria-describedby", expect.stringContaining("cash-amount-error-C-001"));
    expect(screen.getByRole("button", { name: "Registrar pago" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));
    expect(action).not.toHaveBeenCalled();

    await user.clear(amount);
    await user.type(amount, "12.50");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(errorSlot).toBeEmptyDOMElement();
    expect(errorSlot).not.toHaveAttribute("role");
    expect(amount).not.toHaveAttribute("aria-invalid");
    expect(screen.getByRole("button", { name: "Registrar pago" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));

    await waitFor(() => expect(action).toHaveBeenCalledWith("12.50", expect.any(String), expect.any(String)));
    expect(screen.getByRole("status")).toHaveTextContent("$12.50");
    expect(screen.getAllByText("$62.50")).toHaveLength(2);
  });

  it("rejects invalid formatting and non-positive values before submit", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    renderDialog(action);

    await user.click(screen.getByRole("button", { name: /registrar pago para/i }));
    const amount = screen.getByRole("textbox", { name: /monto recibido/i });
    await user.clear(amount);
    await user.type(amount, "0");
    expect(screen.getByRole("alert")).toHaveTextContent("El pago debe ser mayor que cero.");
    expect(screen.getByRole("button", { name: "Registrar pago" })).toBeDisabled();

    await user.clear(amount);
    await user.type(amount, "12.345");
    expect(screen.getByRole("alert")).toHaveTextContent("Ingresa un monto válido con hasta dos decimales.");
    expect(action).not.toHaveBeenCalled();
  });

  it("shows an action error and keeps the dialog open", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockRejectedValue(new Error("El pago no puede exceder el saldo pendiente."));
    renderDialog(action);

    await user.click(screen.getByRole("button", { name: /registrar pago para/i }));
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("El pago no puede exceder el saldo pendiente.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("reuses its operation key when an ambiguous action failure is retried", async () => {
    const user = userEvent.setup();
    const action = vi.fn()
      .mockRejectedValueOnce(new Error("No se pudo confirmar el pago."))
      .mockResolvedValueOnce({
        payment: { amountCents: 7500 },
        paidCents: 10000,
        remainingCents: 0,
      });
    renderDialog(action);

    await user.click(screen.getByRole("button", { name: /registrar pago para/i }));
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));
    // Same operationKey (index 1) on retry
    expect(action.mock.calls[1][1]).toBe(action.mock.calls[0][1]);
  });

  it("starts a new operation only after a successful payment", async () => {
    const user = userEvent.setup();
    const action = vi.fn()
      .mockResolvedValueOnce({
        payment: { amountCents: 1250 },
        paidCents: 3750,
        remainingCents: 6250,
      })
      .mockResolvedValueOnce({
        payment: { amountCents: 6250 },
        paidCents: 10000,
        remainingCents: 0,
      });
    renderDialog(action);

    await user.click(screen.getByRole("button", { name: /registrar pago para/i }));
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));
    await screen.findByRole("status");
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));
    // New operationKey (index 1) after success
    expect(action.mock.calls[1][1]).not.toBe(action.mock.calls[0][1]);
  });
});
