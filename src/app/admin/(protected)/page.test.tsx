import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

const getOperationalDashboardSnapshotMock = vi.hoisted(() => vi.fn());
const listCustomersMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/dashboard/queries", () => ({
  getOperationalDashboardSnapshot: getOperationalDashboardSnapshotMock,
}));

vi.mock("@/features/customers/queries", () => ({
  listCustomers: listCustomersMock,
}));

vi.mock("@/features/customers/actions", () => ({
  createCustomerFromForm: vi.fn(),
  createOrReuseCustomerForQuote: vi.fn(),
  searchCustomersForQuote: vi.fn(),
}));

vi.mock("@/features/quotes/actions", () => ({
  createQuoteFromWorkspace: vi.fn(),
}));

import AdminHomePage from "./page";

describe("AdminHomePage", () => {
  it("fetches operational snapshot and renders dashboard overview", async () => {
    listCustomersMock.mockResolvedValue([]);
    getOperationalDashboardSnapshotMock.mockResolvedValue({
      generatedAt: new Date("2026-08-19T14:00:00.000Z"),
      queues: {
        commercialQueueCount: 4,
        activeExecutionCount: 2,
      },
      kpis: {
        week: {
          period: "week",
          rangeLabel: "17–22 de ago de 2026",
          startDate: new Date("2026-08-17T06:00:00.000Z"),
          endDate: new Date("2026-08-23T06:00:00.000Z"),
          completedWorkOrdersCount: 3,
          completedLaborBilledCents: 120000,
          completedMaterialsBilledCents: 75000,
          collectedPaymentsCount: 2,
          collectedPaymentsTotalCents: 150000,
        },
        month: {
          period: "month",
          rangeLabel: "agosto de 2026",
          startDate: new Date("2026-08-01T06:00:00.000Z"),
          endDate: new Date("2026-09-01T06:00:00.000Z"),
          completedWorkOrdersCount: 8,
          completedLaborBilledCents: 450000,
          completedMaterialsBilledCents: 240000,
          collectedPaymentsCount: 7,
          collectedPaymentsTotalCents: 520000,
        },
        year: {
          period: "year",
          rangeLabel: "2026",
          startDate: new Date("2026-01-01T06:00:00.000Z"),
          endDate: new Date("2027-01-01T06:00:00.000Z"),
          completedWorkOrdersCount: 45,
          completedLaborBilledCents: 2300000,
          completedMaterialsBilledCents: 1100000,
          collectedPaymentsCount: 40,
          collectedPaymentsTotalCents: 3100000,
        },
      },
      weeklyPayroll: {
        rangeLabel: "17–22 de ago de 2026",
        startDate: new Date("2026-08-17T06:00:00.000Z"),
        endDate: new Date("2026-08-23T06:00:00.000Z"),
        isCurrentWeek: true,
        totalWorkers: 3,
        totalCompletedOrders: 3,
        estimatedCommissionsCents: 48000,
      },
    });

    const page = await AdminHomePage();
    render(page);

    expect(screen.getByRole("heading", { name: "Panel de operaciones", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Cola Comercial (Cotizaciones)")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Ejecución Activa (Taller)")).toBeInTheDocument();
    const activeExecutionCard = screen.getByRole("link", { name: /Ejecución Activa \(Taller\)/ });
    expect(within(activeExecutionCard).getByText("2")).toHaveAttribute("data-numeric-role", "count");
    expect(screen.getByText("Nómina Semanal (Estimada)")).toBeInTheDocument();
    expect(screen.getByText("Cálculo estimado")).toBeInTheDocument();
    expect(screen.getByText("Clientes")).toBeInTheDocument();
    expect(screen.getByText("Cotizaciones")).toBeInTheDocument();
  });
});
