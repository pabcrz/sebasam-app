import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteCancelForm } from "./quote-cancel-form";

describe("QuoteCancelForm", () => {
  it("calls the server action with quoteId when confirmed", async () => {
    const action = vi.fn();
    const user = userEvent.setup();
    render(<QuoteCancelForm action={action} quoteId="q-123" quoteNumber="C-001" />);

    await user.click(screen.getByRole("button", { name: /cancelar cotización c-001/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cancelar cotización/i }));

    await waitFor(() => {
      expect(action).toHaveBeenCalledTimes(1);
    });
    const formData = action.mock.calls[0][0] as FormData;
    expect(formData.get("quoteId")).toBe("q-123");
  });

  it("does not call the server action when the confirmation is cancelled", async () => {
    const action = vi.fn();
    const user = userEvent.setup();
    render(<QuoteCancelForm action={action} quoteId="q-123" quoteNumber="C-001" />);

    await user.click(screen.getByRole("button", { name: /cancelar cotización/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /volver/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(action).not.toHaveBeenCalled();
  });

  it("prevents double submission while the cancellation is pending", async () => {
    const action = vi.fn(() => new Promise<void>(() => {}));
    const user = userEvent.setup();
    render(<QuoteCancelForm action={action} quoteId="q-123" quoteNumber="C-001" />);

    await user.click(screen.getByRole("button", { name: /cancelar cotización/i }));
    const confirmButton = screen.getByRole("button", { name: /cancelar cotización/i });

    await user.click(confirmButton);

    await waitFor(() => {
      expect(action).toHaveBeenCalledTimes(1);
    });
    expect(confirmButton).toBeDisabled();

    await user.click(confirmButton);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("stops click propagation so a parent row click is not triggered", async () => {
    const action = vi.fn();
    const rowClick = vi.fn();
    const user = userEvent.setup();

    render(
      <div onClick={rowClick}>
        <QuoteCancelForm action={action} quoteId="q-123" quoteNumber="C-001" />
      </div>,
    );

    await user.click(screen.getByRole("button", { name: /cancelar cotización/i }));

    expect(rowClick).not.toHaveBeenCalled();
  });
});
