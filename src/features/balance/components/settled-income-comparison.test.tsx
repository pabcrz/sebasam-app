import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SettledIncomeComparison } from "./settled-income-comparison";
import type { BalancePeriodRow } from "../domain";

const periods: BalancePeriodRow[] = [
  { label: "octubre de 2026", settledBilled: { labor: 100000, materials: 50000, other: 0 }, receivableAtCloseCents: 80000 },
  { label: "noviembre de 2026", settledBilled: { labor: 20000, materials: 0, other: 3000 }, receivableAtCloseCents: 40000 },
];

describe("SettledIncomeComparison", () => {
  it("compares every category per period, newest first, with the unverified receivable at close", () => {
    render(<SettledIncomeComparison periods={periods} />);

    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).toEqual([
      "Periodo",
      "Mano de obra",
      "Materiales y refacciones",
      "Otros",
      "Total facturado",
      "CxC al cierre (no verificada)",
    ]);
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("noviembre de 2026$200.00$0.00$30.00$230.00$400.00");
    expect(rows[1]).toHaveTextContent("octubre de 2026$1,000.00$500.00$0.00$1,500.00$800.00");
  });

  it("shows only the chosen category, keeping Otros apart from materials", async () => {
    render(<SettledIncomeComparison periods={periods} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Otros" }));

    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).toEqual(["Periodo", "Otros", "CxC al cierre (no verificada)"]);
    expect(within(screen.getAllByRole("row")[1]).getByText("$30.00")).toBeInTheDocument();
  });

  it("states that billed amounts are not cash and documents the period boundaries", () => {
    render(<SettledIncomeComparison periods={periods} />);

    expect(screen.getByText(/No es efectivo cobrado ni saldo por cobrar/)).toBeInTheDocument();
    expect(screen.getByText(/No está verificada/)).toBeInTheDocument();
    expect(screen.getByText("Semanas de lunes a domingo; meses y años de calendario; hora de la Ciudad de México.")).toBeInTheDocument();
  });
});
