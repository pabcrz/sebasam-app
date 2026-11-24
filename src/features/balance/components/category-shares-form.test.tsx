import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CategorySharesForm } from "./category-shares-form";

describe("CategorySharesForm", () => {
  it("shows one bounded percentage per category with its current value", () => {
    render(<CategorySharesForm shares={{ FUEL_TRANSPORT: 30, RENT: 0 }} action={vi.fn()} />);

    const rows = screen.getAllByTestId("category-share-row");
    expect(rows).toHaveLength(10);
    const fuel = screen.getByLabelText("Combustible y traslados");
    expect(fuel).toHaveValue(30);
    expect(fuel).toHaveAttribute("min", "0");
    expect(fuel).toHaveAttribute("max", "100");
    expect(fuel).toHaveAttribute("name", "share-FUEL_TRANSPORT");
    expect(within(rows[0]).getByLabelText("Renta")).toHaveValue(0);
    expect(screen.getByRole("button", { name: "Guardar porcentajes" })).toBeInTheDocument();
  });

  it("says it only applies to new expenses, and shows a notice with the right role", () => {
    render(<CategorySharesForm shares={{}} action={vi.fn()} notice={{ tone: "danger", text: "Revisa" }} />);
    expect(screen.getByText(/solo aplica a gastos nuevos/i)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Revisa");
  });
});
