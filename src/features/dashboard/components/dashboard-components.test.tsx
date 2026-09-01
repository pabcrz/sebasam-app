import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { DashboardView } from "./dashboard-view";
import { KpiPeriodMetrics } from "./kpi-period-metrics";
import { PayrollEstimateCard } from "./payroll-estimate-card";
import { QueueSnapshotCards } from "./queue-snapshot-cards";

describe("KpiPeriodMetrics", () => {
  const sampleKpis = {
    week: {
      period: "week" as const,
      rangeLabel: "17–22 de ago de 2026",
      startDate: new Date("2026-08-17T06:00:00.000Z"),
      endDate: new Date("2026-08-23T06:00:00.000Z"),
      completedWorkOrdersCount: 5,
      completedLaborBilledCents: 150000,
      completedMaterialsBilledCents: 80000,
      collectedPaymentsCount: 3,
      collectedPaymentsTotalCents: 120000,
    },
    month: {
      period: "month" as const,
      rangeLabel: "agosto de 2026",
      startDate: new Date("2026-08-01T06:00:00.000Z"),
      endDate: new Date("2026-09-01T06:00:00.000Z"),
      completedWorkOrdersCount: 22,
      completedLaborBilledCents: 650000,
      completedMaterialsBilledCents: 320000,
      collectedPaymentsCount: 18,
      collectedPaymentsTotalCents: 580000,
    },
    year: {
      period: "year" as const,
      rangeLabel: "2026",
      startDate: new Date("2026-01-01T06:00:00.000Z"),
      endDate: new Date("2027-01-01T06:00:00.000Z"),
      completedWorkOrdersCount: 150,
      completedLaborBilledCents: 4500000,
      completedMaterialsBilledCents: 2100000,
      collectedPaymentsCount: 130,
      collectedPaymentsTotalCents: 4200000,
    },
  };

  it("renders week KPIs by default and switches periods with keyboard tabs", () => {
    render(<KpiPeriodMetrics kpis={sampleKpis} />);

    const week = screen.getByRole("tab", { name: "Esta semana" });
    const month = screen.getByRole("tab", { name: "Este mes" });
    const year = screen.getByRole("tab", { name: "Este año" });
    const weekPanel = screen.getByRole("tabpanel", { name: "Esta semana" });

    // Default: Week
    expect(screen.getByText("17–22 de ago de 2026")).toBeInTheDocument();
    expect(within(weekPanel).getByText("5")).toHaveAttribute("data-numeric-role", "count");
    expect(within(weekPanel).getByText("Materiales y Refacciones")).toBeInTheDocument();
    expect(within(weekPanel).getByText(/\$1,?500\.00/)).toHaveAttribute("data-numeric-role", "currency");
    expect(within(weekPanel).getByText(/\$1,?500\.00/)).toHaveClass("text-xl", "sm:text-2xl", "tabular-nums");
    expect(week).toHaveAttribute("aria-selected", "true");
    expect(week).toHaveAttribute("aria-controls");
    expect(weekPanel).toHaveAttribute("aria-labelledby", week.id);

    // Switch to Month with roving focus.
    week.focus();
    fireEvent.keyDown(week, { key: "ArrowRight" });
    expect(month).toHaveFocus();
    expect(month).toHaveAttribute("aria-selected", "true");
    const monthPanel = screen.getByRole("tabpanel", { name: "Este mes" });
    expect(screen.getByText("agosto de 2026")).toBeInTheDocument();
    expect(within(monthPanel).getByText("22")).toBeInTheDocument();

    // Switch to Year.
    fireEvent.keyDown(month, { key: "ArrowRight" });
    expect(year).toHaveFocus();
    expect(year).toHaveAttribute("aria-selected", "true");
    const yearPanel = screen.getByRole("tabpanel", { name: "Este año" });
    expect(screen.getByText("2026")).toBeInTheDocument();
    expect(within(yearPanel).getByText("150")).toBeInTheDocument();
  });
});

