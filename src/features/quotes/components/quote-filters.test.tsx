import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteFilters } from "./quote-filters";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("lucide-react", () => ({
  Filter: ({ ...props }: React.SVGAttributes<SVGSVGElement>) => (
    <svg data-testid="filter-icon" {...props} />
  ),
  X: ({ ...props }: React.SVGAttributes<SVGSVGElement>) => (
    <svg data-testid="x-icon" {...props} />
  ),
}));

const customers = [
  { id: "cust-1", name: "Constructora del Norte" },
  { id: "cust-2", name: "Talleres Unidos" },
];

function renderFilters(filters = {}) {
  return render(<QuoteFilters filters={filters} customers={customers} />);
}

describe("QuoteFilters", () => {
  it("renders all filter fields", () => {
    renderFilters();

    expect(screen.getByLabelText("Estatus")).toBeInTheDocument();
    expect(screen.getByLabelText("Cliente")).toBeInTheDocument();
    expect(screen.getByLabelText("Folio")).toBeInTheDocument();
    expect(screen.getByLabelText("Placas")).toBeInTheDocument();
    expect(screen.getByLabelText("Desde")).toBeInTheDocument();
    expect(screen.getByLabelText("Hasta")).toBeInTheDocument();
  });

  it("shows the clear button only when filters are active", () => {
    const { rerender } = renderFilters();

    expect(screen.queryByRole("button", { name: /limpiar/i })).not.toBeInTheDocument();

    rerender(<QuoteFilters filters={{ status: "DRAFT" }} customers={customers} />);

    expect(screen.getByRole("button", { name: /limpiar/i })).toBeInTheDocument();
  });

  it("pushes filter params to the router on submit", async () => {
    const user = userEvent.setup();
    renderFilters();

    await user.type(screen.getByLabelText("Folio"), "C-001");
    await user.click(screen.getByRole("button", { name: /filtrar/i }));

    expect(push).toHaveBeenCalledWith("/admin/quotes?number=C-001");
  });

  it("clears filters when the clear button is clicked", async () => {
    const user = userEvent.setup();
    renderFilters({ status: "DRAFT" });

    await user.click(screen.getByRole("button", { name: /limpiar/i }));

    expect(push).toHaveBeenCalledWith("/admin/quotes");
  });

  it("renders customer options", async () => {
    const user = userEvent.setup();
    renderFilters();

    await user.click(screen.getByLabelText("Cliente"));

    expect(screen.getAllByText("Constructora del Norte").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Talleres Unidos").length).toBeGreaterThanOrEqual(1);
  });
});
