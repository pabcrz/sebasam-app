import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PeriodNavigator } from "./period-navigator";

const today = new Date("2026-11-11T18:00:00Z");

describe("PeriodNavigator", () => {
  it("shows the Spanish label and the En curso badge for the current week, without Hoy", () => {
    render(
      <PeriodNavigator view="week" anchor="2026-11-11" today={today} onViewChange={() => {}} onAnchorChange={() => {}} />,
    );

    expect(screen.getByRole("heading", { name: "9–14 de noviembre de 2026" })).toBeInTheDocument();
    expect(screen.getByText("En curso")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hoy" })).not.toBeInTheDocument();
  });

  it("moves to the previous and next period through the grouped arrows", () => {
    const onAnchorChange = vi.fn();
    render(
      <PeriodNavigator view="week" anchor="2026-11-11" today={today} onViewChange={() => {}} onAnchorChange={onAnchorChange} />,
    );

    const group = screen.getByRole("group", { name: "Cambiar periodo" });
    fireEvent.click(within(group).getByRole("button", { name: "Periodo anterior" }));
    fireEvent.click(within(group).getByRole("button", { name: "Periodo siguiente" }));

    expect(onAnchorChange).toHaveBeenNthCalledWith(1, "2026-11-02");
    expect(onAnchorChange).toHaveBeenNthCalledWith(2, "2026-11-16");
  });

  it("shows Hoy only after the user has moved away from the current period, and it returns to today", () => {
    const onAnchorChange = vi.fn();
    render(
      <PeriodNavigator view="week" anchor="2026-11-02" today={today} onViewChange={() => {}} onAnchorChange={onAnchorChange} />,
    );

    expect(screen.queryByText("En curso")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hoy" }));

    expect(onAnchorChange).toHaveBeenCalledWith("2026-11-11");
  });

  it("offers the configured views as a segmented control and reports the chosen one", () => {
    const onViewChange = vi.fn();
    render(
      <PeriodNavigator view="week" anchor="2026-11-11" today={today} onViewChange={onViewChange} onAnchorChange={() => {}} />,
    );

    expect(screen.getByRole("group", { name: "Vista del periodo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Semana" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Mes" }));
    expect(onViewChange).toHaveBeenCalledWith("month");
  });

  it("only offers the views it is given", () => {
    render(
      <PeriodNavigator
        view="month"
        views={["month", "year"]}
        anchor="2026-11-11"
        today={today}
        onViewChange={() => {}}
        onAnchorChange={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Mes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Año" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Semana" })).not.toBeInTheDocument();
  });

  it("renders no view control when only one view is offered, so no single-option selector appears", () => {
    render(
      <PeriodNavigator
        view="week"
        views={["week"]}
        anchor="2026-11-11"
        today={today}
        onViewChange={() => {}}
        onAnchorChange={() => {}}
      />,
    );

    expect(screen.getByRole("heading", { name: "9–14 de noviembre de 2026" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Vista del periodo" })).not.toBeInTheDocument();
  });

  it("hides arrows and Hoy in the all view, which has no period to move through", () => {
    render(
      <PeriodNavigator view="all" anchor="2026-11-11" today={today} onViewChange={() => {}} onAnchorChange={() => {}} />,
    );

    expect(screen.getByRole("heading", { name: "Historial completo" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Cambiar periodo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hoy" })).not.toBeInTheDocument();
  });
});
