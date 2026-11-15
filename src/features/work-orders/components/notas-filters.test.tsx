import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseNotasParams } from "../notas-period";
import { NotasFilters } from "./notas-filters";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

/** Pins only Date, so PeriodNavigator decides "En curso" and "Hoy" from a known day. */
function freezeClock(iso: string) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(iso));
}

describe("NotasFilters", () => {
  beforeEach(() => push.mockClear());
  afterEach(() => vi.useRealTimers());
  const masters = [{ id: "a0b1c2d3-1234-4abc-8def-1234567890ab", displayName: "Ana Maestra" }];

  it("selects All, WORK, or SALE note kinds", () => {
    render(<NotasFilters mode="week" payment="all" assignee="all" kind="all" anchor="2026-08-05" rangeLabel="3–8 de agosto de 2026" isCurrentWeek={false} masters={masters} />);

    const kindSelector = screen.getByLabelText("Tipo de nota");
    expect(kindSelector).toHaveValue("all");
    expect(kindSelector).toHaveDisplayValue("Todas");
    fireEvent.change(kindSelector, { target: { value: "WORK" } });
    expect(push).toHaveBeenCalledWith(expect.stringContaining("kind=WORK"));
  });

  it("keeps payment when changing period or mode and resets pagination", () => {
    freezeClock("2026-08-06T12:00:00Z");
    render(<NotasFilters mode="week" payment="paid" assignee="workshop" anchor="2026-08-05" rangeLabel="3–8 de agosto de 2026" isCurrentWeek masters={masters} />);
    expect(screen.getByRole("group", { name: "Estado de pago" })).toBeInTheDocument();
    expect(screen.getByText("3–8 de agosto de 2026")).toBeVisible();
    expect(screen.getByText("En curso")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Hoy" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Periodo anterior" }));
    expect(push).toHaveBeenLastCalledWith("/admin/notas?mode=week&anchor=2026-07-27&payment=paid&assignee=workshop&kind=all");
    fireEvent.click(screen.getByRole("button", { name: "Periodo siguiente" }));
    expect(push).toHaveBeenLastCalledWith("/admin/notas?mode=week&anchor=2026-08-10&payment=paid&assignee=workshop&kind=all");

    expect(screen.getByRole("button", { name: "Pendientes" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Pagadas" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Pendientes" }));
    expect(push).toHaveBeenLastCalledWith("/admin/notas?mode=week&anchor=2026-08-05&payment=pending&assignee=workshop&kind=all");

    const views = screen.getByRole("group", { name: "Vista del periodo" });
    fireEvent.click(within(views).getByRole("button", { name: "Mes" }));
    expect(push).toHaveBeenLastCalledWith("/admin/notas?mode=month&anchor=2026-08&payment=paid&assignee=workshop&kind=all");
    expect(push.mock.lastCall![0]).not.toContain("page=");

    fireEvent.click(screen.getByRole("button", { name: /abrir filtros de cartera/i }));
    expect(screen.getByLabelText("Semana")).toHaveAttribute("type", "date");
    fireEvent.change(screen.getByLabelText("Semana"), { target: { value: "2026-08-19" } });
    expect(push).toHaveBeenLastCalledWith("/admin/notas?mode=week&anchor=2026-08-19&payment=paid&assignee=workshop&kind=all");
  });

  it("shows active filter badge count and opens modal with customer, assignee, and overdue filters", async () => {
    const searchCustomersAction = vi.fn().mockResolvedValue([
      { id: "cust-1", name: "Empresa Uno", commercialName: "Comercial Uno", phone: "5512345678" },
    ]);

    render(
      <NotasFilters
        mode="week"
        payment="all"
        assignee="workshop"
        customerId="cust-1"
        overdue="overdue"
        anchor="2026-08-05"
        rangeLabel="3–8 de agosto de 2026"
        isCurrentWeek={false}
        masters={masters}
        selectedCustomer={{ id: "cust-1", name: "Empresa Uno", commercialName: "Comercial Uno" }}
        searchCustomersAction={searchCustomersAction}
      />,
    );

    // Active badge count should be 3 (assignee=workshop, customerId=cust-1, overdue=overdue)
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.queryByText("Filtros aplicados:")).not.toBeInTheDocument();

    const statementLink = screen.getByRole("link", { name: /estado de cuenta/i });
    expect(statementLink).toBeInTheDocument();
    expect(statementLink).toHaveAttribute("href", "/admin/customers/cust-1/estado-de-cuenta");

    // Open filters sheet
    fireEvent.click(screen.getByRole("button", { name: /abrir filtros de cartera/i }));

    expect(screen.getByRole("dialog", { name: "Filtros de cartera" })).toBeInTheDocument();
    expect(screen.getByLabelText("Responsable")).toHaveValue("workshop");
    expect(screen.getByLabelText("Morosidad")).toHaveValue("overdue");
    expect(screen.getByText("Comercial Uno")).toBeInTheDocument();

    // Change assignee and morosidad inside the sheet
    fireEvent.change(screen.getByLabelText("Responsable"), { target: { value: masters[0].id } });
    fireEvent.change(screen.getByLabelText("Morosidad"), { target: { value: "all" } });

    // Apply
    fireEvent.click(screen.getByRole("button", { name: "Ver resultados" }));
    expect(push).toHaveBeenCalledWith(
      expect.stringContaining(`assignee=${masters[0].id}`),
    );
  });

  it("clears filters when clicking Limpiar in the filter sheet", () => {
    render(
      <NotasFilters
        mode="week"
        payment="all"
        assignee="workshop"
        customerId="cust-1"
        anchor="2026-08-05"
        rangeLabel="3–8 de agosto de 2026"
        isCurrentWeek={false}
        masters={masters}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /abrir filtros de cartera/i }));
    fireEvent.click(screen.getByRole("button", { name: "Limpiar" }));

    expect(push).toHaveBeenCalledWith("/admin/notas?mode=week&anchor=2026-08-05&payment=all&assignee=all&kind=all");
  });

  it("debounces remote customer search and allows selecting a customer", async () => {
    vi.useFakeTimers();
    const searchCustomersAction = vi.fn().mockResolvedValue([
      { id: "cust-2", name: "Logística MX", commercialName: "Logística Express", phone: "5599887766" },
    ]);

    render(
      <NotasFilters
        mode="week"
        payment="all"
        assignee="all"
        anchor="2026-08-05"
        rangeLabel="3–8 de agosto de 2026"
        isCurrentWeek={false}
        masters={masters}
        searchCustomersAction={searchCustomersAction}
      />,
    );

    // Open sheet
    fireEvent.click(screen.getByRole("button", { name: /abrir filtros de cartera/i }));

    const searchInput = screen.getByLabelText("Buscar cliente");
    fireEvent.change(searchInput, { target: { value: "Log" } });

    // Not called immediately
    expect(searchCustomersAction).not.toHaveBeenCalled();

    // Fast-forward 500ms debounce
    await vi.advanceTimersByTimeAsync(500);

    expect(searchCustomersAction).toHaveBeenCalledWith({ query: "Log" });
    vi.useRealTimers();
  });

  it("shows the active month with its own label and no current-period marker", () => {
    freezeClock("2026-11-11T12:00:00Z");
    render(<NotasFilters mode="month" payment="all" assignee="all" anchor="2026-08-01" rangeLabel="agosto de 2026" isCurrentWeek={false} masters={masters} />);
    expect(screen.getByText("agosto de 2026")).toBeVisible();
    expect(screen.queryByText("En curso")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Todas" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByLabelText("Mes y año")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /abrir filtros de cartera/i }));
    fireEvent.change(screen.getByLabelText("Mes y año"), { target: { value: "2026-09" } });
    expect(push).toHaveBeenCalledWith("/admin/notas?mode=month&anchor=2026-09&payment=all&assignee=all&kind=all");
  });

  it("routes Hoy to the Mexico City date and keeps the current mode and filters", () => {
    freezeClock("2026-08-19T05:30:00.000Z");

    render(
      <NotasFilters
        mode="week"
        payment="paid"
        assignee="workshop"
        customerId="cust-1"
        overdue="overdue"
        kind="SALE"
        anchor="2026-07-22"
        rangeLabel="3–8 de agosto de 2026"
        isCurrentWeek={false}
        masters={masters}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Hoy" }));
    expect(push).toHaveBeenCalledWith("/admin/notas?mode=week&anchor=2026-08-18&payment=paid&assignee=workshop&customerId=cust-1&overdue=overdue&kind=SALE");
  });

  it("hides Hoy and marks En curso when the shown month is already the current one", () => {
    freezeClock("2026-08-19T05:30:00.000Z");

    render(<NotasFilters mode="month" payment="all" assignee="all" anchor="2026-08-01" rangeLabel="agosto de 2026" isCurrentWeek={false} masters={masters} />);

    expect(screen.getByText("En curso")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Hoy" })).not.toBeInTheDocument();
  });

  it("does not label a non-current week", () => {
    render(<NotasFilters mode="week" payment="all" assignee="all" anchor="2026-08-03" rangeLabel="3–8 de agosto de 2026" isCurrentWeek={false} masters={masters} />);

    expect(screen.queryByText("En curso")).not.toBeInTheDocument();
  });
});


const operationalInput = {
  mode: "week", anchor: "2026-08-05", payment: "partial", kind: "WORK", assignee: "workshop", page: "3",
  number: "N-42", concept: "aceite", customerId: "cust-1", plate: "ABC-123", economicNumber: "ECO-42",
  dateFrom: "2026-08-01", dateTo: "2026-08-31", overdue: "overdue", showArchived: "true", showCancelled: "true",
};
function renderOperational(changes: Record<string, string> = {}) {
  const state = parseNotasParams({ ...operationalInput, ...changes }, new Date("2026-08-06T12:00:00Z"), { operationalFilters: true });
  return render(<NotasFilters {...state} operationalState={state} masters={[]} selectedCustomer={{ id: "cust-1", name: "Taller de prueba" }} />);
}
function expectCommon(href: string) {
  const query = new URL(href, "http://fixture").searchParams;
  for (const key of ["number", "concept", "customerId", "plate", "economicNumber", "dateFrom", "dateTo", "overdue", "showArchived", "showCancelled"] as const) {
    expect(query.get(key)).toBe(operationalInput[key]);
  }
  expect(query.has("page")).toBe(false);
  return query;
}

describe("operational Notes navigation opt-in", () => {
  beforeEach(() => {
    push.mockClear();
    freezeClock("2026-08-19T12:00:00Z");
  });
  afterEach(() => vi.useRealTimers());

  it("preserves every common criterion across period, today and mode changes with one partial-payment state", () => {
    renderOperational();
    const views = screen.getByRole("group", { name: "Vista del periodo" });
    const actions = [
      () => fireEvent.click(screen.getByRole("button", { name: "Periodo anterior" })),
      () => fireEvent.click(screen.getByRole("button", { name: "Periodo siguiente" })),
      () => fireEvent.click(screen.getByRole("button", { name: "Hoy" })),
      () => fireEvent.click(within(views).getByRole("button", { name: "Mes" })),
    ];
    for (const act of actions) {
      act();
      const query = expectCommon(push.mock.lastCall![0]);
      expect(query.get("payment")).toBe("partial");
      expect(query.get("assignee")).toBe("workshop");
    }
    expect(screen.getByRole("button", { name: "Parciales" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Concepto: aceite")).toBeInTheDocument();
    expect(screen.getByText("Cobro: Parciales")).toBeInTheDocument();
    expect(screen.getByText("Responsable: Taller")).toBeInTheDocument();
    expect(screen.queryByLabelText("Concepto")).not.toBeInTheDocument();
  });

  it("retains common criteria on payment, kind and explicit anchor changes", () => {
    renderOperational();
    fireEvent.click(screen.getByRole("button", { name: "Pagadas" }));
    expect(expectCommon(push.mock.lastCall![0]).get("payment")).toBe("paid");
    fireEvent.change(screen.getByLabelText("Tipo de nota"), { target: { value: "SALE" } });
    const sale = expectCommon(push.mock.lastCall![0]);
    expect(sale.get("kind")).toBe("SALE");
    expect(sale.has("assignee")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /abrir filtros de cartera/i }));
    fireEvent.change(screen.getByLabelText("Semana"), { target: { value: "2026-08-19" } });
    expect(expectCommon(push.mock.lastCall![0]).get("anchor")).toBe("2026-08-19");
  });

  it.each(["all", "SALE"])("keeps responsible inactive for %s without phantom summary or sales exclusion", (kind) => {
    renderOperational({ kind, assignee: "workshop" });
    expect(screen.queryByText(/Responsable:/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /abrir filtros de cartera/i }));
    expect(screen.getByLabelText("Responsable")).toBeDisabled();
    expect(screen.getByLabelText("Responsable")).toHaveValue("all");
    expect(screen.getByText("Solo aplica a notas WORK; todas y SALE conservan las ventas.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver resultados" }));
    expect(expectCommon(push.mock.lastCall![0]).has("assignee")).toBe(false);
  });

  it("preserves an effective WORK master absent from options on apply", () => {
    const id = "a0b1c2d3-1234-4abc-8def-1234567890ab";
    renderOperational({ assignee: id });
    expect(screen.getByText(`Responsable: ${id}`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /abrir filtros de cartera/i }));
    expect(screen.getByLabelText("Responsable")).toBeEnabled();
    expect(screen.getByLabelText("Responsable")).toHaveValue(id);
    fireEvent.click(screen.getByRole("button", { name: "Ver resultados" }));
    expect(expectCommon(push.mock.lastCall![0]).get("assignee")).toBe(id);
  });

  it("clears all criteria including payment/kind while preserving the period context", () => {
    renderOperational();
    fireEvent.click(screen.getByRole("button", { name: /abrir filtros de cartera/i }));
    fireEvent.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(push).toHaveBeenCalledExactlyOnceWith("/admin/notas?mode=week&anchor=2026-08-05&payment=all&kind=all");
  });
});


