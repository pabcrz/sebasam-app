import * as XLSX from "xlsx";
import type { WeeklyPayrollReport } from "../domain";
import type { ParsedPayrollParams } from "../period";

export function exportPayrollToExcel(report: WeeklyPayrollReport, period: ParsedPayrollParams) {
  const wb = XLSX.utils.book_new();

  // --- SHEET 1: Resumen de Nómina ---
  const summaryAoa: (string | number)[][] = [
    [`SEBASAM - Reporte de Nómina ${period.mode === "monthly" ? "Mensual" : "Semanal"}`],
    [`Período: ${period.rangeLabel}`],
    [`Fecha de descarga: ${new Date().toLocaleDateString("es-MX")}`],
    [],
    [
      "No.",
      "Trabajador / Maestro",
      "Tipo",
      "Órdenes Terminadas",
      "Base de Pago ($)",
      "Total a Liquidar ($)",
    ],
  ];

  report.workers.forEach((worker, index) => {
    summaryAoa.push([
      index + 1,
      worker.displayName,
      worker.workerKind === "SPECIAL" ? "Especial / Taller" : "Maestro",
      worker.completedOrderCount,
      worker.totalPayrollBaseCents / 100,
      worker.totalCommissionCents / 100,
    ]);
  });

  const fixedPayHelpers = report.fixedPayHelpers ?? [];
  fixedPayHelpers.forEach((helper, index) => {
    summaryAoa.push([
      report.workers.length + index + 1,
      helper.displayName,
      "Ayudante general",
      0,
      helper.weeklyRateCents / 100,
      helper.totalPayableCents / 100,
    ]);
  });

  // Totals Row
  summaryAoa.push([
    "",
    "TOTAL GENERAL",
    "",
    report.totalCompletedOrders,
    (report.totalPayrollBaseCents + (report.totalFixedWeeklyPayCents ?? 0)) / 100,
    (report.totalPayableCents ?? report.totalCommissionCents) / 100,
  ]);

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryAoa);

  // Set column widths for summary sheet
  summaryWs["!cols"] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 18 },
    { wch: 20 },
    { wch: 24 },
    { wch: 24 },
  ];

  XLSX.utils.book_append_sheet(wb, summaryWs, "Resumen Nómina");

  // --- SHEET 2: Detalle de Trabajos ---
  const detailAoa: (string | number)[][] = [
    [
      "No. OT",
      "Cotización",
      "Fecha Término",
      "Trabajador Asignado",
      "Cliente",
      "Vehículo",
      "Concepto Mano de Obra",
      "Categoría",
      "Base Taller ($)",
      "% Pago",
      "A Liquidar ($)",
    ],
  ];

  for (const worker of report.workers) {
    for (const order of worker.workOrders) {
      const formattedDate = order.completedAt
        ? new Date(order.completedAt).toLocaleDateString("es-MX")
        : "-";

      if (order.isAdvance) {
        detailAoa.push([
          order.workOrderNumber,
          order.quoteNumber,
          "-",
          worker.displayName,
          order.clientName,
          order.vehicleSummary,
          `[Avance] ${order.conceptDescription || "Mano de obra"}`,
          "Avance",
          (order.advanceBaseCents ?? order.totalPayrollBaseCents) / 100,
          `${order.commissionRatePercent ?? 50}%`,
          order.totalCommissionCents / 100,
        ]);
      } else {
        for (const item of order.items) {
          const desc =
            order.previousAdvancesBaseCents && order.previousAdvancesBaseCents > 0
              ? `${item.description} (Liq. final)`
              : item.description;
          const baseCents = item.remainingBaseCents ?? item.payrollBaseCents;
          detailAoa.push([
            order.workOrderNumber,
            order.quoteNumber,
            formattedDate,
            worker.displayName,
            order.clientName,
            order.vehicleSummary,
            desc,
            item.category === "WELDING" ? "Soldadura" : "General",
            baseCents / 100,
            `${item.ratePercent}%`,
            item.commissionCents / 100,
          ]);
        }
      }
    }
  }

  const detailWs = XLSX.utils.aoa_to_sheet(detailAoa);

  // Set column widths for detail sheet
  detailWs["!cols"] = [
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 24 },
    { wch: 24 },
    { wch: 22 },
    { wch: 36 },
    { wch: 14 },
    { wch: 16 },
    { wch: 10 },
    { wch: 16 },
  ];

  XLSX.utils.book_append_sheet(wb, detailWs, "Detalle Trabajos");

  // Format file name
  const modeLabel = period.mode === "monthly" ? "Mensual" : "Semanal";
  const safeAnchor = period.anchor.replace(/[^a-zA-Z0-9_-]/g, "-");
  const fileName = `Nomina_SEBASAM_${modeLabel}_${safeAnchor}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
