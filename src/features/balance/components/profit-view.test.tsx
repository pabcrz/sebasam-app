import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildProfitSummary } from "../profit";
import type { ProfitSnapshot } from "../profit-queries";
import { ProfitView, type ProfitViewKey } from "./profit-view";

const period = {
  month: "2026-11", label: "Noviembre de 2026", prevMonth: "2026-10", nextMonth: "2026-12", isCurrent: false,
  start: new Date("2026-11-01T06:00:00Z"), end: new Date("2026-12-01T06:00:00Z"),
  dateStart: new Date("2026-11-01T00:00:00Z"), dateEnd: new Date("2026-12-01T00:00:00Z"),
};

function snapshot(overrides: Parameters<typeof buildProfitSummary>[0]): ProfitSnapshot {
  return { period, jobs: [], summary: buildProfitSummary(overrides) };
}

const base = {
  income: { laborCents: 100_000, partsCents: 60_000 },
  cashCollectedCents: 150_000,
  payrollCents: 40_000,
  expenses: [
    { amountCents: 20_000, invoiceStatus: "NOT_INVOICED" as const, partsSharePercent: 0 },
    { amountCents: 3_000, invoiceStatus: "INVOICED" as const, partsSharePercent: 0 },
    { amountCents: 10_000, invoiceStatus: "INVOICED" as const, partsSharePercent: 50 },
    { amountCents: 30_000, invoiceStatus: "NOT_INVOICED" as const, partsSharePercent: 100 },
  ],
};

/** The StatTile root: label span -> label row -> tile. */
const tile = (label: HTMLElement) => label.parentElement!.parentElement!;

const hrefFor = ({ month, view }: { month?: string | null; view?: ProfitViewKey }) => `/admin/balance?tab=utilidad&month=${month ?? "actual"}&view=${view ?? "same"}`;

describe("ProfitView", () => {
  it("shows in the general view how much came in, how much was spent and how much is left, split by account", () => {
    render(<ProfitView snapshot={snapshot(base)} view="general" hrefFor={hrefFor} />);

    const general = within(screen.getByTestId("profit-general"));
    expect(tile(general.getByText("Entró"))).toHaveTextContent("$1,600.00");
    expect(tile(general.getByText("Se gastó"))).toHaveTextContent("$1,030.00");
    expect(tile(general.getByText("Queda"))).toHaveTextContent("$570.00");
    expect(general.getByText("Queda de mano de obra")).toBeInTheDocument();
    expect(general.getByText("Queda de refacciones y materiales")).toBeInTheDocument();
    expect(general.getByText("Queda en total").closest("tr")).toHaveTextContent("$570.00");
  });

  it("separates expenses with and without invoice inside the detail", () => {
    render(<ProfitView snapshot={snapshot(base)} view="general" hrefFor={hrefFor} />);

    expect(screen.getByTestId("invoice-split")).toHaveTextContent("Con factura $130.00 · Sin factura $500.00");
  });

  it("shows the labor account with its coverage when it sustains itself", () => {
    render(<ProfitView snapshot={snapshot({ ...base, income: { laborCents: 200_000, partsCents: 0 } })} view="mano-de-obra" hrefFor={hrefFor} />);

    expect(screen.getByTestId("labor-coverage")).toHaveTextContent(/cubre 294 % .* se sostiene sola/);
  });

  it("says how much is missing when labor does not cover its costs, and marks the figure as negative", () => {
    render(<ProfitView snapshot={snapshot(base)} view="mano-de-obra" hrefFor={hrefFor} />);

    expect(screen.getByTestId("labor-coverage")).toHaveTextContent(/cubre 147 % .*se sostiene sola/);
    const poor = snapshot({ ...base, income: { laborCents: 30_000, partsCents: 60_000 } });
    render(<ProfitView snapshot={poor} view="mano-de-obra" hrefFor={hrefFor} />);
    expect(screen.getAllByTestId("labor-coverage")[1]).toHaveTextContent(/cubre 44 % .* Faltan \$380\.00/);
  });

  it("shows the parts account as free profit", () => {
    render(<ProfitView snapshot={snapshot(base)} view="refacciones" hrefFor={hrefFor} />);

    const parts = within(screen.getByTestId("profit-parts"));
    expect(tile(parts.getAllByText("Utilidad libre")[0])).toHaveTextContent("$250.00");
    expect(parts.getByText("No está comprometida a pagar renta ni luz")).toBeInTheDocument();
  });

  it("shows only the selected view and links the others and the neighbouring months", () => {
    render(<ProfitView snapshot={snapshot(base)} view="refacciones" hrefFor={hrefFor} />);

    expect(screen.queryByTestId("profit-general")).not.toBeInTheDocument();
    expect(screen.queryByTestId("profit-labor")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "General" })).toHaveAttribute("href", expect.stringContaining("view=general"));
    expect(screen.getByRole("link", { name: "Mano de obra" })).toHaveAttribute("href", expect.stringContaining("view=mano-de-obra"));
    expect(screen.getByRole("link", { name: "Mes anterior" })).toHaveAttribute("href", expect.stringContaining("month=2026-10"));
    expect(screen.getByRole("link", { name: "Mes siguiente" })).toHaveAttribute("href", expect.stringContaining("month=2026-12"));
    expect(screen.getByRole("link", { name: "Mes actual" })).toBeInTheDocument();
  });

  it("always shows the cash reference and the month-overlap notice", () => {
    render(<ProfitView snapshot={snapshot(base)} view="general" hrefFor={hrefFor} />);

    const notes = within(screen.getByTestId("profit-notes"));
    expect(notes.getByText("$1,500.00")).toBeInTheDocument();
    expect(notes.getByText(/pueden caer en meses distintos/)).toBeInTheDocument();
  });

  it("renders an empty month without errors", () => {
    const empty = snapshot({ income: { laborCents: 0, partsCents: 0 }, cashCollectedCents: 0, payrollCents: 0, expenses: [] });
    render(<ProfitView snapshot={empty} view="mano-de-obra" hrefFor={hrefFor} />);

    expect(screen.getByTestId("labor-coverage")).toHaveTextContent("No hay costos de mano de obra en el mes.");
  });
});
