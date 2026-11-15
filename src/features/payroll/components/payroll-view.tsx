"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DialogDescription,
  DialogMobileBody,
  DialogMobileContent,
  DialogMobileFooter,
  DialogMobileHeader,
  DialogTitle,
  Sheet,
} from "@/components/ui/dialog";
import type { WeeklyPayrollReport, WorkerPayrollSummary } from "../domain";
import type { ParsedPayrollParams } from "../period";
import { PayrollPeriodNav } from "./payroll-period-nav";
import { PayrollMetrics } from "./payroll-metrics";
import { PayrollUnassignedCard } from "./payroll-worker-card";
import { PayrollOverviewTable } from "./payroll-overview-table";
import { FixedPayHelperTable } from "./fixed-pay-helper-table";
import { PayrollWorkerDetail } from "./payroll-worker-detail";
import { WeeklyPayrollSummary } from "./weekly-payroll-summary";
import { PayrollSigningSheetModal } from "./payroll-signing-sheet";
import { PayrollWorkerEnvelopeModal } from "./payroll-worker-envelope";

interface PayrollViewProps {
  report: WeeklyPayrollReport;
  period: ParsedPayrollParams;
  role?: string;
}

export function PayrollView({ report, period, role = "SUPER_ADMIN" }: PayrollViewProps) {
  const isAdmin = role === "ADMIN";
  // The id stays set while the sheet closes, so its content does not blank out during the exit.
  const [detailWorkerId, setDetailWorkerId] = React.useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isSigningSheetOpen, setIsSigningSheetOpen] = React.useState(false);
  const [envelopeWorker, setEnvelopeWorker] = React.useState<WorkerPayrollSummary | null>(null);
  const fixedPayHelpers = report.fixedPayHelpers ?? [];
  const hasPayrollEntries = report.workers.length > 0 || fixedPayHelpers.length > 0;
  const detailWorker = report.workers.find((worker) => worker.workerId === detailWorkerId) ?? null;

  return (
    <div className="min-w-0 max-w-full space-y-4 sm:space-y-6">
      <PayrollPeriodNav
        mode={period.mode}
        anchor={period.anchor}
        isCurrentWeek={period.isCurrentWeek}
        hasData={hasPayrollEntries}
        weekStatus={report.weekStatus}
        onOpenSigningSheet={() => setIsSigningSheetOpen(true)}
        role={role}
      />

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

      {period.mode === "weekly" && hasPayrollEntries && <WeeklyPayrollSummary report={report} />}

      {hasPayrollEntries ? (
        <div className="min-w-0 max-w-full space-y-5">
          {report.workers.length > 0 && (
            <PayrollOverviewTable
              workers={report.workers}
              onSelectWorker={(workerId) => {
                setDetailWorkerId(workerId);
                setIsDetailOpen(true);
              }}
            />
          )}

          <FixedPayHelperTable helpers={fixedPayHelpers} weekStart={period.anchor} readOnly={isAdmin} />
        </div>
      ) : (
        <Card className="p-8 sm:p-12 text-center">
          <CardContent className="space-y-2 p-0">
            <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[var(--color-bg-soft)] flex items-center justify-center text-[var(--color-text-muted)] mb-3">
              <Icon name="inbox" className="h-5 w-5 sm:h-6 sm:w-6" />
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

      {/* Sheet: detalle de mano de obra del trabajador */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogMobileContent variant="sheet">
          {detailWorker ? (
            <>
              <DialogMobileHeader>
                <DialogTitle>{detailWorker.displayName}</DialogTitle>
                <DialogDescription>
                  Mano de obra · {detailWorker.completedOrderCount}{" "}
                  {detailWorker.completedOrderCount === 1 ? "orden" : "órdenes"}
                </DialogDescription>
              </DialogMobileHeader>
              <DialogMobileBody>
                <PayrollWorkerDetail
                  workers={report.workers}
                  selectedWorkerId={detailWorker.workerId}
                  readOnly={isAdmin}
                />
              </DialogMobileBody>
              {!isAdmin ? (
                <DialogMobileFooter>
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={() => {
                      setIsDetailOpen(false);
                      setEnvelopeWorker(detailWorker);
                    }}
                    className="gap-1.5"
                  >
                    <Icon name="mail" className="h-4 w-4" aria-hidden="true" />
                    Recibo de Nómina
                  </Button>
                </DialogMobileFooter>
              ) : null}
            </>
          ) : null}
        </DialogMobileContent>
      </Sheet>

      {/* Modal: Hoja de Firmas Confidencial */}
      {!isAdmin && (
        <PayrollSigningSheetModal
          report={report}
          period={period}
          open={isSigningSheetOpen}
          onOpenChange={setIsSigningSheetOpen}
        />
      )}

      {/* Modal: Recibo de Nómina Individual */}
      {!isAdmin && (
        <PayrollWorkerEnvelopeModal
          worker={envelopeWorker}
          period={period}
          open={envelopeWorker !== null}
          onOpenChange={(open) => {
            if (!open) setEnvelopeWorker(null);
          }}
        />
      )}
    </div>
  );
}
