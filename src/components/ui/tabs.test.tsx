import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tabs } from "./tabs";

const tabs = [
  { value: "week", label: "Esta semana", panel: "Métricas semanales" },
  { value: "month", label: "Este mes", panel: "Métricas mensuales" },
  { value: "year", label: "Este año", panel: "Métricas anuales" },
];

describe("Tabs", () => {
  it("connects tabs to panels and moves selection and focus with keyboard navigation", () => {
    render(<Tabs tabs={tabs} label="Período de métricas" />);

    const week = screen.getByRole("tab", { name: "Esta semana" });
    const month = screen.getByRole("tab", { name: "Este mes" });
    const year = screen.getByRole("tab", { name: "Este año" });

    expect(week).toHaveAttribute("aria-selected", "true");
    expect(week).toHaveAttribute("aria-controls");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", week.id);

    week.focus();
    fireEvent.keyDown(week, { key: "ArrowRight" });
    expect(month).toHaveFocus();
    expect(month).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(month, { key: "End" });
    expect(year).toHaveFocus();
    expect(year).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(year, { key: "Home" });
    expect(week).toHaveFocus();
    expect(week).toHaveAttribute("aria-selected", "true");
  });

  it("marks the active tab bold with a 2px brand-gradient underline and leaves inactive tabs muted", () => {
    render(<Tabs tabs={tabs} label="Período de métricas" />);

    const week = screen.getByRole("tab", { name: "Esta semana" });
    const month = screen.getByRole("tab", { name: "Este mes" });

    expect(week.className).toContain("font-semibold");
    expect(week.className).toContain("after:h-[2px]");
    expect(week.className).toContain("after:bg-[image:var(--gradient-primary)]");
    expect(week.className).not.toContain("bg-[var(--color-surface)]");

    expect(month.className).not.toContain("font-semibold");
    expect(month.className).toContain("text-[var(--color-text-muted)]");
    expect(month.className).not.toContain("after:bg-[image:var(--gradient-primary)]");
  });

  it("gives every tab a 44px touch height so the list's overflow never clips its hit area", () => {
    render(<Tabs tabs={tabs} label="Período de métricas" />);

    expect(screen.getByRole("tab", { name: "Este año" }).className).toContain("min-h-[var(--tap-min-height)]");
  });

  it("hides the horizontal scrollbar of the tab list while keeping it scrollable", () => {
    render(<Tabs tabs={tabs} label="Período de métricas" />);

    const list = screen.getByRole("tablist", { name: "Período de métricas" });
    expect(list.className).toContain("overflow-x-auto");
    expect(list.className).toContain("no-scrollbar");
  });
});
