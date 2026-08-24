import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuoteItemType, WorkerKind } from "@prisma/client";
import { PayrollPeriodNav } from "./payroll-period-nav";
import { PayrollMetrics } from "./payroll-metrics";
import { PayrollUnassignedCard } from "./payroll-worker-card";
import { PayrollOverviewTable } from "./payroll-overview-table";
import { PayrollWorkerDetail } from "./payroll-worker-detail";
import { PayrollView } from "./payroll-view";
import type { WeeklyPayrollReport, WorkerPayrollSummary } from "../domain";
import type { ParsedPayrollParams } from "../period";

const sampleWorkers: WorkerPayrollSummary[] = [
  {
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
  },
  {
    workerId: "w-2",
    displayName: "Maestro Juan",
    workerKind: WorkerKind.MASTER,
    completedOrderCount: 2,
    totalClientLaborCents: 200000,
    totalPayrollBaseCents: 200000,
    totalCommissionCents: 100000,
    workOrders: [],
  },
];

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

    expect(screen.getAllByText("$1,500.00").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("$3,000.00").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("4").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
  });

  it("renders overview table and allows worker selection", () => {
    const onSelect = vi.fn();
    render(
      <PayrollOverviewTable
        workers={sampleWorkers}
        selectedWorkerId="w-1"
        onSelectWorker={onSelect}
      />
    );

    expect(screen.getByText("Resumen General de Nómina")).toBeInTheDocument();
    expect(screen.getAllByText("Maestro Pedro").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Maestro Juan").length).toBeGreaterThanOrEqual(1);

    const juanButtons = screen.getAllByRole("button", { name: /ver detalle/i });
    fireEvent.click(juanButtons[0]);
    expect(onSelect).toHaveBeenCalledWith("w-2");
  });

  it("renders worker detail tabs and expands work order accordion", () => {
    const onSelect = vi.fn();
    render(
      <PayrollWorkerDetail
        workers={sampleWorkers}
        selectedWorkerId="w-1"
        onSelectWorker={onSelect}
      />
    );

    expect(screen.getAllByText("Maestro Pedro").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("OT-010")).toBeInTheDocument();
    expect(screen.getAllByText("Soldadura chasis").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Soldadura / Soplete")).toBeInTheDocument();
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