const commonLabels = ["Folio", "Concepto", "Placas", "ECO", "Desde", "Hasta"];
const commonValues = ["N-99", "frenos", "DEF-999", "ECO-99", "2026-08-02", "2026-08-30"];
describe("Notes operational common controls", () => {
  beforeEach(() => push.mockClear());

  it.each([[true, false], [false, true]])("applies combined fields and independent archive=%s cancel=%s", (archived, cancelled) => {
    renderOperational();
    fireEvent.click(screen.getByRole("button", { name: /abrir filtros de cartera/i }));
    const sheet = screen.getByRole("dialog", { name: "Filtros de cartera" });
    fireEvent.click(within(sheet).getByRole("button", { name: "Qué incluye: Finalización o emisión" }));
    expect(within(sheet).getByRole("tooltip")).toHaveTextContent("Fecha operativa: finalización WORK o emisión SALE (ambos días incluidos).");
    for (const [index, label] of commonLabels.entries()) {
      fireEvent.change(screen.getByLabelText(label), { target: { value: commonValues[index] } });
    }
    for (const [name, value] of [["Mostrar archivadas", archived], ["Mostrar canceladas", cancelled]] as const) {
      const checkbox = screen.getByRole("checkbox", { name });
      expect(checkbox).toBeChecked();
      if (!value) fireEvent.click(checkbox);
    }
    fireEvent.click(screen.getByRole("button", { name: "Ver resultados" }));
    const query = new URL(push.mock.lastCall![0], "http://fixture").searchParams;
    expect(Object.fromEntries(query)).toEqual({ mode: "week", anchor: "2026-08-05", payment: "partial", kind: "WORK", assignee: "workshop", customerId: "cust-1", overdue: "overdue", number: "N-99", concept: "frenos", plate: "DEF-999", economicNumber: "ECO-99", dateFrom: "2026-08-02", dateTo: "2026-08-30", ...(archived ? { showArchived: "true" } : {}), ...(cancelled ? { showCancelled: "true" } : {}) });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps an inverted range open with every draft intact and only navigates after correction", () => {
    renderOperational();
    fireEvent.click(screen.getByRole("button", { name: /abrir filtros de cartera/i }));
    fireEvent.change(screen.getByLabelText("Concepto"), { target: { value: "corregir aceite" } });
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-09-01" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Mostrar archivadas" }));
    fireEvent.click(screen.getByRole("button", { name: "Ver resultados" }));
    expect(screen.getByRole("dialog")).toContainElement(screen.getByRole("alert"));
    expect(screen.getByRole("alert")).toHaveTextContent("La fecha de finalización/emisión desde no puede ser posterior a hasta");
    expect(screen.getByLabelText("Desde")).toHaveValue("2026-09-01");
    expect(screen.getByLabelText("Hasta")).toHaveValue("2026-08-31");
    expect(screen.getByLabelText("Concepto")).toHaveValue("corregir aceite");
    expect(screen.getByRole("checkbox", { name: "Mostrar archivadas" })).not.toBeChecked();
    expect(screen.getByText("Concepto: aceite")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-08-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Ver resultados" }));
    expect(push).toHaveBeenCalledOnce();
    expect(new URL(push.mock.lastCall![0], "http://fixture").searchParams.get("concept")).toBe("corregir aceite");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("resets discarded drafts from the URL when reopened and can clear a date error explicitly", () => {
    renderOperational();
    fireEvent.click(screen.getByRole("button", { name: /abrir filtros de cartera/i }));
    fireEvent.change(screen.getByLabelText("Concepto"), { target: { value: "descartado" } });
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: /abrir filtros de cartera/i }));
    expect(screen.getByLabelText("Concepto")).toHaveValue("aceite");
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-09-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Ver resultados" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(push).toHaveBeenCalledExactlyOnceWith("/admin/notas?mode=week&anchor=2026-08-05&payment=all&kind=all");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});


describe("incoming rejected Notes dates", () => {
  beforeEach(() => push.mockClear());
  it.each(["correct", "clear"])("keeps correction visible and navigation safe until %s", (action) => {
    const state = parseNotasParams({ ...operationalInput, dateFrom: undefined, dateTo: undefined }, undefined, { operationalFilters: true });
    render(<NotasFilters {...state} operationalState={state} rejectedRange={{ from: "2026-09-01", to: "2026-08-31" }} masters={[]} />);
    expect(screen.getByRole("alert")).toHaveTextContent("La fecha de finalización/emisión desde no puede ser posterior a hasta");
    expect(screen.getByLabelText("Desde")).toHaveValue("2026-09-01");
    expect(screen.getByLabelText("Concepto")).toHaveValue("aceite");
    expect(screen.getByLabelText("Semana")).toBeDisabled();
    expect(screen.getByLabelText("Tipo de nota")).toBeDisabled();
    for (const link of document.querySelectorAll("a")) expect(link).toHaveAttribute("href", "#notas-date-error");
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    if (action === "clear") {
      fireEvent.click(screen.getByRole("button", { name: "Limpiar" }));
      expect(push).toHaveBeenCalledExactlyOnceWith("/admin/notas?mode=week&anchor=2026-08-05&payment=all&kind=all");
    } else {
      fireEvent.click(screen.getByRole("button", { name: "Ver resultados" }));
      expect(push).not.toHaveBeenCalled();
      fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-08-01" } });
      fireEvent.click(screen.getByRole("button", { name: "Ver resultados" }));
      expectCommon(push.mock.lastCall![0]);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    }
  });
});

describe("Notes shared period navigator, segmented payment and filter sheet", () => {
  beforeEach(() => push.mockClear());
  afterEach(() => vi.useRealTimers());

  it("moves the Mon–Sat period with PeriodNavigator and keeps every criterion", () => {
    freezeClock("2026-08-06T12:00:00Z");
    renderOperational();
    expect(screen.getByText("3–8 de agosto de 2026")).toBeInTheDocument();
    expect(screen.getByText("En curso")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Periodo anterior" }));

    const query = new URL(push.mock.lastCall![0], "http://fixture").searchParams;
    expect(query.get("anchor")).toBe("2026-07-27");
    expect(query.get("payment")).toBe("partial");
    expect(query.get("concept")).toBe("aceite");
  });

  it("chooses Semana or Mes with a segmented control instead of a text link", () => {
    renderOperational();
    const views = screen.getByRole("group", { name: "Vista del periodo" });

    expect(within(views).getByRole("button", { name: "Semana" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(views).getByRole("button", { name: "Mes" }));

    expect(push).toHaveBeenCalledWith(expect.stringContaining("mode=month"));
  });

  it("opens the filters in a sheet with short labels and ⓘ explanations", () => {
    renderOperational();
    fireEvent.click(screen.getByRole("button", { name: /abrir filtros de cartera/i }));

    const sheet = screen.getByRole("dialog", { name: "Filtros de cartera" });
    expect(within(sheet).getByText("Finalización o emisión")).toBeInTheDocument();
    expect(within(sheet).queryByText(/ambos días incluidos\)$/)).not.toBeInTheDocument();
    fireEvent.click(within(sheet).getByRole("button", { name: "Qué incluye: Finalización o emisión" }));
    expect(within(sheet).getByRole("tooltip")).toHaveTextContent("Fecha operativa: finalización WORK o emisión SALE (ambos días incluidos).");
    expect(within(sheet).getByRole("button", { name: "Ver resultados" })).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Limpiar" })).toBeInTheDocument();
  });
});