describe("PayrollEstimateCard", () => {
  it("renders payroll estimate with calculated disclaimer badge", () => {
    render(
      <PayrollEstimateCard
        payroll={{
          rangeLabel: "17–22 de ago de 2026",
          startDate: new Date("2026-08-17T06:00:00.000Z"),
          endDate: new Date("2026-08-23T06:00:00.000Z"),
          isCurrentWeek: true,
          totalWorkers: 4,
          totalCompletedOrders: 6,
          estimatedCommissionsCents: 75000,
        }}
      />
    );

    expect(screen.getByText("Nómina Semanal (Estimada)")).toBeInTheDocument();
    expect(screen.getByText("Cálculo estimado")).toBeInTheDocument();
    expect(screen.getByText("4").parentElement).toHaveTextContent("4 trabajadores activos");
    expect(screen.getByText("$750.00")).toHaveAttribute("data-numeric-role", "currency");
    expect(screen.getByText("$750.00")).toHaveClass("text-xl", "sm:text-2xl", "tabular-nums");
    expect(screen.getByText("4")).toHaveAttribute("data-numeric-role", "supporting-count");
    expect(screen.getByRole("link", { name: /ver liquidación/i })).toHaveAttribute("href", "/admin/nomina");
  });
});

describe("QueueSnapshotCards", () => {
  it("uses the shared count role instead of a larger queue-specific scale", () => {
    render(<QueueSnapshotCards queues={{ commercialQueueCount: 12, activeExecutionCount: 8 }} />);

    for (const value of ["12", "8"]) {
      expect(screen.getByText(value)).toHaveAttribute("data-numeric-role", "count");
      expect(screen.getByText(value)).toHaveClass("text-2xl", "font-mono", "tabular-nums");
      expect(screen.getByText(value)).not.toHaveClass("text-3xl");
    }
  });

  it("renders each queue as a single link to its management screen", () => {
    render(<QueueSnapshotCards queues={{ commercialQueueCount: 12, activeExecutionCount: 8 }} />);

    expect(screen.getByRole("link", { name: /ver cotizaciones/i })).toHaveAttribute(
      "href",
      "/admin/quotes"
    );
    expect(screen.getByRole("link", { name: /ver trabajos/i })).toHaveAttribute(
      "href",
      "/admin/work-orders"
    );
  });
});

describe("DashboardView", () => {
  const sampleSnapshot = {
    queues: { commercialQueueCount: 12, activeExecutionCount: 8 },
    kpis: {
      week: {
        period: "week" as const,
        rangeLabel: "17–22 de ago de 2026",
        startDate: new Date("2026-08-17T06:00:00.000Z"),
        endDate: new Date("2026-08-23T06:00:00.000Z"),
        completedWorkOrdersCount: 5,
        completedLaborBilledCents: 150000,
        completedMaterialsBilledCents: 80000,
        collectedPaymentsCount: 3,
        collectedPaymentsTotalCents: 120000,
      },
      month: {
        period: "month" as const,
        rangeLabel: "agosto de 2026",
        startDate: new Date("2026-08-01T06:00:00.000Z"),
        endDate: new Date("2026-09-01T06:00:00.000Z"),
        completedWorkOrdersCount: 22,
        completedLaborBilledCents: 650000,
        completedMaterialsBilledCents: 320000,
        collectedPaymentsCount: 18,
        collectedPaymentsTotalCents: 580000,
      },
      year: {
        period: "year" as const,
        rangeLabel: "2026",
        startDate: new Date("2026-01-01T06:00:00.000Z"),
        endDate: new Date("2027-01-01T06:00:00.000Z"),
        completedWorkOrdersCount: 150,
        completedLaborBilledCents: 4500000,
        completedMaterialsBilledCents: 2100000,
        collectedPaymentsCount: 130,
        collectedPaymentsTotalCents: 4200000,
      },
    },
    weeklyPayroll: {
      rangeLabel: "17–22 de ago de 2026",
      startDate: new Date("2026-08-17T06:00:00.000Z"),
      endDate: new Date("2026-08-23T06:00:00.000Z"),
      isCurrentWeek: true,
      totalWorkers: 4,
      totalCompletedOrders: 6,
      estimatedCommissionsCents: 75000,
    },
    generatedAt: new Date("2026-08-20T12:00:00.000Z"),
  };

  it("renders accessible heading and action toolbar in the unified layout", () => {
    render(
      <DashboardView
        snapshot={sampleSnapshot}
        customers={[]}
        createCustomerAction={vi.fn()}
        createQuoteAction={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { level: 1, name: "Inicio" })).toHaveClass("sr-only");
    expect(screen.getByRole("button", { name: /nuevo cliente/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /nueva cotización/i })).toBeInTheDocument();
    expect(screen.getByText("Módulos del Sistema")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-page-header")).not.toBeInTheDocument();
  });
});
