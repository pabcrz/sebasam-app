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
});
