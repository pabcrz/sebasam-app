import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { parseOperationalQuoteParams, quotesHref } from "../quote-filter-model";
type QuoteFiltersInput = Partial<ReturnType<typeof parseOperationalQuoteParams>>;
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

function renderFilters(filters: QuoteFiltersInput = {}) {
  const mergedFilters = { showCancelled: false, showArchived: false, ...filters } as ReturnType<typeof parseOperationalQuoteParams>;
  return render(<QuoteFilters filters={mergedFilters} customers={customers} />);
}

describe("QuoteFilters", () => {
  beforeEach(() => push.mockClear());

  it.each([
    [{ showCancelled: true }, "Todas"],
    [{ showArchived: true }, "Todas"],
    [{ showCancelled: true, showArchived: true }, "Todas"],
    [{ status: "DRAFT", showArchived: true }, "Borrador"],
  ] as const)("preserves active status selection for %j", (filters, label) => {
    renderFilters(filters);
    expect(screen.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
  });

  it("preserves every applied criterion in status URLs while resetting pagination", () => {
    renderFilters({
      customerId: "cust-1", number: "C 001", plate: "ABC-123", hasWorkOrder: false,
      dateFrom: new Date("2026-01-01T00:00:00Z"), dateTo: new Date("2026-01-31T00:00:00Z"),
      showCancelled: true, showArchived: true,
    });

    const input = parseOperationalQuoteParams({ customerId: "cust-1", number: "C 001", plate: "ABC-123", dateFrom: "2026-01-01", dateTo: "2026-01-31", hasWorkOrder: false, showArchived: true, showCancelled: true });
    expect(screen.getByRole("link", { name: "Enviadas" })).toHaveAttribute("href", quotesHref({ ...input, status: "SENT" }));
    expect(screen.getByRole("link", { name: "Todas" })).toHaveAttribute("href", quotesHref(input));
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
    expect(push).toHaveBeenCalledExactlyOnceWith("/admin/quotes?number=C-001&dateFrom=2026-01-01&dateTo=2026-01-31&hasWorkOrder=false");
  });

  it("uses the canonical query-free URL when submitting an empty form", async () => {
    const user = userEvent.setup();
    renderFilters();
    await user.click(screen.getByRole("button", { name: /mostrar filtros/i }));
    await user.click(screen.getByRole("button", { name: /filtrar/i }));
    expect(push).toHaveBeenCalledExactlyOnceWith("/admin/quotes");
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

  it("keeps collapsed filter actions inline and wrappable without full-width buttons", () => {
    renderFilters({ status: "DRAFT" });

    const toggle = screen.getByRole("button", { name: "Mostrar filtros" });
    const clear = screen.getByRole("button", { name: "Limpiar" });
    expect(toggle.parentElement).toHaveClass("flex-wrap", "items-center");
    expect(toggle.parentElement).not.toHaveClass("flex-col");
    expect(toggle).not.toHaveClass("w-full");
    expect(clear).not.toHaveClass("w-full");
    expect(screen.getByText("1 filtro activo")).toBeInTheDocument();
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


describe("operational Quote filter controls", () => {
  beforeEach(() => push.mockClear());

  it("submits and summarizes concept, ECO and type together with existing criteria", async () => {
    const user = userEvent.setup();
    renderFilters({ concept: "aceite", economicNumber: "ECO-42", kind: "SALE", customerId: "cust-1", hasWorkOrder: false, showArchived: true, page: 3 });
    for (const label of ["Concepto: aceite", "ECO: ECO-42", "Tipo: Venta", "Cliente: Constructora del Norte", "Sin Orden", "Mostrar archivadas"]) expect(screen.getByText(label)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mostrar filtros" }));
    expect(screen.getByLabelText("Concepto")).toHaveValue("aceite");
    expect(screen.getByLabelText("ECO")).toHaveValue("ECO-42");
    expect(screen.getByLabelText("Tipo de operación")).toHaveTextContent("Venta");
    expect(screen.getByText("Fecha operativa de cotización (ambos días incluidos)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(push).toHaveBeenCalledExactlyOnceWith("/admin/quotes?concept=aceite&customerId=cust-1&economicNumber=ECO-42&showArchived=true&kind=SALE&hasWorkOrder=false");
  });

  it("keeps quick access and selector on one status URL state with independent visibility", async () => {
    const user = userEvent.setup();
    const filters = { status: "DRAFT" as const, concept: "aceite", kind: "WORK" as const, showArchived: true, showCancelled: true, page: 4 };
    const view = renderFilters(filters);
    const expected = "/admin/quotes?concept=aceite&showArchived=true&showCancelled=true&kind=WORK&status=SENT";
    expect(screen.getByRole("link", { name: "Enviadas" })).toHaveAttribute("href", expected);
    await user.click(screen.getByRole("button", { name: "Mostrar filtros" }));
    await user.click(screen.getByLabelText("Estatus"));
    await user.click(screen.getByRole("option", { name: "Enviada" }));
    expect(push).toHaveBeenCalledExactlyOnceWith(expected);
    view.rerender(<QuoteFilters filters={parseOperationalQuoteParams({ ...filters, status: "SENT" })} customers={customers} />);
    expect(screen.getByRole("link", { name: "Enviadas" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByLabelText("Estatus")).toHaveTextContent("Enviada");
    expect(screen.queryByText("Mostrar archivadas", { selector: "span" })).not.toBeInTheDocument();
  });

  it("blocks inverted dates in the form without navigation or broadening filters", async () => {
    const user = userEvent.setup();
    renderFilters({ customerId: "cust-1" });
    await user.click(screen.getByRole("button", { name: "Mostrar filtros" }));
    await user.type(screen.getByLabelText("Desde"), "2026-08-31");
    await user.type(screen.getByLabelText("Hasta"), "2026-08-01");
    await user.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(screen.getByRole("alert")).toHaveTextContent("La fecha operativa desde no puede ser posterior a hasta");
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Desde")).toHaveValue("2026-08-31");
  });
});
