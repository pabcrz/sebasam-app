"use client";

import { UserCheck, ChevronRight } from "lucide-react";
import { formatCents } from "@/features/quotes/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { WorkerPayrollSummary } from "../domain";

interface PayrollOverviewTableProps {
  workers: WorkerPayrollSummary[];
  selectedWorkerId: string | null;
  onSelectWorker: (workerId: string) => void;
}

export function PayrollOverviewTable({
  workers,
  selectedWorkerId,
  onSelectWorker,
}: PayrollOverviewTableProps) {
  if (workers.length === 0) return null;

  return (
    <Card data-testid="payroll-overview-table" className="min-w-0 max-w-full">
      <CardHeader className="pb-2">
        <div className="flex min-w-0 items-center justify-between">
          <div className="min-w-0">
            <CardTitle as="h2" className="text-base sm:text-lg">
              Resumen General de Nómina
            </CardTitle>
            <CardDescription className="text-xs">
              Consolidado por trabajador para el período seleccionado. Selecciona uno para ver su desglose de órdenes.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="min-w-0 max-w-full p-0 sm:p-4">
        {/* Mobile Cards for Overview */}
        <div
          data-testid="payroll-overview-mobile-cards"
          className="sm:hidden divide-y divide-[var(--color-border-light)]/60"
        >
          {workers.map((worker) => {
            const isSelected = worker.workerId === selectedWorkerId;
            return (
              <div
                key={worker.workerId}
                onClick={() => onSelectWorker(worker.workerId)}
                className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                  isSelected ? "bg-[var(--color-primary)]/5" : "hover:bg-[var(--color-bg-soft)]/50"
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                    <div className="flex min-w-0 max-w-full flex-col items-start">
                      <span className="max-w-full break-words font-semibold text-xs text-[var(--color-text-main)]">
                        {worker.displayName}
                      </span>
                      <Badge variant="default" className="text-[9px] py-0 px-1 font-normal">
                        {worker.workerKind === "SPECIAL" ? "Especial" : "Maestro"}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {worker.completedOrderCount} {worker.completedOrderCount === 1 ? "orden" : "órdenes"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                      {formatCents(worker.totalCommissionCents)}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)]" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table for Overview */}
        <div className="hidden min-w-0 max-w-full sm:block">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[var(--color-border-light)] hover:bg-transparent">
                <TableHead className="text-xs font-medium">Trabajador</TableHead>
                <TableHead className="text-center text-xs font-medium">Órdenes</TableHead>
                <TableHead className="text-right text-xs font-medium">Mano de Obra Cobrada</TableHead>
                <TableHead className="text-right text-xs font-medium">Total a Liquidar</TableHead>
                <TableHead className="text-right text-xs font-medium w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map((worker) => {
                const isSelected = worker.workerId === selectedWorkerId;
                return (
                  <TableRow
                    key={worker.workerId}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? "bg-[var(--color-primary)]/10 font-medium" : "hover:bg-[var(--color-bg-soft)]/60"
                    }`}
                    onClick={() => onSelectWorker(worker.workerId)}
                  >
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                          <UserCheck className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-semibold text-xs text-[var(--color-text-main)]">
                          {worker.displayName}
                        </span>
                        <Badge variant="default" className="text-[10px] py-0 px-1.5 font-normal">
                          {worker.workerKind === "SPECIAL" ? "Asignación Especial" : "Maestro"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-center text-xs text-[var(--color-text-muted)]">
                      {worker.completedOrderCount}
                    </TableCell>
                    <TableCell className="py-2.5 text-right text-xs text-[var(--color-text-muted)]">
                      {formatCents(worker.totalClientLaborCents)}
                    </TableCell>
                    <TableCell className="py-2.5 text-right text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCents(worker.totalCommissionCents)}
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      <Button
                        variant={isSelected ? "primary" : "outline"}
                        size="sm"
                        className="h-7 text-xs px-2.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectWorker(worker.workerId);
                        }}
                      >
                        {isSelected ? "Viendo" : "Ver detalle"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
