import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteBuilderDialog } from "./quote-builder-dialog";

const customers = [
  { id: "cust-1", name: "Constructora del Norte" },
  { id: "cust-2", name: "Taller Hermanos Pérez" },
];

describe("QuoteBuilderDialog", () => {
  it("renders the launch button and opens the dialog with the quote builder", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilderDialog customers={customers} createAction={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Nueva cotización" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByTestId("quote-builder-form")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Nueva cotización" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("quote-builder-form")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Crear cotización en borrador" })).toBeInTheDocument();
  });

  it("passes customers and the create action to the quote builder", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(<QuoteBuilderDialog customers={customers} createAction={action} />);

    await user.click(screen.getByRole("button", { name: "Nueva cotización" }));

    expect(screen.getByRole("combobox", { name: /cliente/i })).toBeInTheDocument();

    const hiddenSelect = document.querySelector('select[name="customerId"]');
    expect(hiddenSelect).toBeInTheDocument();
    expect(hiddenSelect).toHaveValue("");

    const options = Array.from(hiddenSelect?.querySelectorAll("option") ?? []);
    expect(options.map((option) => option.textContent?.trim() ?? "")).toEqual(
      expect.arrayContaining(["", "Constructora del Norte", "Taller Hermanos Pérez"]),
    );
  });
});
