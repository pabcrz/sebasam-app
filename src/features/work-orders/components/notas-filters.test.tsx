import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseNotasParams } from "../notas-period";
import { NotasFilters } from "./notas-filters";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

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
    render(<NotasFilters mode="week" payment="paid" assignee="workshop" anchor="2026-08-05" rangeLabel="3–8 de agosto de 2026" isCurrentWeek masters={masters} />);
    expect(screen.getByRole("group", { name: "Estado de pago" })).toBeInTheDocument();
    expect(screen.getByText("3 – 8 de agosto de 2026")).toBeVisible();
    expect(screen.getByText("Semana en curso")).toBeVisible();
    expect(screen.getByRole("link", { name: "Semana anterior" })).toHaveAttribute("href", expect.stringContaining("anchor=2026-07-29"));
    expect(screen.getByRole("link", { name: "Semana siguiente" })).toHaveAttribute("href", expect.stringContaining("anchor=2026-08-12"));
    expect(screen.getByRole("link", { name: "Semana anterior" })).toHaveAttribute("href", expect.stringContaining("payment=paid"));
    expect(screen.getByRole("link", { name: "Semana anterior" })).toHaveAttribute("href", expect.stringContaining("assignee=workshop"));
    expect(screen.getByRole("button", { name: "Pendientes" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Pagadas" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Pendientes" }));
    expect(push).toHaveBeenCalledWith("/admin/notas?mode=week&anchor=2026-08-05&payment=pending&assignee=workshop&kind=all");
    push.mockClear();
    const monthly = screen.getByRole("link", { name: "Vista mensual" });
    expect(monthly).toHaveAttribute("href", expect.stringContaining("mode=month"));
    expect(monthly).toHaveAttribute("href", expect.not.stringContaining("page="));
    expect(screen.queryByLabelText("Semana")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /abrir filtros de cartera/i }));
    expect(screen.getByLabelText("Semana")).toHaveAttribute("type", "date");
    fireEvent.change(screen.getByLabelText("Semana"), { target: { value: "2026-08-19" } });
    expect(push).toHaveBeenCalledWith("/admin/notas?mode=week&anchor=2026-08-19&payment=paid&assignee=workshop&kind=all");
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

    // Open filters dialog
    const filterBtn = screen.getByRole("button", { name: /abrir filtros de cartera/i });
    fireEvent.click(filterBtn);

    expect(screen.getByRole("heading", { name: "Filtros de cartera" })).toBeInTheDocument();
    expect(screen.getByLabelText("Responsable")).toHaveValue("workshop");
    expect(screen.getByLabelText("Morosidad")).toHaveValue("overdue");
    expect(screen.getByText("Comercial Uno")).toBeInTheDocument();

    // Change assignee and morosidad inside dialog
    fireEvent.change(screen.getByLabelText("Responsable"), { target: { value: masters[0].id } });
    fireEvent.change(screen.getByLabelText("Morosidad"), { target: { value: "all" } });

    // Apply
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    expect(push).toHaveBeenCalledWith(
      expect.stringContaining(`assignee=${masters[0].id}`),
    );
  });

  it("clears filters when clicking Limpiar filtros", () => {
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
    const clearBtn = screen.getByRole("button", { name: "Limpiar filtros" });
    fireEvent.click(clearBtn);

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

    // Open dialog
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

  it("shows the active month", () => {
    render(<NotasFilters mode="month" payment="all" assignee="all" anchor="2026-08-01" rangeLabel="agosto de 2026" isCurrentWeek={false} masters={masters} />);
    expect(screen.getByText("agosto de 2026")).toBeVisible();
    expect(screen.queryByText("Semana en curso")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Todas" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByLabelText("Mes y año")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /abrir filtros de cartera/i }));
    fireEvent.change(screen.getByLabelText("Mes y año"), { target: { value: "2026-09" } });
    expect(push).toHaveBeenCalledWith("/admin/notas?mode=month&anchor=2026-09&payment=all&assignee=all&kind=all");
  });

  it.each([
    { mode: "week" as const, expectedAnchor: "2026-08-18", isCurrentPeriod: false },
    { mode: "month" as const, expectedAnchor: "2026-08", isCurrentPeriod: true },
  ])("routes Hoy to the Mexico City date and preserves the current mode and filters ($mode)", ({ mode, expectedAnchor, isCurrentPeriod }) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-19T05:30:00.000Z"));

    render(
      <NotasFilters
        mode={mode}
        payment="paid"
        assignee="workshop"
        customerId="cust-1"
        overdue="overdue"
        kind="SALE"
        anchor={mode === "week" ? "2026-07-22" : "2026-08-01"}
        rangeLabel="3–8 de agosto de 2026"
        isCurrentWeek={false}
        masters={masters}
      />,
    );

    const todayLink = screen.getByRole("link", { name: "Hoy" });
    expect(todayLink).toHaveAttribute(
      "href",
      `/admin/notas?mode=${mode}&anchor=${expectedAnchor}&payment=paid&assignee=workshop&customerId=cust-1&overdue=overdue&kind=SALE`,
    );
    expect(todayLink).toHaveClass(isCurrentPeriod ? "bg-[var(--color-blue-tint)]" : "border");
  });

  it("does not label a non-current week", () => {
    render(<NotasFilters mode="week" payment="all" assignee="all" anchor="2026-08-03" rangeLabel="3–8 de agosto de 2026" isCurrentWeek={false} masters={masters} />);

    expect(screen.queryByText("Semana en curso")).not.toBeInTheDocument();
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
  beforeEach(() => push.mockClear());

  it("preserves every common criterion across period, today and mode links with one partial-payment state", () => {
    renderOperational();
    for (const label of ["Semana anterior", "Semana siguiente", "Hoy", "Vista mensual"]) {
      const query = expectCommon(screen.getByRole("link", { name: label }).getAttribute("href")!);
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
    expect(screen.getByText("El responsable solo aplica a notas WORK; todas y SALE conservan las ventas.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    expect(expectCommon(push.mock.lastCall![0]).has("assignee")).toBe(false);
  });

  it("preserves an effective WORK master absent from options on apply", () => {
    const id = "a0b1c2d3-1234-4abc-8def-1234567890ab";
    renderOperational({ assignee: id });
    expect(screen.getByText(`Responsable: ${id}`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /abrir filtros de cartera/i }));
    expect(screen.getByLabelText("Responsable")).toBeEnabled();
    expect(screen.getByLabelText("Responsable")).toHaveValue(id);
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    expect(expectCommon(push.mock.lastCall![0]).get("assignee")).toBe(id);
  });

  it("clears all criteria including payment/kind while preserving the period context", () => {
    renderOperational();
    fireEvent.click(screen.getByRole("button", { name: /abrir filtros de cartera/i }));
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(push).toHaveBeenCalledExactlyOnceWith("/admin/notas?mode=week&anchor=2026-08-05&payment=all&kind=all");
  });
});


const commonLabels = ["Folio", "Concepto", "Placas", "ECO", "Finalización/emisión desde", "Finalización/emisión hasta"];
const commonValues = ["N-99", "frenos", "DEF-999", "ECO-99", "2026-08-02", "2026-08-30"];
describe("Notes operational common controls", () => {
  beforeEach(() => push.mockClear());

  it.each([[true, false], [false, true]])("applies combined fields and independent archive=%s cancel=%s", (archived, cancelled) => {
    renderOperational();
    fireEvent.click(screen.getByRole("button", { name: /abrir filtros de cartera/i }));
    expect(screen.getByText("Fecha operativa: finalización WORK o emisión SALE (ambos días incluidos)")).toBeInTheDocument();
    for (const [index, label] of commonLabels.entries()) {
      fireEvent.change(screen.getByLabelText(label), { target: { value: commonValues[index] } });
    }
    for (const [name, value] of [["Mostrar archivadas", archived], ["Mostrar canceladas", cancelled]] as const) {
      const checkbox = screen.getByRole("checkbox", { name });
      expect(checkbox).toBeChecked();
      if (!value) fireEvent.click(checkbox);
    }
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    const query = new URL(push.mock.lastCall![0], "http://fixture").searchParams;
    expect(Object.fromEntries(query)).toEqual({ mode: "week", anchor: "2026-08-05", payment: "partial", kind: "WORK", assignee: "workshop", customerId: "cust-1", overdue: "overdue", number: "N-99", concept: "frenos", plate: "DEF-999", economicNumber: "ECO-99", dateFrom: "2026-08-02", dateTo: "2026-08-30", ...(archived ? { showArchived: "true" } : {}), ...(cancelled ? { showCancelled: "true" } : {}) });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps an inverted range open with every draft intact and only navigates after correction", () => {
    renderOperational();
    fireEvent.click(screen.getByRole("button", { name: /abrir filtros de cartera/i }));
    fireEvent.change(screen.getByLabelText("Concepto"), { target: { value: "corregir aceite" } });
    fireEvent.change(screen.getByLabelText("Finalización/emisión desde"), { target: { value: "2026-09-01" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Mostrar archivadas" }));
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    expect(screen.getByRole("dialog")).toContainElement(screen.getByRole("alert"));
    expect(screen.getByRole("alert")).toHaveTextContent("La fecha de finalización/emisión desde no puede ser posterior a hasta");
    expect(screen.getByLabelText("Finalización/emisión desde")).toHaveValue("2026-09-01");
    expect(screen.getByLabelText("Finalización/emisión hasta")).toHaveValue("2026-08-31");
    expect(screen.getByLabelText("Concepto")).toHaveValue("corregir aceite");
    expect(screen.getByRole("checkbox", { name: "Mostrar archivadas" })).not.toBeChecked();
    expect(screen.getByText("Concepto: aceite")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Finalización/emisión desde"), { target: { value: "2026-08-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
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
    fireEvent.change(screen.getByLabelText("Finalización/emisión desde"), { target: { value: "2026-09-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(push).toHaveBeenCalledExactlyOnceWith("/admin/notas?mode=week&anchor=2026-08-05&payment=all&kind=all");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
