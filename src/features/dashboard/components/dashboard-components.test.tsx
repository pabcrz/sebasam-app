import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { DashboardView } from "./dashboard-view";
import { KpiPeriodMetrics } from "./kpi-period-metrics";
import { PayrollEstimateCard } from "./payroll-estimate-card";
import { QueueSnapshotCards } from "./queue-snapshot-cards";
import { ReceivablesSection } from "./receivables-section";

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
    expect(weekPanel.querySelector(".grid")).toHaveClass("grid-cols-1", "sm:grid-cols-2");
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
    const title = screen.getByRole("heading", { name: "Nómina Semanal (Estimada)" });
    const header = title.parentElement?.parentElement;
    expect(header).toHaveClass("flex-col", "items-start");
    expect(title.parentElement).toHaveClass("flex", "items-center");
    expect(title.parentElement?.querySelector("svg")).toHaveClass("shrink-0");
    expect(screen.getByText("Cálculo estimado")).toHaveClass("text-xs", "font-normal");
    expect(screen.getByText("4").parentElement).toHaveTextContent("4 trabajadores activos");
    expect(screen.getByText("$750.00")).toHaveAttribute("data-numeric-role", "currency");
    expect(screen.getByText("$750.00")).toHaveClass("text-xl", "sm:text-2xl", "tabular-nums");
    expect(screen.getByText("4")).toHaveAttribute("data-numeric-role", "supporting-count");
    expect(screen.getByRole("link", { name: /ver liquidación/i })).toHaveAttribute("href", "/admin/nomina");
  });
});

describe("QueueSnapshotCards", () => {
  it("uses the shared count role instead of a larger queue-specific scale", () => {
    render(<QueueSnapshotCards queues={{ draftQuotesCount: 12, sentQuotesCount: 7, approvedQuotesCount: 4, activeExecutionCount: 8 }} />);

    for (const value of ["12", "7", "4", "8"]) {
      expect(screen.getByText(value)).toHaveAttribute("data-numeric-role", "count");
      expect(screen.getByText(value)).toHaveClass("text-2xl", "font-mono", "tabular-nums");
      expect(screen.getByText(value)).not.toHaveClass("text-3xl");
    }
  });

  it("renders each queue as a single link to its management screen", () => {
    render(<QueueSnapshotCards queues={{ draftQuotesCount: 12, sentQuotesCount: 7, approvedQuotesCount: 4, activeExecutionCount: 8 }} />);

    expect(screen.getByRole("link", { name: /enviar cotizaciones borrador · 12/i })).toHaveAttribute("href", "/admin/quotes?status=DRAFT");
    expect(screen.getByRole("link", { name: /dar seguimiento a cotizaciones enviadas · 7/i })).toHaveAttribute("href", "/admin/quotes?status=SENT");
    expect(screen.getByRole("link", { name: /asignar o iniciar trabajos aprobados · 4/i })).toHaveAttribute("href", "/admin/quotes?status=APPROVED");

    const workOrderLink = screen.getByRole("link", { name: /completar trabajos activos · 8/i });
    expect(workOrderLink).toHaveAttribute("href", "/admin/work-orders");
  });
});

describe("ReceivablesSection", () => {
  it("links each customer balance to its account statement and identifies overdue debt", () => {
    render(<ReceivablesSection customers={[{ customerId: "customer-1", customerName: "Transportes Norte", pendingBalanceCents: 12_500, oldestUnpaidDate: new Date("2026-08-10"), isOverdue: true }]} />);
    expect(screen.getByText("Finanzas")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cuentas por cobrar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /transportes norte/i })).toHaveAttribute("href", "/admin/customers/customer-1/estado-de-cuenta");
    expect(screen.getByText("Saldo vencido")).toBeInTheDocument();
    expect(screen.getByText("$125.00")).toBeInTheDocument();
  });
});

describe("DashboardView", () => {
  const sampleSnapshot = {
    queues: { draftQuotesCount: 12, sentQuotesCount: 7, approvedQuotesCount: 4, activeExecutionCount: 8 },
    receivables: [],
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
        role="SUPER_ADMIN"
      />
    );

    expect(screen.getByRole("heading", { level: 1, name: "Inicio" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /nueva cotización/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /nuevo cliente/i })).not.toBeInTheDocument();
    expect(screen.getByText("Cuentas por cobrar")).toBeInTheDocument();
    expect(screen.getByText("Resumen del período")).toBeInTheDocument();
    expect(screen.getByText("Módulos del Sistema")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Clientes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Nómina" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Trabajadores" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3, name: "Notas" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("admin-page-header")).not.toBeInTheDocument();
  });

  it("renders the simplified operational surface for ADMIN", () => {
    render(
      <DashboardView
        snapshot={sampleSnapshot}
        customers={[]}
        createQuoteAction={vi.fn()}
        role="ADMIN"
      />,
    );

    expect(screen.getByRole("button", { name: /nueva cotización/i })).toBeInTheDocument();
    expect(screen.getByText("Módulos del Sistema")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Clientes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Cotizaciones" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Trabajos" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Notas" })).toBeInTheDocument();
    expect(screen.queryByText("Cuentas por cobrar")).not.toBeInTheDocument();
    expect(screen.queryByText("Resumen del período")).not.toBeInTheDocument();
    expect(screen.queryByText("Nómina Semanal (Estimada)")).not.toBeInTheDocument();
    const quickLinks = screen.getAllByRole("link");
    expect(quickLinks.find((link) => link.getAttribute("href") === "/admin/customers")).toHaveAttribute(
      "href",
      "/admin/customers",
    );
    expect(quickLinks.find((link) => link.getAttribute("href") === "/admin/quotes")).toHaveAttribute(
      "href",
      "/admin/quotes",
    );
    expect(quickLinks.find((link) => link.getAttribute("href") === "/admin/work-orders")).toHaveAttribute(
      "href",
      "/admin/work-orders",
    );
    expect(quickLinks.find((link) => link.getAttribute("href") === "/admin/notas")).toHaveAttribute(
      "href",
      "/admin/notas",
    );
  });
});
