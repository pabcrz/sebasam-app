import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { buildInboxRows, prioritizeInbox } from "../inbox-priority";
import { DashboardView } from "./dashboard-view";
import { InboxRowsSection } from "./inbox-rows-section";
import { KpiPeriodMetrics } from "./kpi-period-metrics";
import { NextWorkCard } from "./next-work-card";
import { PayrollEstimateCard } from "./payroll-estimate-card";
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

describe("NextWorkCard", () => {
  const nextWork = {
    quoteId: "quote-oldest",
    number: "C-041126-01",
    title: "Refuerzo y hoja rota",
    customerName: "Mónica Granados",
    totalCents: 1_002_240,
    approvedAt: new Date("2026-11-10T18:00:00.000Z"),
    vehicle: { economicNumber: "42", plate: null, brand: "Ford", model: "Transit" },
  };

  it("shows the oldest approved quote as a featured card with an Asignar action to the approved list", () => {
    const { container } = render(<NextWorkCard nextWork={nextWork} />);

    expect(screen.getByRole("heading", { name: "Siguiente trabajo" })).toBeInTheDocument();
    expect(container.querySelector('[data-variant="featured"]')).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Refuerzo y hoja rota" })).toBeInTheDocument();
    expect(screen.getByText("C-041126-01")).toBeInTheDocument();
    expect(screen.getByText("Mónica Granados")).toBeInTheDocument();
    expect(screen.getByText("ECO 42 · Ford Transit")).toBeInTheDocument();
    expect(screen.getByText("$10,022.40")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Asignar" })).toHaveAttribute("href", "/admin/quotes?status=APPROVED");
  });
});

describe("InboxRowsSection", () => {
  const queues = { draftQuotesCount: 13, sentQuotesCount: 1, approvedQuotesCount: 2, activeExecutionCount: 1 };

  it("renders each pending row as a link to its filtered list, in priority order", () => {
    const rows = prioritizeInbox(buildInboxRows(queues, { oldestApprovedAt: null }));
    render(<InboxRowsSection heading="Para hoy" rows={rows.filter((row) => row.key === "approved" || row.key === "active")} emptyText="Nada pendiente para hoy." />);

    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/admin/quotes?status=APPROVED", "/admin/work-orders"]);
    expect(screen.getByRole("link", { name: /asignar trabajos aprobados/i })).toHaveTextContent("2");
    expect(screen.getByRole("link", { name: /completar trabajos activos/i })).toHaveTextContent("1");
  });

  it("keeps every row free of border classes and icon boxes", () => {
    const rows = prioritizeInbox(buildInboxRows(queues, { oldestApprovedAt: null }));
    render(<InboxRowsSection heading="Seguimiento de cotizaciones" rows={rows} emptyText="Sin seguimiento." />);

    for (const link of screen.getAllByRole("link")) {
      expect(link.className).not.toMatch(/border/);
      expect(link.querySelector("svg")).toBeNull();
    }
  });

  it("shows active jobs in amber with a text cue when one is stopped", () => {
    const rows = prioritizeInbox(buildInboxRows(queues, { oldestApprovedAt: null, stoppedActiveCount: 1 }));
    render(<InboxRowsSection heading="Para hoy" rows={rows.filter((row) => row.key === "active")} emptyText="Nada pendiente para hoy." />);

    const stopped = screen.getByRole("link", { name: /completar trabajos activos/i });
    expect(stopped).toHaveTextContent("1 detenido");
    expect(within(stopped).getByText("1 detenido")).toHaveClass("text-[var(--color-status-warning-fg)]");
  });

  it("does not paint follow-up rows amber", () => {
    const rows = prioritizeInbox(buildInboxRows(queues, { oldestApprovedAt: null, stoppedActiveCount: 1 }));
    render(<InboxRowsSection heading="Seguimiento de cotizaciones" rows={rows.filter((row) => row.key === "draft" || row.key === "sent")} emptyText="Sin seguimiento." />);

    for (const text of screen.getAllByText(/Sin respuesta|Pendientes de enviar/)) {
      expect(text).not.toHaveClass("text-[var(--color-status-warning-fg)]");
    }
  });

  it("shows the empty state when nothing is pending", () => {
    render(<InboxRowsSection heading="Para hoy" rows={[]} emptyText="Nada pendiente para hoy." />);

    expect(screen.getByRole("heading", { name: "Para hoy" })).toBeInTheDocument();
    expect(screen.getByText("Nada pendiente para hoy.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
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
    nextWork: {
      quoteId: "quote-oldest",
      number: "C-041126-01",
      title: "Refuerzo y hoja rota",
      customerName: "Mónica Granados",
      totalCents: 1_002_240,
      approvedAt: new Date("2026-11-10T18:00:00.000Z"),
      vehicle: null,
    },
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

  it("opens the inbox with Siguiente trabajo, then Para hoy, then seguimiento, before the finance blocks", () => {
    render(<DashboardView snapshot={sampleSnapshot} customers={[]} createQuoteAction={vi.fn()} role="SUPER_ADMIN" />);

    const headings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(headings.indexOf("Siguiente trabajo")).toBeLessThan(headings.indexOf("Para hoy"));
    expect(headings.indexOf("Para hoy")).toBeLessThan(headings.indexOf("Seguimiento de cotizaciones"));
    expect(headings.indexOf("Seguimiento de cotizaciones")).toBeLessThan(headings.indexOf("Cuentas por cobrar"));
    expect(screen.getByRole("link", { name: /dar seguimiento a cotizaciones enviadas/i })).toHaveAttribute("href", "/admin/quotes?status=SENT");
    expect(screen.getByRole("link", { name: /enviar cotizaciones borrador/i })).toHaveAttribute("href", "/admin/quotes?status=DRAFT");
    expect(screen.getByRole("link", { name: /asignar trabajos aprobados/i })).toHaveAttribute("href", "/admin/quotes?status=APPROVED");
    expect(screen.getByRole("link", { name: /completar trabajos activos/i })).toHaveAttribute("href", "/admin/work-orders");
  });

  it("hides Siguiente trabajo when no approved quote is waiting", () => {
    render(
      <DashboardView
        snapshot={{ ...sampleSnapshot, nextWork: null, queues: { ...sampleSnapshot.queues, approvedQuotesCount: 0 } }}
        customers={[]}
        createQuoteAction={vi.fn()}
        role="SUPER_ADMIN"
      />,
    );

    expect(screen.queryByRole("heading", { name: "Siguiente trabajo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Asignar" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Para hoy" })).toBeInTheDocument();
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
