import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteCancelForm } from "./quote-cancel-form";

describe("QuoteCancelForm", () => {
  it("opens a confirmation dialog and submits the hidden form", async () => {
    const user = userEvent.setup();
    const action = vi.fn();

    render(<QuoteCancelForm action={action} quoteId="quote-1" quoteNumber="Q-123" />);

    await user.click(screen.getByRole("button", { name: "Cancelar cotización" }));

    expect(screen.getByRole("dialog")).toHaveTextContent(/confirmas cancelar Q-123/i);

    await user.click(screen.getByRole("button", { name: "Sí, cancelar" }));

    expect(action).toHaveBeenCalledTimes(1);

    const formData = action.mock.calls[0][0] as FormData;
    expect(formData.get("quoteId")).toBe("quote-1");
  });

  it("closes the dialog when clicking back", async () => {
    const user = userEvent.setup();
    const action = vi.fn();

    render(<QuoteCancelForm action={action} quoteId="quote-1" quoteNumber="Q-123" />);

    await user.click(screen.getByRole("button", { name: "Cancelar cotización" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Volver" }));

    expect(action).not.toHaveBeenCalled();
  });
});
