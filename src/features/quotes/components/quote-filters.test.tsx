import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { parseOperationalQuoteParams, quotesHref } from "../quote-filter-model";
type QuoteFiltersInput = Partial<ReturnType<typeof parseOperationalQuoteParams>>;
import { QuoteFilters } from "./quote-filters";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const customers = [
  { id: "cust-1", name: "Constructora del Norte" },
  { id: "cust-2", name: "Talleres Unidos" },
];

function renderFilters(filters: QuoteFiltersInput = {}) {
  const mergedFilters = { showCancelled: false, showArchived: false, ...filters } as ReturnType<typeof parseOperationalQuoteParams>;
  return render(<QuoteFilters filters={mergedFilters} customers={customers} />);
}

async function openSheet(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /^filtros/i }));
  return within(screen.getByRole("dialog"));
}

describe("QuoteFilters status and search", () => {
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

  it("reaches every status through the tabs, including cancelled and archived", () => {
    renderFilters();
    expect(screen.getByRole("link", { name: "Canceladas" })).toHaveAttribute("href", "/admin/quotes?status=CANCELLED");
    expect(screen.getByRole("link", { name: "Archivadas" })).toHaveAttribute("href", "/admin/quotes?status=ARCHIVED");
    expect(screen.getByRole("link", { name: "Declinadas" })).toHaveAttribute("href", "/admin/quotes?status=REJECTED");
  });

  it("preserves every applied criterion in status URLs and names each one as a chip", () => {
    renderFilters({
      customerId: "cust-1", number: "C 001", plate: "ABC-123", hasWorkOrder: false,
      dateFrom: new Date("2026-01-01T00:00:00Z"), dateTo: new Date("2026-01-31T00:00:00Z"),
      showCancelled: true, showArchived: true,
    });

    const input = parseOperationalQuoteParams({ customerId: "cust-1", number: "C 001", plate: "ABC-123", dateFrom: "2026-01-01", dateTo: "2026-01-31", hasWorkOrder: false, showArchived: true, showCancelled: true });
    expect(screen.getByRole("link", { name: "Enviadas" })).toHaveAttribute("href", quotesHref({ ...input, status: "SENT" }));
    expect(screen.getByRole("link", { name: "Todas" })).toHaveAttribute("href", quotesHref(input));
    for (const chip of ["Folio: C 001", "Cliente: Constructora del Norte", "Placas: ABC-123", "Fecha: 2026-01-01 – 2026-01-31", "Sin orden de trabajo", "Incluye canceladas", "Incluye archivadas"]) {
      expect(screen.getByRole("button", { name: `Quitar filtro: ${chip}` })).toBeInTheDocument();
    }
  });

  it("preserves the base all-status URL and unknown customer name", () => {
    renderFilters({ customerId: "missing-customer" });
    expect(screen.getByRole("button", { name: "Quitar filtro: Cliente: missing-customer" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Todas" })).toHaveAttribute("href", "/admin/quotes?customerId=missing-customer");
  });

  it("searches the folio on Enter while keeping every other criterion and resetting pagination", async () => {
    const user = userEvent.setup();
    renderFilters({ hasWorkOrder: false, dateFrom: new Date("2026-01-01T00:00:00Z"), dateTo: new Date("2026-01-31T00:00:00Z"), page: 3 });
    await user.type(screen.getByRole("searchbox", { name: "Buscar por folio" }), " C-001 {Enter}");
    expect(push).toHaveBeenCalledExactlyOnceWith("/admin/quotes?number=C-001&dateFrom=2026-01-01&dateTo=2026-01-31&hasWorkOrder=false");
  });

  it("searches the folio without a bare query when the text is cleared", async () => {
    const user = userEvent.setup();
    renderFilters({ number: "C-001" });
    await user.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));
    expect(push).toHaveBeenCalledExactlyOnceWith("/admin/quotes");
  });

  it("keeps the search value in sync with the folio in the URL", () => {
    renderFilters({ number: "C-001" });
    expect(screen.getByRole("searchbox", { name: "Buscar por folio" })).toHaveValue("C-001");
  });
});

describe("QuoteFilters sheet", () => {
  beforeEach(() => push.mockClear());
  afterEach(() => {
    vi.useRealTimers();
  });

  it("removes the 13-field form and the Estatus control; statuses live in the tabs", async () => {
    const user = userEvent.setup();
    renderFilters();
    const sheet = await openSheet(user);
    expect(sheet.queryByLabelText("Estatus")).not.toBeInTheDocument();
    expect(sheet.queryByRole("combobox", { name: "Estatus" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Estatus" })).not.toBeInTheDocument();
  });

  it("offers exactly the date, work-order and type filters as the primary choices", async () => {
    const user = userEvent.setup();
    renderFilters();
    const sheet = await openSheet(user);
    for (const label of ["Hoy", "Esta semana", "Este mes", "Mes pasado", "Elegir fechas", "Con orden", "Sin orden", "Trabajo", "Venta"]) {
      expect(sheet.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("shows the result action without a count, because the page has no total", async () => {
    const user = userEvent.setup();
    renderFilters();
    const sheet = await openSheet(user);
    expect(sheet.getByRole("button", { name: "Ver resultados" })).toBeInTheDocument();
    expect(sheet.getByRole("button", { name: "Limpiar" })).toBeInTheDocument();
  });

  it("applies a shortcut date range from the sheet with the Mexico City calendar day", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // 2026-11-11 18:00 UTC is 12:00 in Mexico City; the same day for both zones.
    vi.setSystemTime(new Date("2026-11-11T18:00:00Z"));
    const user = userEvent.setup();
    renderFilters({ kind: "SALE" });
    const sheet = await openSheet(user);
    await user.click(sheet.getByRole("button", { name: "Este mes" }));
    await user.click(sheet.getByRole("button", { name: "Ver resultados" }));
    expect(push).toHaveBeenCalledExactlyOnceWith("/admin/quotes?dateFrom=2026-11-01&dateTo=2026-11-30&kind=SALE");
  });

  it("applies the work-order and type choices from the sheet", async () => {
    const user = userEvent.setup();
    renderFilters();
    const sheet = await openSheet(user);
    await user.click(sheet.getByRole("button", { name: "Sin orden" }));
    await user.click(sheet.getByRole("button", { name: "Trabajo" }));
    await user.click(sheet.getByRole("button", { name: "Ver resultados" }));
    expect(push).toHaveBeenCalledExactlyOnceWith("/admin/quotes?kind=WORK&hasWorkOrder=false");
  });

  it("applies a custom range and blocks an inverted one without navigation", async () => {
    const user = userEvent.setup();
    renderFilters({ customerId: "cust-1" });
    const sheet = await openSheet(user);
    await user.click(sheet.getByRole("button", { name: "Elegir fechas" }));
    await user.type(sheet.getByLabelText("Desde"), "2026-08-31");
    await user.type(sheet.getByLabelText("Hasta"), "2026-08-01");
    await user.click(sheet.getByRole("button", { name: "Ver resultados" }));
    expect(sheet.getByRole("alert")).toHaveTextContent("La fecha operativa desde no puede ser posterior a hasta");
    expect(push).not.toHaveBeenCalled();
    expect(sheet.getByLabelText("Desde")).toHaveValue("2026-08-31");
  });

  it("keeps the capabilities of the removed fields reachable in the sheet", async () => {
    const user = userEvent.setup();
    renderFilters();
    const sheet = await openSheet(user);
    await user.type(sheet.getByLabelText("Concepto"), "aceite");
    await user.type(sheet.getByLabelText("Placas"), "ABC-123");
    await user.type(sheet.getByLabelText("ECO"), "ECO-42");
    await user.click(sheet.getByRole("checkbox", { name: "Incluir canceladas" }));
    await user.click(sheet.getByRole("checkbox", { name: "Incluir archivadas" }));
    await user.click(sheet.getByRole("button", { name: "Ver resultados" }));
    expect(push).toHaveBeenCalledExactlyOnceWith("/admin/quotes?concept=aceite&plate=ABC-123&economicNumber=ECO-42&showArchived=true&showCancelled=true");
  });

  it("clears the sheet draft without navigating, then the clear-all control navigates to the base list", async () => {
    const user = userEvent.setup();
    renderFilters({ kind: "WORK" });
    const sheet = await openSheet(user);
    await user.click(sheet.getByRole("button", { name: "Limpiar" }));
    expect(push).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(push).toHaveBeenCalledWith("/admin/quotes");
  });
});

describe("QuoteFilters active chips", () => {
  beforeEach(() => push.mockClear());

  it("renders legacy URL criteria as removable chips and reads concept, ECO and type from old links", () => {
    renderFilters({ concept: "aceite", economicNumber: "ECO-42", kind: "SALE", showArchived: true, page: 3 });
    for (const label of ["Concepto: aceite", "ECO: ECO-42", "Tipo: Venta", "Incluye archivadas"]) {
      expect(screen.getByRole("button", { name: `Quitar filtro: ${label}` })).toBeInTheDocument();
    }
  });

  it("removes one chip by pushing the URL without that criterion", async () => {
    const user = userEvent.setup();
    renderFilters({ status: "APPROVED", kind: "SALE", number: "C-001" });
    await user.click(screen.getByRole("button", { name: "Quitar filtro: Tipo: Venta" }));
    expect(push).toHaveBeenCalledExactlyOnceWith("/admin/quotes?number=C-001&status=APPROVED");
  });

  it("shows no chip row when nothing is active", () => {
    renderFilters();
    expect(screen.queryByRole("group", { name: "Filtros activos" })).not.toBeInTheDocument();
  });

  it("reports the inverted incoming range as an alert and opens the sheet to correct it", () => {
    render(<QuoteFilters filters={parseOperationalQuoteParams({ customerId: "cust-1" })} customers={customers} rejectedDateRange={{ from: "2026-08-31", to: "2026-08-01" }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("La fecha operativa desde no puede ser posterior a hasta");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
