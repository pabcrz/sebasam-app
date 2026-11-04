import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { QuoteFilterInput } from "@/features/quotes/schemas";
import { QuoteFilters } from "./quote-filters";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("lucide-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("lucide-react")>();
  return {
    ...actual,
    ChevronDown: ({ ...props }: React.SVGAttributes<SVGSVGElement>) => (
      <svg data-testid="chevron-down-icon" {...props} />
    ),
    Filter: ({ ...props }: React.SVGAttributes<SVGSVGElement>) => (
      <svg data-testid="filter-icon" {...props} />
    ),
    X: ({ ...props }: React.SVGAttributes<SVGSVGElement>) => (
      <svg data-testid="x-icon" {...props} />
    ),
  };
});

const customers = [
  { id: "cust-1", name: "Constructora del Norte" },
  { id: "cust-2", name: "Talleres Unidos" },
];

function renderFilters(filters: Partial<QuoteFilterInput> = {}) {
  const mergedFilters = { showCancelled: false, showArchived: false, ...filters } as QuoteFilterInput;
  return render(<QuoteFilters filters={mergedFilters} customers={customers} />);
}

describe("QuoteFilters", () => {
  beforeEach(() => push.mockClear());

  it.each([
    [{ showCancelled: true }, "Canceladas"],
    [{ showArchived: true }, "Archivadas"],
    [{ showCancelled: true, showArchived: true }, "Todas"],
    [{ status: "DRAFT", showArchived: true }, "Borrador"],
  ] as const)("preserves active status selection for %j", (filters, label) => {
    renderFilters(filters);
    expect(screen.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
  });

  it("preserves status URLs, false order filters and dates while dropping visibility flags and pagination", () => {
    renderFilters({
      customerId: "cust-1", number: "C 001", plate: "ABC-123", hasWorkOrder: false,
      dateFrom: new Date("2026-01-01T00:00:00Z"), dateTo: new Date("2026-01-31T00:00:00Z"),
      showCancelled: true, showArchived: true,
    });

    const query = "customerId=cust-1&number=C+001&plate=ABC-123&dateFrom=2026-01-01&dateTo=2026-01-31&hasWorkOrder=false";
    expect(screen.getByRole("link", { name: "Enviadas" })).toHaveAttribute("href", `/admin/quotes?status=SENT&${query}`);
    expect(screen.getByRole("link", { name: "Todas" })).toHaveAttribute("href", `/admin/quotes?${query}`);
    expect(screen.getByText("8 filtros activos")).toBeInTheDocument();
    for (const summary of ["Cliente: Constructora del Norte", "Folio: C 001", "Placas: ABC-123", "Desde: 2026-01-01", "Hasta: 2026-01-31", "Sin Orden", "Mostrar canceladas", "Mostrar archivadas"]) {
      expect(screen.getByText(summary)).toBeInTheDocument();
    }
  });

  it("preserves the base all-status URL and unknown customer summary", () => {
    renderFilters({ customerId: "missing-customer" });
    expect(screen.getByText("Cliente: missing-customer")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Todas" })).toHaveAttribute("href", "/admin/quotes?customerId=missing-customer");
  });

  it("submits trimmed fields, false order and dates without pagination", async () => {
    const user = userEvent.setup();
    renderFilters({ hasWorkOrder: false, dateFrom: new Date("2026-01-01T00:00:00Z"), dateTo: new Date("2026-01-31T00:00:00Z") });
    await user.click(screen.getByRole("button", { name: /mostrar filtros/i }));
    await user.type(screen.getByLabelText("Folio"), " C-001 ");
    await user.type(screen.getByLabelText("Placas"), "   ");
    await user.click(screen.getByRole("button", { name: /filtrar/i }));
    expect(push).toHaveBeenCalledExactlyOnceWith("/admin/quotes?hasWorkOrder=false&number=C-001&dateFrom=2026-01-01&dateTo=2026-01-31");
  });

  it("preserves the trailing query marker when submitting an empty form", async () => {
    const user = userEvent.setup();
    renderFilters();
    await user.click(screen.getByRole("button", { name: /mostrar filtros/i }));
    await user.click(screen.getByRole("button", { name: /filtrar/i }));
    expect(push).toHaveBeenCalledExactlyOnceWith("/admin/quotes?");
  });

  it("allows keyboard expansion and collapses without navigation", async () => {
    const user = userEvent.setup();
    renderFilters();
    const toggle = screen.getByRole("button", { name: /mostrar filtros/i });
    toggle.focus();
    await user.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Todas" })).toHaveAttribute("href", "/admin/quotes");
  });

  it("keeps filter fields collapsed by default", () => {
    renderFilters();

    expect(screen.getByRole("navigation", { name: "Filtros directos por estado" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Todas" })).toHaveAttribute("aria-current", "page");
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
    const { getByText } = renderFilters({ showCancelled: false });

    expect(getByText("Sin filtros activos")).toBeInTheDocument();
    // "Limpiar" button should not be present when there are no active filters
    expect(() => screen.getByRole("button", { name: /limpiar/i })).toThrow();
  });

  it("shows active filter count and 'Limpiar' button when filters are active", () => {
    renderFilters({ status: "DRAFT", showCancelled: false });

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

  it("submits the explicit archived filter", async () => {
    const user = userEvent.setup();
    renderFilters({ showArchived: true });

    await user.click(screen.getByRole("button", { name: /mostrar filtros/i }));
    await user.click(screen.getByRole("button", { name: /filtrar/i }));

    expect(push).toHaveBeenCalledWith("/admin/quotes?showArchived=true");
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
