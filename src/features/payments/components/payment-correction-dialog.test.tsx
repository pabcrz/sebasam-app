import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaymentCorrectionDialog } from "./payment-correction-dialog";
import { PaymentMethod } from "@prisma/client";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const baseResult = {
  correctionId: "corr-1",
  originalPaymentId: "pay-1",
  replacementPaymentId: "pay-2",
  replacementAmountCents: 12_500,
  method: PaymentMethod.TRANSFER,
  reversedApplicationsCount: 1,
  appliedApplicationsCount: 1,
  totalShortfallCents: 0,
  excessCreditCents: 0,
  reason: "Cliente cambió de método",
  actorId: "admin-1",
  createdAt: new Date("2026-08-25T10:00:00.000Z"),
  applications: [
    { workOrderId: "wo-1", originalAmountCents: 10_000, replacementAmountCents: 10_000, shortfallCents: 0 },
  ],
};

function renderDialog(props: Partial<React.ComponentProps<typeof PaymentCorrectionDialog>> = {}) {
  const action = props.action ?? vi.fn().mockResolvedValue(baseResult);
  const utils = render(
    <PaymentCorrectionDialog
      paymentId="pay-1"
      originalAmountCents={10_000}
      originalMethod="CASH"
      reference="OP-001"
      paymentDate={new Date("2026-08-20T10:00:00.000Z")}
      quoteNumber="COT-001"
      action={action}
      {...props}
    />,
  );
  return { ...utils, action };
}

describe("PaymentCorrectionDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders original payment context and opens the correction form", async () => {
    const user = userEvent.setup();
    renderDialog();

    const trigger = screen.getByRole("button", { name: /corregir pago de \$100\.00/i });
    expect(trigger).toBeInTheDocument();

    await user.click(trigger);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Corregir pago" })).toBeInTheDocument();
    expect(screen.getByText("$100.00")).toBeInTheDocument();
    expect(screen.getByText(/Método original/i).parentElement).toHaveTextContent("Efectivo");
    expect(screen.getByText("OP-001")).toBeInTheDocument();
  });

  it("requires a non-empty reason and a positive amount before submitting", async () => {
    const user = userEvent.setup();
    const { action } = renderDialog();

    await user.click(screen.getByRole("button", { name: /corregir pago/i }));

    const amount = screen.getByRole("textbox", { name: /nuevo monto/i });
    const reason = screen.getByLabelText(/motivo de la corrección/i);
    await user.clear(amount);
    await user.type(amount, "0");
    await user.clear(reason);

    await user.click(screen.getByRole("button", { name: "Confirmar corrección" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("El monto de corrección debe ser mayor que cero.");
    expect(action).not.toHaveBeenCalled();

    await user.clear(amount);
    await user.type(amount, "12.50");
    await user.type(reason, "Cambio de método");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("submits corrected amount, method and reason and renders the linked audit", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const { action } = renderDialog({ onSuccess });

    await user.click(screen.getByRole("button", { name: /corregir pago/i }));

    const amount = screen.getByRole("textbox", { name: /nuevo monto/i });
    await user.clear(amount);
    await user.type(amount, "125.00");

    const method = screen.getByRole("combobox", { name: /nuevo método/i });
    await user.selectOptions(method, "TRANSFER");

    const reason = screen.getByLabelText(/motivo de la corrección/i);
    await user.type(reason, "Cliente cambió de método");

    await user.click(screen.getByRole("button", { name: "Confirmar corrección" }));

    await waitFor(() => {
      expect(action).toHaveBeenCalledWith("pay-1", "125.00", "TRANSFER", "Cliente cambió de método", expect.any(String));
    });

    expect(await screen.findByText(/Corrección registrada/i)).toBeInTheDocument();
    expect(screen.getByText(/Monto original/i).parentElement).toHaveTextContent("$100.00");
    expect(screen.getByText(/Monto de reemplazo/i).parentElement).toHaveTextContent("$125.00");
    expect(screen.getByText(/Método de reemplazo/i).parentElement).toHaveTextContent("Transferencia");
    expect(screen.getByText(/Motivo/i).parentElement).toHaveTextContent("Cliente cambió de método");
    expect(screen.getByText(/Aplicaciones corregidas/i).parentElement).toHaveTextContent("1");
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it.each(["1000", "1000.00", "1,000.00", "1.000,00"])("normalizes %s before calling the correction action", async (input) => {
    const user = userEvent.setup();
    const { action } = renderDialog();
    await user.click(screen.getByRole("button", { name: /corregir pago/i }));
    const amount = screen.getByRole("textbox", { name: /nuevo monto/i });
    await user.clear(amount);
    await user.type(amount, input);
    await user.type(screen.getByLabelText(/motivo de la corrección/i), "Ajuste de captura");
    await user.click(screen.getByRole("button", { name: "Confirmar corrección" }));
    await waitFor(() => expect(action).toHaveBeenCalledWith("pay-1", "1000.00", "CASH", "Ajuste de captura", expect.any(String)));
  });

  it("displays mapped server errors without exposing raw internals", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockRejectedValue(new Error("Este pago ya fue corregido."));
    renderDialog({ action });

    await user.click(screen.getByRole("button", { name: /corregir pago/i }));

    const amount = screen.getByRole("textbox", { name: /nuevo monto/i });
    await user.clear(amount);
    await user.type(amount, "100.00");

    const reason = screen.getByLabelText(/motivo de la corrección/i);
    await user.type(reason, "Intento duplicado");

    await user.click(screen.getByRole("button", { name: "Confirmar corrección" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Este pago ya fue corregido.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("disables controls while the correction is being processed", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(baseResult), 50)));
    renderDialog({ action });

    await user.click(screen.getByRole("button", { name: /corregir pago/i }));

    const amount = screen.getByRole("textbox", { name: /nuevo monto/i });
    await user.clear(amount);
    await user.type(amount, "100.00");

    const reason = screen.getByLabelText(/motivo de la corrección/i);
    await user.type(reason, "Ajuste");

    const submit = screen.getByRole("button", { name: "Confirmar corrección" });
    await user.click(submit);

    expect(submit).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();

    await waitFor(() => expect(screen.getByText(/Corrección registrada/i)).toBeInTheDocument());
  });

  it("closes and restores trigger focus on cancel", async () => {
    const user = userEvent.setup();
    renderDialog();

    const trigger = screen.getByRole("button", { name: /corregir pago/i });
    await user.click(trigger);

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
