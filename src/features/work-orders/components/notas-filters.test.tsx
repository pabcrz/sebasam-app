import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotasFilters } from "./notas-filters";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("NotasFilters", () => {
  beforeEach(() => push.mockClear());

  it("keeps payment when changing period or mode and resets pagination", () => {
    render(<NotasFilters mode="week" payment="paid" anchor="2026-08-05" rangeLabel="3–8 de agosto de 2026" isCurrentWeek />);
    expect(screen.getByRole("navigation", { name: "Filtros de notas" })).toBeInTheDocument();
    expect(screen.getByText("3–8 de agosto de 2026")).toBeVisible();
    expect(screen.getByText("Semana en curso")).toBeVisible();
    expect(screen.getByRole("link", { name: "Periodo anterior" })).toHaveAttribute("href", expect.stringContaining("anchor=2026-07-29"));
    expect(screen.getByRole("link", { name: "Periodo siguiente" })).toHaveAttribute("href", expect.stringContaining("anchor=2026-08-12"));
    expect(screen.getByRole("link", { name: "Periodo anterior" })).toHaveAttribute("href", expect.stringContaining("payment=paid"));
    expect(screen.getByRole("link", { name: "Pendientes" })).toHaveAttribute("href", expect.not.stringContaining("page="));
    expect(screen.getByText("Pagadas")).toHaveAttribute("aria-current", "true");
    expect(screen.queryByRole("button", { name: "Pagadas" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Pagadas" })).not.toBeInTheDocument();
    const monthly = screen.getByRole("link", { name: "Vista mensual" });
    expect(monthly).toHaveAttribute("href", expect.stringContaining("mode=month"));
    expect(monthly).toHaveAttribute("href", expect.not.stringContaining("page="));
    expect(screen.getByLabelText("Semana")).toHaveAttribute("type", "date");
    fireEvent.change(screen.getByLabelText("Semana"), { target: { value: "2026-08-19" } });
    expect(push).toHaveBeenCalledWith("/admin/notas?mode=week&anchor=2026-08-19&payment=paid");
    expect(screen.queryByRole("button", { name: "Ir" })).not.toBeInTheDocument();
  });

  it("shows the active month", () => {
    render(<NotasFilters mode="month" payment="all" anchor="2026-08-01" rangeLabel="agosto de 2026" isCurrentWeek={false} />);
    expect(screen.getByText("agosto de 2026")).toBeVisible();
    expect(screen.queryByText("Semana en curso")).not.toBeInTheDocument();
    expect(screen.getByText("Todas")).toHaveAttribute("aria-current", "true");
    expect(screen.queryByRole("button", { name: "Todas" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Mes y año"), { target: { value: "2026-09" } });
    expect(push).toHaveBeenCalledWith("/admin/notas?mode=month&anchor=2026-09&payment=all");
  });

  it("does not label a non-current week", () => {
    render(<NotasFilters mode="week" payment="all" anchor="2026-08-03" rangeLabel="3–8 de agosto de 2026" isCurrentWeek={false} />);

    expect(screen.queryByText("Semana en curso")).not.toBeInTheDocument();
  });
});
