import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReversePaymentDialog } from "./reverse-payment-dialog";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

describe("ReversePaymentDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderDialog(props: Partial<React.ComponentProps<typeof ReversePaymentDialog>> = {}) {
    const action = props.action ?? vi.fn().mockResolvedValue({});
    const utils = render(
      <ReversePaymentDialog
        paymentId="pay-123"
        amountCents={50000}
        method="CASH"
        paymentDate={new Date("2026-08-15T12:00:00Z")}
        reference="OP-987"
        action={action}
        {...props}
      />,
    );
    return { ...utils, action };
  }

  it("renders trigger button and opens dialog with payment details", async () => {
    const user = userEvent.setup();
    renderDialog();

    const trigger = screen.getByRole("button", { name: /revertir pago de \$500\.00/i });
    expect(trigger).toBeInTheDocument();

    await user.click(trigger);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Revertir pago" })).toBeInTheDocument();
    expect(screen.getByText("$500.00")).toBeInTheDocument();
    expect(screen.getByText("Efectivo")).toBeInTheDocument();
    expect(screen.getByText("OP-987")).toBeInTheDocument();
  });

  it("requires a non-empty reason before submitting", async () => {
    const user = userEvent.setup();
    const { action } = renderDialog();

    await user.click(screen.getByRole("button", { name: /revertir pago/i }));

    const submitBtn = screen.getByRole("button", { name: "Confirmar reversión" });
    await user.click(submitBtn);

    expect(await screen.findByRole("alert")).toHaveTextContent("Ingresa el motivo de la reversión.");
    expect(action).not.toHaveBeenCalled();
  });

  it("calls action with paymentId, reason, and operationKey when submitted", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const { action } = renderDialog({ onSuccess });

    await user.click(screen.getByRole("button", { name: /revertir pago/i }));

    const textarea = screen.getByLabelText(/motivo de reversión/i);
    await user.type(textarea, "Error de captura en monto");

    const submitBtn = screen.getByRole("button", { name: "Confirmar reversión" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(action).toHaveBeenCalledWith(
        "pay-123",
        "Error de captura en monto",
        expect.any(String),
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("displays server error message when action fails", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockRejectedValue(new Error("No se puede revertir un pago ya conciliado."));
    renderDialog({ action });

    await user.click(screen.getByRole("button", { name: /revertir pago/i }));

    const textarea = screen.getByLabelText(/motivo de reversión/i);
    await user.type(textarea, "Motivo válido");

    await user.click(screen.getByRole("button", { name: "Confirmar reversión" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se puede revertir un pago ya conciliado.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes dialog on cancel click without triggering action", async () => {
    const user = userEvent.setup();
    const { action } = renderDialog();

    await user.click(screen.getByRole("button", { name: /revertir pago/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(action).not.toHaveBeenCalled();
  });
});
