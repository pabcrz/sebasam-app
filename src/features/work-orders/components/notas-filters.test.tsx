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
    expect(screen.getByLabelText("Responsable")).toHaveValue("workshop");
    expect(screen.getByRole("option", { name: "Ana Maestra" })).toHaveValue(masters[0].id);
    fireEvent.change(screen.getByLabelText("Responsable"), { target: { value: masters[0].id } });
    expect(push).toHaveBeenLastCalledWith(`/admin/notas?mode=week&anchor=2026-08-05&payment=paid&assignee=${masters[0].id}`);
    expect(screen.queryByRole("button", { name: "Ir" })).not.toBeInTheDocument();
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
