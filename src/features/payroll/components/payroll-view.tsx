"use client";

import * as React from "react";
import { Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { WeeklyPayrollReport, WorkerPayrollSummary } from "../domain";
import type { ParsedPayrollParams } from "../period";
import { PayrollPeriodNav } from "./payroll-period-nav";
import { PayrollMetrics } from "./payroll-metrics";
import { PayrollUnassignedCard } from "./payroll-worker-card";
import { FixedPayHelperTable } from "./fixed-pay-helper-table";
import { PayrollSigningSheetModal } from "./payroll-signing-sheet";
import { PayrollWorkerEnvelopeModal } from "./payroll-worker-envelope";
import { PayrollJobList } from "./payroll-job-list";

interface PayrollViewProps {
  report: WeeklyPayrollReport;
  period: ParsedPayrollParams;
}

export function PayrollView({ report, period }: PayrollViewProps) {
  const [isSigningSheetOpen, setIsSigningSheetOpen] = React.useState(false);
  const [envelopeWorker, setEnvelopeWorker] = React.useState<WorkerPayrollSummary | null>(null);
  const fixedPayHelpers = report.fixedPayHelpers ?? [];
  const envelopeWorkers = report.workers.filter((worker) => worker.workOrders.length > 0);
  const hasPayrollEntries = envelopeWorkers.length > 0 || fixedPayHelpers.length > 0;

  // Derive active worker ID during render without cascading useEffect
  const handleOpenGeneralPrint = () => {
    window.location.href = `/admin/nomina/imprimir/general?mode=${period.mode}&anchor=${period.anchor}`;
  };

  return (
    <div className="min-w-0 max-w-full space-y-4 sm:space-y-6">
      {/* Period Navigation */}
      <PayrollPeriodNav
        mode={period.mode}
        rangeLabel={period.rangeLabel}
        anchor={period.anchor}
        prevAnchor={period.prevAnchor}
        nextAnchor={period.nextAnchor}
        isCurrentPeriod={period.isCurrentPeriod}
        isCurrentWeek={period.isCurrentWeek}
        hasData={hasPayrollEntries}
        onOpenGeneralPrint={handleOpenGeneralPrint}
        onOpenSigningSheet={() => setIsSigningSheetOpen(true)}
      />

      {/* Metrics Overview */}
        <PayrollMetrics
          totalCommissionCents={report.totalCommissionCents}
          totalPayableCents={report.totalPayableCents}
        totalClientLaborCents={report.totalClientLaborCents}
        totalPayrollBaseCents={report.totalPayrollBaseCents}
        totalCompletedOrders={report.totalCompletedOrders}
        totalWorkers={report.totalWorkers}
      />

      {/* Unassigned orders alert if any */}
      <PayrollUnassignedCard orders={report.unassignedOrders} />

      {/* Content: Summary Table + Focused Worker Detail */}
      {hasPayrollEntries ? (
        <div className="min-w-0 max-w-full space-y-5">
          <PayrollJobList report={report} />

          <FixedPayHelperTable helpers={fixedPayHelpers} weekStart={period.anchor} />

          <div className="flex flex-wrap gap-2" aria-label="Sobres de pago">
            {envelopeWorkers.map((worker) => (
              <Button key={worker.workerId} type="button" variant="outline" size="sm" onClick={() => setEnvelopeWorker(worker)}>
                Sobre de Pago · {worker.displayName}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <Card className="p-8 sm:p-12 text-center">
          <CardContent className="space-y-2 p-0">
            <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[var(--color-bg-soft)] flex items-center justify-center text-[var(--color-text-muted)] mb-3">
              <Inbox className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <h3 className="text-sm sm:text-base font-medium text-[var(--color-text-main)]">
              No hay órdenes completadas en este período
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] max-w-sm mx-auto">
              Cuando se completen órdenes de trabajo en este período, aparecerán aquí agrupadas por maestro con su cálculo de comisión.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal: Hoja de Firmas Confidencial */}
      <PayrollSigningSheetModal
        report={report}
        period={period}
        open={isSigningSheetOpen}
        onOpenChange={setIsSigningSheetOpen}
      />

      {/* Modal: Sobre de Pago Individual */}
      <PayrollWorkerEnvelopeModal
        worker={envelopeWorker}
        period={period}
        open={envelopeWorker !== null}
        onOpenChange={(open) => {
          if (!open) setEnvelopeWorker(null);
        }}
      />
    </div>
  );
}
