import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuoteItemType, WorkerKind } from "@prisma/client";
import { PayrollPeriodNav } from "./payroll-period-nav";
import { PayrollMetrics } from "./payroll-metrics";
import { PayrollWorkerCard, PayrollUnassignedCard } from "./payroll-worker-card";
import { PayrollView } from "./payroll-view";
import type { WeeklyPayrollReport, WorkerPayrollSummary } from "../domain";
import type { ParsedPayrollParams } from "../period";

describe("Payroll UI Components", () => {
  it("renders period navigation with range label and buttons", () => {
    render(
      <PayrollPeriodNav
        rangeLabel="17–23 de agosto de 2026"
        anchor="2026-08-17"
        prevAnchor="2026-08-10"
        nextAnchor="2026-08-24"
        isCurrentWeek={true}
      />
    );

    expect(screen.getByText("17–23 de agosto de 2026")).toBeInTheDocument();
    expect(screen.getByText("Semana en curso")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /semana anterior/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /semana siguiente/i })).toBeInTheDocument();
  });

  it("renders metrics with formatted amounts", () => {
    render(
      <PayrollMetrics
        totalCommissionCents={150000} // $1,500
        totalClientLaborCents={300000} // $3,000
        totalPayrollBaseCents={300000}
        totalCompletedOrders={4}
        totalWorkers={2}
      />
    );

    expect(screen.getByText("$1,500.00")).toBeInTheDocument();
    expect(screen.getByText("$3,000.00")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders worker card with order details and welding badges", () => {
    const worker: WorkerPayrollSummary = {
      workerId: "w-1",
      displayName: "Maestro Pedro",
      workerKind: WorkerKind.MASTER,
      completedOrderCount: 1,
      totalClientLaborCents: 100000,
      totalPayrollBaseCents: 100000,
      totalCommissionCents: 40000,
      workOrders: [
        {
          workOrderId: "wo-1",
          workOrderNumber: "OT-010",
          quoteId: "q-1",
          quoteNumber: "COT-010",
          clientName: "Flotillas SA",
          vehicleSummary: "Isuzu Forward (ABC-999)",
          completedAt: new Date("2026-08-20T10:00:00Z"),
          isSpecial: false,
          helperNames: ["Ayudante Luis"],
          items: [
            {
              id: "item-1",
              type: QuoteItemType.LABOR,
              description: "Soldadura chasis",
              quantity: 1,
              unitPriceCents: 100000,
              clientTotalCents: 100000,
              payrollBaseCents: 100000,
              category: "WELDING",
              ratePercent: 40,
              commissionCents: 40000,
            },
          ],
          totalClientLaborCents: 100000,
          totalPayrollBaseCents: 100000,
          totalCommissionCents: 40000,
        },
      ],
    };

    render(<PayrollWorkerCard worker={worker} />);

    expect(screen.getByText("Maestro Pedro")).toBeInTheDocument();
    expect(screen.getByText("OT-010")).toBeInTheDocument();
    expect(screen.getAllByText("Soldadura chasis").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Soldadura / Soplete")).toBeInTheDocument();
    expect(screen.getAllByText(/40%/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders unassigned card warning when orders exist without master", () => {
    render(
      <PayrollUnassignedCard
        orders={[
          {
            workOrderId: "wo-unassigned",
            workOrderNumber: "OT-999",
            quoteId: "q-99",
            quoteNumber: "COT-999",
            clientName: "Cliente Sin Asignar",
            vehicleSummary: "Ford F150",
            completedAt: new Date(),
            isSpecial: false,
            helperNames: [],
            items: [],
            totalClientLaborCents: 50000,
            totalPayrollBaseCents: 50000,
            totalCommissionCents: 25000,
          },
        ]}
      />
    );

    expect(screen.getByText(/Órdenes completadas sin maestro asignado/i)).toBeInTheDocument();
    expect(screen.getByText(/OT-999/i)).toBeInTheDocument();
  });

  it("renders empty state in PayrollView when there are no completed orders", () => {
    const emptyReport: WeeklyPayrollReport = {
      startDate: new Date("2026-08-17T00:00:00Z"),
      endDate: new Date("2026-08-24T00:00:00Z"),
      rangeLabel: "17–23 de agosto de 2026",
      isCurrentWeek: true,
      totalWorkers: 0,
      totalCompletedOrders: 0,
      totalClientLaborCents: 0,
      totalPayrollBaseCents: 0,
      totalCommissionCents: 0,
      workers: [],
      unassignedOrders: [],
    };

    const period: ParsedPayrollParams = {
      anchor: "2026-08-17",
      prevAnchor: "2026-08-10",
      nextAnchor: "2026-08-24",
      rangeLabel: "17–23 de agosto de 2026",
      isCurrentWeek: true,
      start: new Date("2026-08-17T00:00:00Z"),
      end: new Date("2026-08-24T00:00:00Z"),
    };

    render(<PayrollView report={emptyReport} period={period} />);

    expect(screen.getByText(/No hay órdenes completadas en esta semana/i)).toBeInTheDocument();
  });
});
