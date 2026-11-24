import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ComparisonSnapshot } from "../profit-queries";
import { ComparisonView } from "./comparison-view";

const period = { month: "2026-11", label: "Noviembre de 2026", prevMonth: "2026-10", nextMonth: "2026-12", isCurrent: true, start: new Date(), end: new Date(), dateStart: new Date(), dateEnd: new Date() };
const row = (month: string, label: string, valueCents: number, level: ComparisonSnapshot["months"][number]["level"], share: number | null) => ({ month, label, income: { laborCents: 0, partsCents: 0, otherCents: 0 }, expensesCents: 10_000, valueCents, level, laborSharePercent: share });

const snapshot: ComparisonSnapshot = {
  period, series: "todas", medianCents: 200_000, totals: { incomeCents: 600_000, expensesCents: 30_000 },
  months: [row("2026-09", "septiembre 2026", 100_000, "debil", 40), row("2026-10", "octubre 2026", 200_000, "tipico", 60), row("2026-11", "noviembre 2026", 300_000, "fuerte", null), row("2026-08", "agosto 2026", 0, null, null)],
};
const hrefFor = (series: string) => `/x?serie=${series}`;

describe("ComparisonView", () => {
  it("lists each month with what came in, the labor share, expenses and how it compares with the rest", () => {
    render(<ComparisonView snapshot={snapshot} hrefFor={hrefFor} />);

    const rows = screen.getAllByTestId("comparison-row");
    expect(rows).toHaveLength(4);
    expect(rows[0]).toHaveTextContent("septiembre 2026");
    expect(rows[0]).toHaveTextContent("$1,000.00");
    expect(rows[0]).toHaveTextContent("40 %");
    expect(within(rows[0]).getByTestId("comparison-level")).toHaveTextContent("Más débil");
    expect(within(rows[1]).getByTestId("comparison-level")).toHaveTextContent("Típico");
    expect(within(rows[2]).getByTestId("comparison-level")).toHaveTextContent("Más fuerte");
    expect(within(rows[3]).getByTestId("comparison-level")).toHaveTextContent("Sin cobros");
    expect(screen.getByTestId("comparison-total")).toHaveTextContent("$6,000.00");
  });

  it("offers the three series as links and says it is a description, not a score or a forecast", () => {
    render(<ComparisonView snapshot={snapshot} hrefFor={hrefFor} />);

    expect(screen.getByRole("link", { name: "Refacciones" })).toHaveAttribute("href", "/x?serie=refacciones");
    const notes = screen.getByTestId("comparison-notes");
    expect(notes).toHaveTextContent("no una calificación ni un pronóstico");
    expect(notes).toHaveTextContent("no incluyen nómina");
    expect(notes).toHaveTextContent("«Otro»");
  });

  it("asks for more history instead of classifying when there are fewer than three months with income", () => {
    render(<ComparisonView snapshot={{ ...snapshot, medianCents: null, months: [row("2026-11", "noviembre 2026", 300_000, null, null)] }} hrefFor={hrefFor} />);
    expect(screen.getByTestId("comparison-notes")).toHaveTextContent("pocos meses con cobros");
    expect(screen.getByTestId("comparison-level")).toHaveTextContent("—");
  });
});
