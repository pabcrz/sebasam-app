import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { QuoteFilterInput } from "@/features/quotes/schemas";
import { QuoteFilters } from "./quote-filters";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("lucide-react", () => ({
  ChevronDown: ({ ...props }: React.SVGAttributes<SVGSVGElement>) => (
    <svg data-testid="chevron-down-icon" {...props} />
  ),
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

function renderFilters(filters: Partial<QuoteFilterInput> = {}) {
  const mergedFilters = { showCancelled: false, ...filters };
  return render(<QuoteFilters filters={mergedFilters} customers={customers} />);
}

describe("QuoteFilters", () => {
  it("keeps filter fields collapsed by default", () => {
    renderFilters();

    expect(screen.getByRole("button", { name: /mostrar filtros/i })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("Estatus")).not.toBeInTheDocument();
  });

  it("opens and closes filter fields from the toggle", async () => {
    const user = userEvent.setup();
    renderFilters();

    await user.click(screen.getByRole("button", { name: /mostrar filtros/i }));

    expect(screen.getByRole("button", { name: /ocultar filtros/i })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Estatus")).toBeInTheDocument();
    expect(screen.getByLabelText("Cliente")).toBeInTheDocument();
    expect(screen.getByLabelText("Folio")).toBeInTheDocument();
    expect(screen.getByLabelText("Placas")).toBeInTheDocument();
    expect(screen.getByLabelText("Desde")).toBeInTheDocument();
    expect(screen.getByLabelText("Hasta")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /ocultar filtros/i }));

    expect(screen.queryByLabelText("Estatus")).not.toBeInTheDocument();
  });

  it("shows the clear button only when filters are active", () => {
    const { getByRole, getByText } = renderFilters({ showCancelled: false });

    expect(getByText("Sin filtros activos")).toBeInTheDocument();
    // "Limpiar" button should not be present when there are no active filters
    expect(() => getByRole("button", { name: /limpiar/i })).toThrow();
  });

  it("shows active filter count and 'Limpiar' button when filters are active", () => {
    const { getByRole, getByText } = renderFilters({ status: "DRAFT", showCancelled: false });

    expect(screen.getByRole("button", { name: /limpiar/i })).toBeInTheDocument();
  });

  it("pushes filter params to the router on submit", async () => {
    const user = userEvent.setup();
    renderFilters();

    await user.click(screen.getByRole("button", { name: /mostrar filtros/i }));
    await user.type(screen.getByLabelText("Folio"), "C-001");
    await user.click(screen.getByRole("button", { name: /filtrar/i }));

    expect(push).toHaveBeenCalledWith("/admin/quotes?number=C-001");
  });

  it("preserves an explicit cancelled filter and resets pagination on submit", async () => {
    const user = userEvent.setup();
    renderFilters({ showCancelled: true });

    await user.click(screen.getByRole("button", { name: /mostrar filtros/i }));
    await user.click(screen.getByRole("button", { name: /filtrar/i }));

    expect(push).toHaveBeenCalledWith("/admin/quotes?showCancelled=true");
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

    await user.click(screen.getByRole("button", { name: /mostrar filtros/i }));
    await user.click(screen.getByLabelText("Cliente"));

    expect(screen.getAllByText("Constructora del Norte").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Talleres Unidos").length).toBeGreaterThanOrEqual(1);
  });

  it("summarizes active filters while collapsed", () => {
    renderFilters({ status: "DRAFT", customerId: "cust-1", number: "C-001" });

    expect(screen.getByText("3 filtros activos")).toBeInTheDocument();
    expect(screen.getByText("Estatus: Borrador")).toBeInTheDocument();
    expect(screen.getByText("Cliente: Constructora del Norte")).toBeInTheDocument();
    expect(screen.getByText("Folio: C-001")).toBeInTheDocument();
    expect(screen.queryByLabelText("Estatus")).not.toBeInTheDocument();
  });
});
