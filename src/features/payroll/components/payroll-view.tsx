"use client";

import * as React from "react";
import { FileSpreadsheet, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { WeeklyPayrollReport } from "../domain";
import type { ParsedPayrollParams } from "../period";
import { PayrollPeriodNav } from "./payroll-period-nav";
import { PayrollMetrics } from "./payroll-metrics";
import { PayrollUnassignedCard } from "./payroll-worker-card";
import { PayrollOverviewTable } from "./payroll-overview-table";
import { PayrollWorkerDetail } from "./payroll-worker-detail";

interface PayrollViewProps {
  report: WeeklyPayrollReport;
  period: ParsedPayrollParams;
}

export function PayrollView({ report, period }: PayrollViewProps) {
  const [selectedWorkerId, setSelectedWorkerId] = React.useState<string | null>(null);

  // Derive active worker ID during render without cascading useEffect
  const activeWorkerId =
    selectedWorkerId && report.workers.some((w) => w.workerId === selectedWorkerId)
      ? selectedWorkerId
      : (report.workers[0]?.workerId ?? "");

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top title and Period Selector */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 sm:h-6 sm:w-6 text-[var(--color-primary)] shrink-0" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-main)]">
            Nómina Semanal
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">
          Cálculo y liquidación de comisiones de mano de obra por órdenes completadas.
        </p>
      </div>

      {/* Period Navigation */}
      <PayrollPeriodNav
        rangeLabel={period.rangeLabel}
        anchor={period.anchor}
        prevAnchor={period.prevAnchor}
        nextAnchor={period.nextAnchor}
        isCurrentWeek={period.isCurrentWeek}
      />

      {/* Metrics Overview */}
      <PayrollMetrics
        totalCommissionCents={report.totalCommissionCents}
        totalClientLaborCents={report.totalClientLaborCents}
        totalPayrollBaseCents={report.totalPayrollBaseCents}
        totalCompletedOrders={report.totalCompletedOrders}
        totalWorkers={report.totalWorkers}
      />

      {/* Unassigned orders alert if any */}
      <PayrollUnassignedCard orders={report.unassignedOrders} />

      {/* Content: Summary Table + Focused Worker Detail Tabs */}
      {report.workers.length > 0 ? (
        <div className="space-y-6">
          {/* Level 1: General Executive Overview Table */}
          <PayrollOverviewTable
            workers={report.workers}
            selectedWorkerId={activeWorkerId}
            onSelectWorker={setSelectedWorkerId}
          />

          {/* Level 2: Specific Detail per Worker */}
          <div className="space-y-3">
            <h2 className="text-sm sm:text-base font-semibold text-[var(--color-text-main)]">
              Desglose Específico por Trabajador
            </h2>
            <PayrollWorkerDetail
              workers={report.workers}
              selectedWorkerId={activeWorkerId}
              onSelectWorker={setSelectedWorkerId}
            />
          </div>
        </div>
      ) : (
        <Card className="p-8 sm:p-12 text-center">
          <CardContent className="space-y-2 p-0">
            <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[var(--color-bg-soft)] flex items-center justify-center text-[var(--color-text-muted)] mb-3">
              <Inbox className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <h3 className="text-sm sm:text-base font-medium text-[var(--color-text-main)]">
              No hay órdenes completadas en esta semana
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] max-w-sm mx-auto">
              Cuando se completen órdenes de trabajo en este período semanal, aparecerán aquí agrupadas por maestro con su cálculo de comisión.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
