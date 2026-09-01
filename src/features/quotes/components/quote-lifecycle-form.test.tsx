import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteLifecycleForm } from "./quote-lifecycle-form";

describe("QuoteLifecycleForm", () => {
  it("requires a reason before confirming archive and calls the action with it", async () => {
    const action = vi.fn();
    const user = userEvent.setup();
    render(<QuoteLifecycleForm action={action} mode="archive" quoteNumber="C-001" />);

    await user.click(screen.getByRole("button", { name: /archivar cotización c-001/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Motivo")).toBeRequired();

    await user.type(screen.getByLabelText("Motivo"), "Reference pricing retained");
    await user.click(screen.getByRole("button", { name: /^archivar cotización$/i }));

    await waitFor(() => expect(action).toHaveBeenCalledWith("Reference pricing retained"));
  });

  it("shows an inline error and does not call the action when the reason is too short", async () => {
    const action = vi.fn();
    const user = userEvent.setup();
    render(<QuoteLifecycleForm action={action} mode="archive" quoteNumber="C-001" />);

    await user.click(screen.getByRole("button", { name: /archivar cotización c-001/i }));
    await user.type(screen.getByLabelText("Motivo"), "ab");
    await user.click(screen.getByRole("button", { name: /^archivar cotización$/i }));

    await waitFor(() =>
      expect(screen.getByText(/mínimo 3 caracteres/i)).toBeInTheDocument(),
    );
    expect(action).not.toHaveBeenCalled();
  });

  it("keeps the restore flow on its custom dialog and confirms restore", async () => {
    const action = vi.fn();
    const user = userEvent.setup();
    render(<QuoteLifecycleForm action={action} mode="restore" quoteNumber="C-001" />);

    await user.click(screen.getByRole("button", { name: /restaurar cotización c-001/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar restaurar cotización" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("Motivo"), "Restore for review");
    await user.click(screen.getByRole("button", { name: /^restaurar cotización$/i }));

    await waitFor(() => expect(action).toHaveBeenCalledWith("Restore for review"));
  });
});