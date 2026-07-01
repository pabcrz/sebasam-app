import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteBuilderDialog } from "./quote-builder-dialog";

const customers = [{ id: "1", name: "Acme" }];

describe("QuoteBuilderDialog", () => {
  it("opens and closes via the X button", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilderDialog customers={customers} createAction={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Nueva cotización" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("closes via the Cancel button on the first step", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilderDialog customers={customers} createAction={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Nueva cotización" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("does not close when clicking the overlay", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilderDialog customers={customers} createAction={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Nueva cotización" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const overlay = document.querySelector("[data-dialog-overlay]");
    expect(overlay).not.toBeNull();
    if (overlay instanceof HTMLElement) {
      await user.click(overlay);
    }

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveAttribute("data-state", "open");
  });

  it("keeps the dialog open when selecting a customer from the portaled dropdown", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilderDialog customers={customers} createAction={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Nueva cotización" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Cliente" }));
    const option = await screen.findByRole("option", { name: "Acme" });
    await user.click(option);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveAttribute("data-state", "open");
  });
});
