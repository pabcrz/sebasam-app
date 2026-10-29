import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { PayrollPeriodStatus, QuoteItemType, WorkerKind } from "@/generated/prisma/client";
import { PayrollPeriodNav } from "./payroll-period-nav";
import { PayrollMetrics } from "./payroll-metrics";
import { PayrollUnassignedCard } from "./payroll-worker-card";
import { PayrollOverviewTable } from "./payroll-overview-table";
import { PayrollWorkerDetail } from "./payroll-worker-detail";
import { PayrollView } from "./payroll-view";
import { PayrollWorkerEnvelopeDocument } from "./payroll-worker-envelope-document";
import { PayrollWorkerEnvelopeModal } from "./payroll-worker-envelope";
import { WeeklyPayrollSummary } from "./weekly-payroll-summary";
import type { WeeklyPayrollReport, WorkerPayrollSummary } from "../domain";
import type { ParsedPayrollParams } from "../period";
import toast from "react-hot-toast";
import { updatePayrollItemBase } from "../actions";

vi.mock("react-hot-toast", () => {
  const toastMock = {
    success: vi.fn(),
    error: vi.fn(),
  };
  return {
    default: toastMock,
    toast: toastMock,
  };
});

vi.mock("../actions", () => ({
  updatePayrollItemBase: vi.fn(),
  updateFixedPayHelperAdjustments: vi.fn(),
}));

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
        workTitle: "Reparación de chasis",
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
        rangeLabel="17–22 de agosto de 2026"
        anchor="2026-08-17"
        prevAnchor="2026-08-10"
        nextAnchor="2026-08-24"
        isCurrentWeek={true}
      />
    );

    expect(screen.getByText("17–22 de agosto de 2026")).toBeInTheDocument();
    expect(screen.getByText("Semana en curso")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /semana anterior/i })).toHaveAttribute(
      "href",
      "/admin/nomina?anchor=2026-08-10"
    );
    expect(screen.getByRole("link", { name: /semana siguiente/i })).toHaveAttribute(
      "href",
      "/admin/nomina?anchor=2026-08-24"
    );
    expect(screen.getByTestId("payroll-period-nav")).toHaveClass("min-w-0", "max-w-full");
    expect(screen.getByTestId("payroll-period-nav").querySelector("div.flex.flex-wrap")).toBeInTheDocument();
  });

  it("keeps ADMIN payroll weekly and read-only", () => {
    render(
      <PayrollPeriodNav
        role="ADMIN"
        mode="weekly"
        rangeLabel="17–22 de agosto de 2026"
        anchor="2026-08-17"
        prevAnchor="2026-08-10"
        nextAnchor="2026-08-24"
        weekStatus={PayrollPeriodStatus.OPEN}
        onOpenSigningSheet={vi.fn()}
      />,
    );

    expect(screen.getByRole("link", { name: /semana anterior/i })).toHaveAttribute(
      "href",
      "/admin/nomina?anchor=2026-08-10",
    );
    expect(screen.queryByText("Mensual")).not.toBeInTheDocument();
    expect(screen.queryByText("Hoja de Firmas")).not.toBeInTheDocument();
    expect(screen.queryByText("Semana Abierta")).not.toBeInTheDocument();
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
    expect(screen.getAllByText("$3,000.00")[0]).toHaveClass("break-words");
    expect(screen.getByTestId("payroll-metrics-desktop")).toHaveClass("min-w-0", "max-w-full");
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
    expect(screen.getByTestId("payroll-overview-table")).toHaveClass("min-w-0", "max-w-full");
    expect(screen.getAllByText("Maestro Pedro").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Maestro Juan").length).toBeGreaterThanOrEqual(1);

    const juanButtons = screen.getAllByRole("button", { name: /ver detalle/i });
    fireEvent.click(juanButtons[0]);
    expect(onSelect).toHaveBeenCalledWith("w-2");
  });

  it("keeps long worker names untruncated with the worker-kind badge below", () => {
    const longName = "Refugio Antonio Hernández de la Cruz";

    render(
      <PayrollOverviewTable
        workers={[{ ...sampleWorkers[0], displayName: longName }]}
        selectedWorkerId={null}
        onSelectWorker={vi.fn()}
      />
    );

    const mobileCards = screen.getByTestId("payroll-overview-mobile-cards");
    const name = within(mobileCards).getByText(longName);
    const badge = within(mobileCards).getByText("Maestro");

    expect(name).toHaveClass("max-w-full", "break-words");
    expect(name).not.toHaveClass("truncate");
    expect(badge.parentElement).toHaveClass("flex", "min-w-0", "max-w-full", "flex-col");
    expect(badge.parentElement?.textContent).toBe(`${longName}Maestro`);
  });

  it("renders worker detail with work order concepts collapsed by default", () => {
    render(
      <PayrollWorkerDetail
        workers={sampleWorkers}
        selectedWorkerId="w-1"
      />
    );

    expect(screen.getByText("Mano de obra - Maestro Pedro")).toBeInTheDocument();
    expect(screen.getByText("Reparación de chasis")).toBeInTheDocument();
    expect(screen.getByText("Folio OT-010 · COT-010")).toBeInTheDocument();
    expect(screen.queryByText("Soldadura chasis")).not.toBeInTheDocument();
    expect(screen.queryByText("Soldadura / Soplete")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ver conceptos" }));

    expect(screen.getAllByText("Soldadura chasis").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Soldadura / Soplete").length).toBeGreaterThanOrEqual(1);
  });

  it("keeps every order collapsed until its concepts are opened manually", () => {
    const selectedWorkerWithTwoOrders: WorkerPayrollSummary = {
      ...sampleWorkers[0],
      completedOrderCount: 2,
      totalClientLaborCents: 150000,
      totalPayrollBaseCents: 150000,
      totalCommissionCents: 60000,
      workOrders: [
        ...sampleWorkers[0].workOrders,
        {
          ...sampleWorkers[0].workOrders[0],
          workOrderId: "wo-2",
          workOrderNumber: "OT-011",
          quoteId: "q-2",
          quoteNumber: "COT-011",
          items: [
            {
              ...sampleWorkers[0].workOrders[0].items[0],
              id: "item-2",
              description: "Instalación de frenos",
              clientTotalCents: 50000,
              payrollBaseCents: 50000,
              commissionCents: 20000,
            },
          ],
          totalClientLaborCents: 50000,
          totalPayrollBaseCents: 50000,
          totalCommissionCents: 20000,
        },
      ],
    };
    const otherWorker: WorkerPayrollSummary = {
      ...sampleWorkers[1],
      workOrders: [
        {
          ...sampleWorkers[0].workOrders[0],
          workOrderId: "wo-other",
          workOrderNumber: "OT-OTHER",
          items: [
            {
              ...sampleWorkers[0].workOrders[0].items[0],
              id: "item-other",
              description: "Trabajo de otro maestro",
            },
          ],
        },
      ],
    };

    render(
      <PayrollWorkerDetail
        workers={[selectedWorkerWithTwoOrders, otherWorker]}
        selectedWorkerId="w-1"
      />
    );

    expect(screen.queryByText("Soldadura chasis")).not.toBeInTheDocument();
    expect(screen.queryByText("Instalación de frenos")).not.toBeInTheDocument();
    expect(screen.queryByText("Trabajo de otro maestro")).not.toBeInTheDocument();

    const showButtons = screen.getAllByRole("button", { name: "Ver conceptos" });
    expect(showButtons).toHaveLength(2);

    fireEvent.click(showButtons[1]);

    expect(screen.getAllByText("Instalación de frenos").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Soldadura chasis")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Ver conceptos" })).toHaveLength(1);
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
      mode: "weekly",
      anchor: "2026-08-17",
      prevAnchor: "2026-08-10",
      nextAnchor: "2026-08-24",
      rangeLabel: "17–23 de agosto de 2026",
      isCurrentWeek: true,
      isCurrentPeriod: true,
      start: new Date("2026-08-17T00:00:00Z"),
      end: new Date("2026-08-24T00:00:00Z"),
    };

    render(<PayrollView report={emptyReport} period={period} />);

    expect(screen.getByText(/No hay órdenes completadas en este período/i)).toBeInTheDocument();
  });

  it("shows fixed-pay helpers separately without a work-order breakdown", () => {
    const period: ParsedPayrollParams = {
      mode: "weekly",
      anchor: "2026-08-17",
      prevAnchor: "2026-08-10",
      nextAnchor: "2026-08-24",
      rangeLabel: "17 al 22 de agosto de 2026",
      isCurrentWeek: true,
      isCurrentPeriod: true,
      start: new Date("2026-08-17T06:00:00Z"),
      end: new Date("2026-08-23T06:00:00Z"),
    };
    const report: WeeklyPayrollReport = {
      startDate: period.start,
      endDate: period.end,
      rangeLabel: period.rangeLabel,
      isCurrentWeek: true,
      totalWorkers: 1,
      totalCompletedOrders: 0,
      totalClientLaborCents: 0,
      totalPayrollBaseCents: 0,
      totalCommissionCents: 0,
      totalFixedWeeklyPayCents: 600000,
      totalPayableCents: 600000,
      workers: [],
      fixedPayHelpers: [
        {
          workerId: "helper-1",
          displayName: "Helper One",
          weeklyRateCents: 600000,
          dailyRateCents: 100000,
          absenceDays: 0,
          absenceDeductionCents: 0,
          manualCommissionCents: 0,
          totalPayableCents: 600000,
        },
      ],
      unassignedOrders: [],
    };

    render(<PayrollView report={report} period={period} />);

    expect(screen.getByText("Ayudantes generales")).toBeInTheDocument();
    expect(screen.getAllByText("Helper One")).toHaveLength(2);
    expect(screen.queryByText("Mano de obra - Helper One")).not.toBeInTheDocument();
  });

  it("prints one weekly summary and switches only its presentation amounts", () => {
    const period: ParsedPayrollParams = {
      mode: "weekly", anchor: "2026-08-17", prevAnchor: "2026-08-10", nextAnchor: "2026-08-24",
      rangeLabel: "17 al 22 de agosto de 2026", isCurrentWeek: true, isCurrentPeriod: true,
      start: new Date("2026-08-17T06:00:00Z"), end: new Date("2026-08-23T06:00:00Z"),
    };
    const report: WeeklyPayrollReport = {
      startDate: period.start, endDate: period.end, rangeLabel: period.rangeLabel, isCurrentWeek: true,
      totalWorkers: 2, totalCompletedOrders: 1, totalClientLaborCents: 100000,
      totalPayrollBaseCents: 100000, totalCommissionCents: 40000,
      workers: [
        sampleWorkers[0],
        {
          ...sampleWorkers[1],
          workOrders: [
            {
              ...sampleWorkers[0].workOrders[0],
              workOrderId: "wo-50",
              workOrderNumber: "OT-050",
              items: [
                {
                  ...sampleWorkers[0].workOrders[0].items[0],
                  id: "item-50",
                  description: "Trabajo general",
                  category: "GENERAL",
                  ratePercent: 50,
                  commissionCents: 50000,
                },
              ],
              totalCommissionCents: 50000,
            },
          ],
        },
      ],
      unassignedOrders: [],
    };

    render(<PayrollView report={report} period={period} />);

    const modeSelect = screen.getByLabelText("Presentación");
    expect(modeSelect).toHaveValue("normal");
    expect(screen.getAllByRole("button", { name: "Imprimir resumen semanal de nómina" })).toHaveLength(1);
    const reportDocument = document.getElementById("weekly-payroll-summary-document")!;
    const paymentCells = () => Array.from(within(reportDocument).getByText("Pago").closest("tr")!.querySelectorAll("td"));
    expect(paymentCells().slice(1).map((cell) => cell.textContent)).toEqual(["$400.00", "$500.00"]);
    fireEvent.change(modeSelect, { target: { value: "adjusted" } });
    expect(screen.getByText("17 al 22 de agosto de 2026 · Ajustada", { selector: "p" })).toBeInTheDocument();
    expect(within(reportDocument).getAllByText("$800.00").length).toBeGreaterThan(0);
    expect(paymentCells().slice(1).map((cell) => cell.textContent)).toEqual(["$400.00", "$500.00"]);
  });

  it("keeps weekly report content print-only with restrained row separators", () => {
    const report: WeeklyPayrollReport = {
      startDate: new Date("2026-08-17T06:00:00Z"),
      endDate: new Date("2026-08-23T06:00:00Z"),
      rangeLabel: "17 al 22 de agosto de 2026",
      isCurrentWeek: true,
      totalWorkers: 2,
      totalCompletedOrders: 1,
      totalClientLaborCents: 100000,
      totalPayrollBaseCents: 100000,
      totalCommissionCents: 40000,
      workers: sampleWorkers,
      unassignedOrders: [],
    };

    render(<WeeklyPayrollSummary report={report} />);

    expect(screen.getByLabelText("Presentación")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Imprimir resumen semanal de nómina" })).toBeInTheDocument();
    const reportDocument = document.getElementById("weekly-payroll-summary-document")!;
    expect(reportDocument).toHaveClass("hidden", "print:block");
    expect(within(reportDocument).getByText("Pago")).toBeInTheDocument();
    expect(within(reportDocument).getByRole("table").querySelector("tbody")).toHaveClass("divide-y");
    expect(reportDocument.querySelector("th")).not.toHaveClass("border");
    expect(reportDocument.querySelector("td")).not.toHaveClass("border");
  });

  it("includes the SEBASAM logo beside the title in the printable report header", () => {
    const report: WeeklyPayrollReport = {
      startDate: new Date("2026-08-17T06:00:00Z"),
      endDate: new Date("2026-08-23T06:00:00Z"),
      rangeLabel: "17 al 22 de agosto de 2026",
      isCurrentWeek: true,
      totalWorkers: 2,
      totalCompletedOrders: 1,
      totalClientLaborCents: 100000,
      totalPayrollBaseCents: 100000,
      totalCommissionCents: 40000,
      workers: sampleWorkers,
      unassignedOrders: [],
    };

    render(<WeeklyPayrollSummary report={report} />);

    const reportDocument = document.getElementById("weekly-payroll-summary-document")!;
    const logo = within(reportDocument).getByAltText("Logo de SEBASAM");
    expect(logo.getAttribute("src")).toContain(encodeURIComponent("/logo-white-short.png"));
    expect(logo).toHaveAttribute("width", "32");
    expect(logo).toHaveAttribute("height", "32");
    expect(logo).toHaveClass("object-contain", "invert");
    expect(logo.closest("header")?.textContent).toContain("Resumen semanal de nómina");
  });

  it("opens the confidential signing sheet modal when clicking Hoja de Firmas", () => {
    const period: ParsedPayrollParams = {
      mode: "weekly",
      anchor: "2026-08-17",
      prevAnchor: "2026-08-10",
      nextAnchor: "2026-08-24",
      rangeLabel: "17 al 22 de agosto de 2026",
      isCurrentWeek: true,
      isCurrentPeriod: true,
      start: new Date("2026-08-17T06:00:00Z"),
      end: new Date("2026-08-23T06:00:00Z"),
    };

    const fullReport: WeeklyPayrollReport = {
      mode: "weekly",
      startDate: new Date("2026-08-17T06:00:00Z"),
      endDate: new Date("2026-08-23T06:00:00Z"),
      rangeLabel: "17 al 22 de agosto de 2026",
      isCurrentWeek: true,
      totalWorkers: 2,
      totalCompletedOrders: 3,
      totalClientLaborCents: 300000,
      totalPayrollBaseCents: 300000,
      totalCommissionCents: 140000,
      workers: sampleWorkers,
      unassignedOrders: [],
    };

    render(<PayrollView report={fullReport} period={period} />);

    const signingSheetBtn = screen.getByRole("button", { name: /hoja de firmas/i });
    fireEvent.click(signingSheetBtn);

    expect(screen.getAllByText(/Hoja de Firma de Nómina/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByAltText("Logo de SEBASAM").some((logo) => logo.getAttribute("width") === "44")).toBe(true);
    expect(screen.getByText("Personalizar lista de trabajadores:")).toBeInTheDocument();
    // Confirms worker names appear
    expect(screen.getAllByText("Maestro Pedro").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Maestro Juan").length).toBeGreaterThanOrEqual(1);

    // Test adding a custom worker
    const addInput = screen.getByPlaceholderText(/Nombre del trabajador adicional/i);
    fireEvent.change(addInput, { target: { value: "Ayudante Roberto" } });
    const addBtn = screen.getByRole("button", { name: "Agregar" });
    fireEvent.click(addBtn);
    expect(screen.getByText("Ayudante Roberto")).toBeInTheDocument();
  });

  it("opens individual payroll receipt modal when clicking Recibo de Nómina", () => {
    const period: ParsedPayrollParams = {
      mode: "weekly",
      anchor: "2026-08-17",
      prevAnchor: "2026-08-10",
      nextAnchor: "2026-08-24",
      rangeLabel: "17 al 22 de agosto de 2026",
      isCurrentWeek: true,
      isCurrentPeriod: true,
      start: new Date("2026-08-17T06:00:00Z"),
      end: new Date("2026-08-23T06:00:00Z"),
    };

    const fullReport: WeeklyPayrollReport = {
      mode: "weekly",
      startDate: new Date("2026-08-17T06:00:00Z"),
      endDate: new Date("2026-08-23T06:00:00Z"),
      rangeLabel: "17 al 22 de agosto de 2026",
      isCurrentWeek: true,
      totalWorkers: 2,
      totalCompletedOrders: 3,
      totalClientLaborCents: 300000,
      totalPayrollBaseCents: 300000,
      totalCommissionCents: 140000,
      workers: sampleWorkers,
      unassignedOrders: [],
    };

    render(<PayrollView report={fullReport} period={period} />);

    const envelopeBtn = screen.getByRole("button", { name: /recibo de nómina/i });
    fireEvent.click(envelopeBtn);

    expect(screen.getByText(/Recibo de Nómina - Maestro Pedro/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /imagen/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /whatsapp/i })).toBeInTheDocument();

    const dialogContent = screen.getByRole("dialog");
    expect(dialogContent).toHaveClass(
      "w-[calc(100vw-2rem)]",
      "max-w-[460px]",
      "max-h-[92vh]",
      "overflow-y-auto",
      "overflow-x-hidden"
    );
    expect(dialogContent).toHaveClass("p-2", "sm:p-3");
    expect(screen.getByText(/Recibo de Nómina - Maestro Pedro/i)).toHaveClass("break-words");
  });

  it("renders compact envelope columns in both print and modal paths", () => {
    const period: ParsedPayrollParams = {
      mode: "weekly",
      anchor: "2026-08-17",
      prevAnchor: "2026-08-10",
      nextAnchor: "2026-08-24",
      rangeLabel: "17 al 22 de agosto de 2026",
      isCurrentWeek: true,
      isCurrentPeriod: true,
      start: new Date("2026-08-17T06:00:00Z"),
      end: new Date("2026-08-23T06:00:00Z"),
    };

    render(
      <>
        <PayrollWorkerEnvelopeDocument worker={sampleWorkers[0]} period={period} />
        <PayrollWorkerEnvelopeModal worker={sampleWorkers[0]} period={period} open onOpenChange={vi.fn()} />
      </>
    );

    const tables = Array.from(document.querySelectorAll("table"));
    expect(tables).toHaveLength(2);
    for (const table of tables) {
      expect(within(table).getByText("Mano de Obra")).toBeInTheDocument();
      expect(within(table).getByText("%")).toBeInTheDocument();
      expect(within(table).getByText("A Cobrar")).toBeInTheDocument();
      expect(within(table).queryByText("Base")).not.toBeInTheDocument();
      expect(table.querySelectorAll("th")).toHaveLength(3);
    }
    const envelopes = Array.from(document.querySelectorAll("#payroll-worker-envelope-document"));
    expect(envelopes).toHaveLength(2);
    for (const envelope of envelopes) {
      expect(envelope).toHaveClass("print:w-[7.9cm]", "print:max-w-[7.9cm]", "print:mx-auto");
    }
  });

  describe("Inline Payroll Base Adjustment", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("renders adjust button and opens inline editing with live commission calculation", async () => {
      render(
        <PayrollWorkerDetail
          workers={sampleWorkers}
          selectedWorkerId="w-1"
        />
      );
      fireEvent.click(screen.getByRole("button", { name: "Ver conceptos" }));

      // Verify initial state shows cobro and commission
      expect(screen.getAllByText("Soldadura chasis").length).toBeGreaterThanOrEqual(1);
      const adjustBtns = screen.getAllByRole("button", { name: /ajustar base/i });
      expect(adjustBtns.length).toBeGreaterThanOrEqual(1);

      // Open inline editor (click mobile button)
      fireEvent.click(adjustBtns[0]);

      // Input should be pre-filled with current base: 100000 / 100 = 1000
      const inputs = screen.getAllByDisplayValue("1000");
      expect(inputs.length).toBeGreaterThanOrEqual(1);

      // Change base to 800 (80000 cents), 40% rate should calculate $320.00
      fireEvent.change(inputs[0], { target: { value: "800" } });
      expect(screen.getAllByText("$320.00").length).toBeGreaterThanOrEqual(1);

      // Cancel editing
      const cancelBtns = screen.getAllByRole("button", { name: /cancelar/i });
      fireEvent.click(cancelBtns[0]);

      // Editor should close
      expect(screen.queryByDisplayValue("800")).not.toBeInTheDocument();
    });

    it("saves custom base successfully", async () => {
      (updatePayrollItemBase as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
      });

      render(
        <PayrollWorkerDetail
          workers={sampleWorkers}
          selectedWorkerId="w-1"
        />
      );
      fireEvent.click(screen.getByRole("button", { name: "Ver conceptos" }));

      const adjustBtns = screen.getAllByRole("button", { name: /ajustar base/i });
      fireEvent.click(adjustBtns[0]);

      const inputs = screen.getAllByDisplayValue("1000");
      fireEvent.change(inputs[0], { target: { value: "750" } });

      const saveBtns = screen.getAllByRole("button", { name: /^guardar$/i });
      fireEvent.click(saveBtns[0]);

      await waitFor(() => {
        expect(updatePayrollItemBase).toHaveBeenCalledWith({
          itemId: "item-1",
          customPayrollBaseCents: 75000,
          customRatePercent: 40,
        });
      });
    });

    it("saves custom rate percent override successfully", async () => {
      (updatePayrollItemBase as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
      });

      render(
        <PayrollWorkerDetail
          workers={sampleWorkers}
          selectedWorkerId="w-1"
        />
      );
      fireEvent.click(screen.getByRole("button", { name: "Ver conceptos" }));

      const adjustBtns = screen.getAllByRole("button", { name: /ajustar base/i });
      fireEvent.click(adjustBtns[0]);

      // Change rate from 40% to 45% ($1,000 * 45% = $450.00)
      const rateInputs = screen.getAllByDisplayValue("40");
      fireEvent.change(rateInputs[0], { target: { value: "45" } });

      expect(screen.getAllByText("$450.00").length).toBeGreaterThanOrEqual(1);

      const saveBtns = screen.getAllByRole("button", { name: /^guardar$/i });
      fireEvent.click(saveBtns[0]);

      await waitFor(() => {
        expect(updatePayrollItemBase).toHaveBeenCalledWith({
          itemId: "item-1",
          customPayrollBaseCents: 100000,
          customRatePercent: 45,
        });
      });
    });

    it("displays error feedback via toast when saving fails", async () => {
      (updatePayrollItemBase as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "Base no permitida",
      });

      render(
        <PayrollWorkerDetail
          workers={sampleWorkers}
          selectedWorkerId="w-1"
        />
      );
      fireEvent.click(screen.getByRole("button", { name: "Ver conceptos" }));

      const adjustBtns = screen.getAllByRole("button", { name: /ajustar base/i });
      fireEvent.click(adjustBtns[0]);

      const inputs = screen.getAllByDisplayValue("1000");
      fireEvent.change(inputs[0], { target: { value: "500" } });

      const saveBtns = screen.getAllByRole("button", { name: /^guardar$/i });
      fireEvent.click(saveBtns[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Base no permitida");
      });
    });

    it("reactively clamps custom base input to client total cents and prevents higher values", async () => {
      render(
        <PayrollWorkerDetail
          workers={sampleWorkers}
          selectedWorkerId="w-1"
        />
      );
      fireEvent.click(screen.getByRole("button", { name: "Ver conceptos" }));

      const adjustBtns = screen.getAllByRole("button", { name: /ajustar base/i });
      fireEvent.click(adjustBtns[0]);

      // clientTotalCents is $1,000 (100000 cents). Max attribute should be 1000
      const inputs = screen.getAllByDisplayValue("1000");
      expect(inputs[0]).toHaveAttribute("max", "1000");

      // Typing $1,500 should be reactively clamped to $1,000
      fireEvent.change(inputs[0], { target: { value: "1500" } });
      expect(inputs[0]).toHaveValue(1000);

      // Typing negative should clamp to 0
      fireEvent.change(inputs[0], { target: { value: "-50" } });
      expect(inputs[0]).toHaveValue(0);
    });

    it("normalizes pasted custom base values to integer cents at the exact client-total boundary", async () => {
      (updatePayrollItemBase as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      render(<PayrollWorkerDetail workers={sampleWorkers} selectedWorkerId="w-1" />);
      fireEvent.click(screen.getByRole("button", { name: "Ver conceptos" }));
      fireEvent.click(screen.getAllByRole("button", { name: /ajustar base/i })[0]);

      const baseInputs = screen.getAllByDisplayValue("1000");
      fireEvent.change(baseInputs[0], { target: { value: "999.999" } });

      expect(baseInputs[0]).toHaveValue(1000);
      expect(screen.getAllByDisplayValue("1000")).toHaveLength(2);

      fireEvent.click(screen.getAllByRole("button", { name: /^guardar$/i })[0]);
      await waitFor(() => {
        expect(updatePayrollItemBase).toHaveBeenCalledWith({
          itemId: "item-1",
          customPayrollBaseCents: 100000,
          customRatePercent: 40,
        });
      });
    });

    it("clamps and rounds commission rates to the shared integer 1..100 contract", () => {
      render(<PayrollWorkerDetail workers={sampleWorkers} selectedWorkerId="w-1" />);
      fireEvent.click(screen.getByRole("button", { name: "Ver conceptos" }));
      fireEvent.click(screen.getAllByRole("button", { name: /ajustar base/i })[0]);

      const rateInput = screen.getAllByDisplayValue("40")[0];

      fireEvent.change(rateInput, { target: { value: "0" } });
      expect(rateInput).toHaveValue(1);
      expect(screen.getAllByDisplayValue("1")).toHaveLength(2);

      fireEvent.change(rateInput, { target: { value: "101" } });
      expect(rateInput).toHaveValue(100);
      expect(screen.getAllByDisplayValue("100")).toHaveLength(2);

      fireEvent.change(rateInput, { target: { value: "40.6" } });
      expect(rateInput).toHaveValue(41);
      expect(screen.getAllByDisplayValue("41")).toHaveLength(2);
    });

    it("allows resetting adjustment back to original base when item has custom base", async () => {
      (updatePayrollItemBase as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
      });

      const workerWithAdjustedItem: WorkerPayrollSummary[] = [
        {
          ...sampleWorkers[0],
          workOrders: [
            {
              ...sampleWorkers[0].workOrders[0],
              items: [
                {
                  ...sampleWorkers[0].workOrders[0].items[0],
                  clientTotalCents: 120000, // $1,200 charged to client
                  payrollBaseCents: 100000, // $1,000 custom base
                },
              ],
            },
          ],
        },
      ];

      render(
        <PayrollWorkerDetail
          workers={workerWithAdjustedItem}
          selectedWorkerId="w-1"
        />
      );
      fireEvent.click(screen.getByRole("button", { name: "Ver conceptos" }));

      // Verify adjusted badge/text is shown
      expect(screen.getAllByText(/\(Base: \$1,000\.00\)/i).length).toBeGreaterThanOrEqual(1);

      const adjustBtns = screen.getAllByRole("button", { name: /ajustar base/i });
      fireEvent.click(adjustBtns[0]);

      // Reset button should be visible
      const resetBtns = screen.getAllByRole("button", { name: /restablecer original|quitar/i });
      fireEvent.click(resetBtns[0]);

      await waitFor(() => {
        expect(updatePayrollItemBase).toHaveBeenCalledWith({
          itemId: "item-1",
          customPayrollBaseCents: null,
          customRatePercent: null,
        });
      });
    });
  });
});
