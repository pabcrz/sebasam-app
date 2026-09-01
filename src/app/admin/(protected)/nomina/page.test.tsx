import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/features/payroll/queries", () => ({ getWeeklyPayroll: vi.fn().mockResolvedValue({ workers: [], totalCommissionCents: 0, totalClientLaborCents: 0, totalPayrollBaseCents: 0, totalCompletedOrders: 0, totalWorkers: 0, unassignedOrders: [] }) }));
import NominaPage from "./page";
describe("NominaPage", () => {
  it("renders the production PayrollView with its empty-week behavior", async () => {
    render(await NominaPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByTestId("admin-page-header")).not.toBeInTheDocument();
    expect(screen.getByText("No hay órdenes completadas en esta semana")).toBeInTheDocument();
    expect(screen.getByText("Semana en curso")).toBeInTheDocument();
  });
});
