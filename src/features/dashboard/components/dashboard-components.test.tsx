import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { DashboardView } from "./dashboard-view";
import { KpiPeriodMetrics } from "./kpi-period-metrics";
import { PayrollEstimateCard } from "./payroll-estimate-card";
import { QueueSnapshotCards } from "./queue-snapshot-cards";
import { PendingAttentionSection } from "./pending-attention-section";

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

    const week = screen.getByRole("tab", { name: "Semana" });
    const month = screen.getByRole("tab", { name: "Mes" });
    const year = screen.getByRole("tab", { name: "Año" });
    const weekPanel = screen.getByRole("tabpanel", { name: "Semana" });

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
    const monthPanel = screen.getByRole("tabpanel", { name: "Mes" });
    expect(screen.getByText("agosto de 2026")).toBeInTheDocument();
    expect(within(monthPanel).getByText("22")).toBeInTheDocument();

    // Switch to Year.
    fireEvent.keyDown(month, { key: "ArrowRight" });
    expect(year).toHaveFocus();
    expect(year).toHaveAttribute("aria-selected", "true");
    const yearPanel = screen.getByRole("tabpanel", { name: "Año" });
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

    const quoteLink = screen.getByRole("link", { name: /cotizaciones · 12/i });
    expect(quoteLink).toHaveAttribute("href", "/admin/quotes");
    expect(quoteLink).toHaveAttribute("title", "Cotizaciones · 12");

    const workOrderLink = screen.getByRole("link", { name: /trabajos · 8/i });
    expect(workOrderLink).toHaveAttribute("href", "/admin/work-orders");
    expect(workOrderLink).toHaveAttribute("title", "Trabajos · 8");
  });
});

describe("PendingAttentionSection", () => {
  it("renders empty state when there are no pending attention items", () => {
    render(<PendingAttentionSection items={[]} />);

    expect(screen.getByText("Por atender")).toBeInTheDocument();
    expect(screen.getByText("Nada pendiente por ahora")).toBeInTheDocument();
    expect(screen.getByText("Todas las cotizaciones y trabajos activos están al día.")).toBeInTheDocument();
  });

  it("renders pending attention items with customer, vehicle, status, and next step", () => {
    render(
      <PendingAttentionSection
        items={[
          {
            id: "q-1",
            type: "quote",
            href: "/admin/quotes/q-1",
            customerName: "Juan Pérez",
            vehicleDescription: "Nissan Versa 2021",
            statusLabel: "Borrador",
            statusVariant: "warning",
            nextStep: "Enviar cotización",
            updatedAt: new Date("2026-08-20T10:00:00.000Z"),
          },
          {
            id: "wo-1",
            type: "work_order",
            href: "/admin/work-orders/wo-1",
            customerName: "María López",
            vehicleDescription: "Ford Ranger 2019",
            statusLabel: "En progreso",
            statusVariant: "info",
            nextStep: "Finalizar trabajo",
            updatedAt: new Date("2026-08-20T11:00:00.000Z"),
          },
        ]}
      />
    );

    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("Nissan Versa 2021")).toBeInTheDocument();
    expect(screen.getByText("Borrador")).toBeInTheDocument();
    expect(screen.getByText("Enviar cotización")).toBeInTheDocument();

    expect(screen.getByText("María López")).toBeInTheDocument();
    expect(screen.getByText("Ford Ranger 2019")).toBeInTheDocument();
    expect(screen.getByText("En progreso")).toBeInTheDocument();
    expect(screen.getByText("Finalizar trabajo")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /juan pérez/i })).toHaveAttribute("href", "/admin/quotes/q-1");
    expect(screen.getByRole("link", { name: /maría lópez/i })).toHaveAttribute("href", "/admin/work-orders/wo-1");
  });
});

describe("DashboardView", () => {
  const sampleSnapshot = {
    queues: { commercialQueueCount: 12, activeExecutionCount: 8 },
    pendingAttention: [],
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
        createQuoteAction={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { level: 1, name: "Inicio" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /nueva cotización/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /nuevo cliente/i })).not.toBeInTheDocument();
    expect(screen.getByText("Por atender")).toBeInTheDocument();
    expect(screen.getByText("Resumen del período")).toBeInTheDocument();
    expect(screen.getByText("Módulos del Sistema")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Notas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Nómina" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Trabajadores" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3, name: "Clientes" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("admin-page-header")).not.toBeInTheDocument();
  });
});
