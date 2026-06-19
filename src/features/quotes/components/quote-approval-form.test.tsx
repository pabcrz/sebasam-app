import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteApprovalForm } from "./quote-approval-form";

describe("QuoteApprovalForm", () => {
  it("opens the confirmation dialog when the approve button is clicked", async () => {
    const user = userEvent.setup();
    render(<QuoteApprovalForm action={vi.fn()} quoteId="quote-123" quoteNumber="Q-001" />);

    await user.click(screen.getByRole("button", { name: /aprobar y crear orden de trabajo/i }));

    expect(screen.getByRole("dialog")).toHaveTextContent(/aprobar cotización/i);
    expect(screen.getByRole("button", { name: /aprobar y crear orden/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
  });

  it("does not submit when the dialog is cancelled", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(<QuoteApprovalForm action={action} quoteId="quote-123" quoteNumber="Q-001" />);

    await user.click(screen.getByRole("button", { name: /aprobar y crear orden de trabajo/i }));
    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(action).not.toHaveBeenCalled();
  });

  it("submits exactly one quoteId when confirmed", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue(undefined);
    render(<QuoteApprovalForm action={action} quoteId="quote-123" quoteNumber="Q-001" />);

    await user.click(screen.getByRole("button", { name: /aprobar y crear orden de trabajo/i }));
    await user.click(screen.getByRole("button", { name: /aprobar y crear orden/i }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));

    const formData = action.mock.calls[0][0] as FormData;
    expect(formData.get("quoteId")).toBe("quote-123");
  });

  it("cannot double-submit while a confirmation is pending", async () => {
    const user = userEvent.setup();
    const action = vi.fn(() => new Promise<void>(() => {}));
    render(<QuoteApprovalForm action={action} quoteId="quote-123" quoteNumber="Q-001" />);

    await user.click(screen.getByRole("button", { name: /aprobar y crear orden de trabajo/i }));
    const confirmButton = screen.getByRole("button", { name: /aprobar y crear orden/i });

    await user.click(confirmButton);

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(confirmButton).toBeDisabled());
  });
});
