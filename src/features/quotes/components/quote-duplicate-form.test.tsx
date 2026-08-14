import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteDuplicateForm } from "./quote-duplicate-form";

describe("QuoteDuplicateForm", () => {
  it("restores the action for retry and exposes an error when duplication fails", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockRejectedValue(new Error("offline"));
    render(<QuoteDuplicateForm quoteId="quote-1" action={action} />);

    await user.click(screen.getByRole("button", { name: "Duplicar cotización" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo duplicar la cotización");
    expect(screen.getByRole("button", { name: "Duplicar cotización" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Duplicar cotización" }));
    expect(action).toHaveBeenCalledTimes(2);
  });
});
