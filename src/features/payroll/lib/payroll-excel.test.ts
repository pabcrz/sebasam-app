import { describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";
import { QuoteItemType } from "@prisma/client";
import { exportPayrollToExcel } from "./payroll-excel";
import type { WeeklyPayrollReport } from "../domain";
import type { ParsedPayrollParams } from "../period";

vi.mock("xlsx", async () => {
  const actual = await vi.importActual<typeof import("xlsx")>("xlsx");
  return {
    ...actual,
    writeFile: vi.fn(),
  };
});

describe("exportPayrollToExcel", () => {
  it("creates a workbook with summary and detail sheets and writes file", () => {
    const sampleReport: WeeklyPayrollReport = {
      mode: "weekly",
      startDate: new Date("2026-08-17T06:00:00.000Z"),
      endDate: new Date("2026-08-23T06:00:00.000Z"),
      rangeLabel: "17 al 22 de agosto de 2026",
      isCurrentWeek: true,
      totalWorkers: 1,
      totalCompletedOrders: 1,
      totalClientLaborCents: 100000,
      totalPayrollBaseCents: 100000,
      totalCommissionCents: 50000,
      workers: [
        {
          workerId: "w-1",
          displayName: "Maestro Pedro",
          workerKind: "MASTER",
          completedOrderCount: 1,
          totalClientLaborCents: 100000,
          totalPayrollBaseCents: 100000,
          totalCommissionCents: 50000,
          workOrders: [
            {
              workOrderId: "wo-1",
              workOrderNumber: "OT-101",
              quoteId: "q-1",
              quoteNumber: "COT-101",
              clientName: "Empresa ABC",
              vehicleSummary: "Kenworth T680",
              completedAt: new Date("2026-08-18T15:00:00Z"),
              isSpecial: false,
              masterId: "w-1",
              masterName: "Maestro Pedro",
              helperNames: [],
              items: [
                {
                  id: "item-1",
                  type: QuoteItemType.LABOR,
                  description: "Cambio de bujes",
                  quantity: 1,
                  unitPriceCents: 100000,
                  clientTotalCents: 100000,
                  payrollBaseCents: 100000,
                  category: "GENERAL",
                  ratePercent: 50,
                  commissionCents: 50000,
                },
              ],
              totalClientLaborCents: 100000,
              totalPayrollBaseCents: 100000,
              totalCommissionCents: 50000,
            },
          ],
        },
      ],
      unassignedOrders: [],
    };

    const samplePeriod: ParsedPayrollParams = {
      mode: "weekly",
      anchor: "2026-08-17",
      prevAnchor: "2026-08-10",
      nextAnchor: "2026-08-24",
      rangeLabel: "17 al 22 de agosto de 2026",
      isCurrentWeek: true,
      isCurrentPeriod: true,
      start: new Date("2026-08-17T06:00:00.000Z"),
      end: new Date("2026-08-23T06:00:00.000Z"),
    };

    exportPayrollToExcel(sampleReport, samplePeriod);

    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.anything(),
      "Nomina_SEBASAM_Semanal_2026-08-17.xlsx"
    );
  });
});
