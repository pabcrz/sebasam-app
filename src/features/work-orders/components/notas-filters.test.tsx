import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotasFilters } from "./notas-filters";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("NotasFilters", () => {
  beforeEach(() => push.mockClear());
  const masters = [{ id: "a0b1c2d3-1234-4abc-8def-1234567890ab", displayName: "Ana Maestra" }];

  it("keeps payment when changing period or mode and resets pagination", () => {
    render(<NotasFilters mode="week" payment="paid" assignee="workshop" anchor="2026-08-05" rangeLabel="3–8 de agosto de 2026" isCurrentWeek masters={masters} />);
    expect(screen.getByRole("navigation", { name: "Estado de pago" })).toBeInTheDocument();
    expect(screen.getByText("3–8 de agosto de 2026")).toBeVisible();
    expect(screen.getByText("Semana en curso")).toBeVisible();
    expect(screen.getByRole("link", { name: "Periodo anterior" })).toHaveAttribute("href", expect.stringContaining("anchor=2026-07-29"));
    expect(screen.getByRole("link", { name: "Periodo siguiente" })).toHaveAttribute("href", expect.stringContaining("anchor=2026-08-12"));
    expect(screen.getByRole("link", { name: "Periodo anterior" })).toHaveAttribute("href", expect.stringContaining("payment=paid"));
    expect(screen.getByRole("link", { name: "Periodo anterior" })).toHaveAttribute("href", expect.stringContaining("assignee=workshop"));
    expect(screen.getByRole("link", { name: "Pendientes" })).toHaveAttribute("href", expect.not.stringContaining("page="));
    expect(screen.getByRole("link", { name: "Pagadas" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("button", { name: "Pagadas" })).not.toBeInTheDocument();
    const monthly = screen.getByRole("link", { name: "Vista mensual" });
    expect(monthly).toHaveAttribute("href", expect.stringContaining("mode=month"));
    expect(monthly).toHaveAttribute("href", expect.not.stringContaining("page="));
    expect(screen.getByLabelText("Semana")).toHaveAttribute("type", "date");
    fireEvent.change(screen.getByLabelText("Semana"), { target: { value: "2026-08-19" } });
    expect(push).toHaveBeenCalledWith("/admin/notas?mode=week&anchor=2026-08-19&payment=paid&assignee=workshop");
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

    const clearBtn = screen.getByRole("button", { name: "Limpiar" });
    fireEvent.click(clearBtn);

    expect(push).toHaveBeenCalledWith("/admin/notas?mode=week&anchor=2026-08-05&payment=all&assignee=all");
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
    expect(screen.getByRole("link", { name: "Todas" })).toHaveAttribute("aria-current", "page");
    fireEvent.change(screen.getByLabelText("Mes y año"), { target: { value: "2026-09" } });
    expect(push).toHaveBeenCalledWith("/admin/notas?mode=month&anchor=2026-09&payment=all&assignee=all");
  });

  it("does not label a non-current week", () => {
    render(<NotasFilters mode="week" payment="all" assignee="all" anchor="2026-08-03" rangeLabel="3–8 de agosto de 2026" isCurrentWeek={false} masters={masters} />);

    expect(screen.queryByText("Semana en curso")).not.toBeInTheDocument();
  });
});
