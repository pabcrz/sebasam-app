import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const getWeeklyPayrollMock = vi.hoisted(() => vi.fn().mockResolvedValue({ workers: [], totalCommissionCents: 0, totalClientLaborCents: 0, totalPayrollBaseCents: 0, totalCompletedOrders: 0, totalWorkers: 0, unassignedOrders: [] }));
vi.mock("@/features/payroll/queries", () => ({ getWeeklyPayroll: getWeeklyPayrollMock }));
vi.mock("@/lib/auth/session", () => ({ requireProfileForPage: vi.fn().mockResolvedValue({ profile: { role: "ADMIN" } }) }));
import NominaPage from "./page";
describe("NominaPage", () => {
  it("renders the production PayrollView with its empty-week behavior", async () => {
    render(await NominaPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("No hay órdenes completadas en este período")).toBeInTheDocument();
    expect(screen.getByText("Semana en curso")).toBeInTheDocument();
    expect(screen.queryByText("Mensual")).not.toBeInTheDocument();
    expect(screen.queryByText("Hoja de Firmas")).not.toBeInTheDocument();
    expect(getWeeklyPayrollMock).toHaveBeenCalledWith({ mode: "weekly" });
  });
});
