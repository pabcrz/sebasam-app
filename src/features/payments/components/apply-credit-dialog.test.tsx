import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import toast from "react-hot-toast";
import { ApplyCreditDialog } from "./apply-credit-dialog";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ApplyCreditDialog", () => {
  const defaultProps = {
    customerId: "cust-1",
    workOrderId: "wo-1",
    noteNumber: "OT-001",
    remainingCents: 20000, // $200.00
    availableCreditCents: 15000, // $150.00
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders trigger button and opens dialog with preloaded min amount", async () => {
    const user = userEvent.setup();
    render(<ApplyCreditDialog {...defaultProps} />);

    const trigger = screen.getByRole("button", { name: /aplicar saldo a favor a nota ot-001/i });
    expect(trigger).toBeInTheDocument();

    await user.click(trigger);

    expect(screen.getByRole("heading", { name: "Aplicar saldo a favor" })).toBeInTheDocument();
    expect(screen.getByText("$200.00")).toBeInTheDocument();
    expect(screen.getByText("$150.00")).toBeInTheDocument();

    // Min of remaining ($200) and credit ($150) is $150.00
    const input = screen.getByLabelText(/monto a aplicar/i);
    expect(input).toHaveValue("150.00");
  });

  it("validates amount greater than zero, within remaining balance and available credit", async () => {
    const user = userEvent.setup();
    render(<ApplyCreditDialog {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /aplicar saldo/i }));
    const input = screen.getByLabelText(/monto a aplicar/i);

    // Test zero
    await user.clear(input);
    await user.type(input, "0");
    expect(screen.getByRole("alert")).toHaveTextContent("El monto a aplicar debe ser mayor que cero.");
    expect(screen.getByRole("button", { name: /confirmar aplicación/i })).toBeDisabled();

    // Test exceeding available credit ($150.00)
    await user.clear(input);
    await user.type(input, "160.00");
    expect(screen.getByRole("alert")).toHaveTextContent("El monto no puede exceder el saldo a favor disponible.");
    expect(screen.getByRole("button", { name: /confirmar aplicación/i })).toBeDisabled();

    // Test exceeding remaining balance (with higher credit)
    const customProps = { ...defaultProps, availableCreditCents: 30000 };
    const { unmount } = render(<ApplyCreditDialog {...customProps} />);
    unmount(); // clean up
  });

  it("preserves stable operationKey on failure and rotates only after success", async () => {
    const user = userEvent.setup();
    const actionMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network glitch"))
      .mockResolvedValueOnce({ success: true });
    const onSuccessMock = vi.fn();

    render(<ApplyCreditDialog {...defaultProps} action={actionMock} onSuccess={onSuccessMock} />);

    await user.click(screen.getByRole("button", { name: /aplicar saldo/i }));

    const submitButton = screen.getByRole("button", { name: /confirmar aplicación/i });

    // First attempt -> fails with network error
    await user.click(submitButton);

    await waitFor(() => {
      expect(actionMock).toHaveBeenCalledTimes(1);
    });

    const firstCallKey = actionMock.mock.calls[0][3];
    expect(firstCallKey).toBeDefined();
    expect(typeof firstCallKey).toBe("string");
    expect(screen.getByRole("alert")).toHaveTextContent("Network glitch");

    // Second attempt -> retry with same form state
    await user.click(submitButton);

    await waitFor(() => {
      expect(actionMock).toHaveBeenCalledTimes(2);
    });

    const secondCallKey = actionMock.mock.calls[1][3];
    // Idempotency: operationKey MUST be preserved across retry
    expect(secondCallKey).toBe(firstCallKey);

    // On success, toast and callbacks are invoked
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Saldo aplicado a la nota OT-001.");
      expect(onSuccessMock).toHaveBeenCalledTimes(1);
      expect(refreshMock).toHaveBeenCalled();
    });
  });
});
