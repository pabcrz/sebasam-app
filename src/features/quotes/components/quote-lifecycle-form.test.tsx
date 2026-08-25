import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteLifecycleForm } from "./quote-lifecycle-form";

describe("QuoteLifecycleForm", () => {
  it("requires a reason before explicitly confirming archive", async () => {
    const action = vi.fn();
    const user = userEvent.setup();
    render(<QuoteLifecycleForm action={action} mode="archive" quoteNumber="C-001" />);

    await user.click(screen.getByRole("button", { name: /archivar cotización c-001/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar archivar cotización" })).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveClass("overflow-hidden");
    expect(screen.getByLabelText("Motivo")).toBeRequired();

    await user.type(screen.getByLabelText("Motivo"), "Reference pricing retained");
    await user.click(screen.getByRole("button", { name: /^archivar cotización$/i }));

    await waitFor(() => expect(action).toHaveBeenCalledWith("Reference pricing retained"));
  });
});
