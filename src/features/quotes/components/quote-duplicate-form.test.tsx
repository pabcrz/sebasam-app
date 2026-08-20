import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import { QuoteDuplicateForm } from "./quote-duplicate-form";

describe("QuoteDuplicateForm", () => {
  it("restores the action for retry and triggers error toast when duplication fails", async () => {
    const user = userEvent.setup();
    const toastError = vi.spyOn(toast, "error");
    const action = vi.fn().mockRejectedValue(new Error("offline"));
    render(<QuoteDuplicateForm quoteId="quote-1" action={action} />);

    await user.click(screen.getByRole("button", { name: "Duplicar cotización" }));

    expect(toastError).toHaveBeenCalledWith(
      "No se pudo duplicar la cotización. Intenta de nuevo.",
      { id: "quote-duplicate-error" }
    );
    expect(screen.getByRole("button", { name: "Duplicar cotización" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Duplicar cotización" }));
    expect(action).toHaveBeenCalledTimes(2);
  });
});

