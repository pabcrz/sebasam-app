"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, UserCheck } from "lucide-react";
import { formatCents } from "@/features/quotes/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { WorkerPayrollSummary, WorkOrderPayrollDetail } from "../domain";

interface PayrollWorkerDetailProps {
  workers: WorkerPayrollSummary[];
  selectedWorkerId: string;
  onSelectWorker: (workerId: string) => void;
}

export function PayrollWorkerDetail({
  workers,
  selectedWorkerId,
  onSelectWorker,
}: PayrollWorkerDetailProps) {
  const activeWorker = workers.find((w) => w.workerId === selectedWorkerId) || workers[0];

  if (!activeWorker) return null;

  return (
    <div className="space-y-4">
      {/* Worker Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {workers.map((w) => {
          const isSelected = w.workerId === activeWorker.workerId;
          return (
            <button
              key={w.workerId}
              type="button"
              onClick={() => onSelectWorker(w.workerId)}
              className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-xs font-medium border transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm"
                  : "bg-[var(--color-surface)] text-[var(--color-text-main)] border-[var(--color-border-light)] hover:bg-[var(--color-bg-soft)]"
              }`}
            >
              <span>{w.displayName}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isSelected ? "bg-white/20 text-white font-semibold" : "bg-[var(--color-bg-soft)] text-emerald-600 dark:text-emerald-400 font-bold"
                }`}
              >
                {formatCents(w.totalCommissionCents)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Worker Work Orders */}
      <Card className="overflow-hidden p-0">
        {/* Worker Summary Banner */}
        <div className="p-3 sm:p-4 flex items-center justify-between gap-3 bg-[var(--color-bg-soft)]/70 border-b border-[var(--color-border-light)]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <UserCheck className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-semibold text-[var(--color-text-main)] truncate">
                  {activeWorker.displayName}
                </h3>
                <Badge variant="default" className="text-[10px] sm:text-xs py-0 px-2 font-normal">
                  {activeWorker.workerKind === "SPECIAL" ? "Asignación Especial" : "Maestro"}
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-[var(--color-text-muted)]">
                {activeWorker.completedOrderCount} {activeWorker.completedOrderCount === 1 ? "orden concluida" : "órdenes concluidas"}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="block text-[10px] sm:text-xs text-[var(--color-text-muted)]">
              Total a Liquidar
            </span>
            <span className="text-base sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCents(activeWorker.totalCommissionCents)}
            </span>
          </div>
        </div>

        {/* Accordion List of Work Orders */}
        <CardContent className="p-0 divide-y-2 divide-[var(--color-border-light)]/80">
          {activeWorker.workOrders.map((order, idx) => (
            <PayrollOrderAccordionRow key={order.workOrderId} order={order} defaultOpen={idx === 0} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function PayrollOrderAccordionRow({
  order,
  defaultOpen = false,
}: {
  order: WorkOrderPayrollDetail;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="bg-[var(--color-surface)]">
      {/* Clickable Order Summary Header */}
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-3 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-[var(--color-bg-soft)]/50 transition-colors"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="font-semibold text-xs sm:text-sm text-[var(--color-text-main)]">
              {order.workOrderNumber}
            </span>
            <span className="text-[11px] sm:text-xs text-[var(--color-text-muted)]">
              ({order.quoteNumber})
            </span>
            <span className="text-xs sm:text-sm font-medium text-[var(--color-text-main)]">
              • {order.clientName}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-[var(--color-text-muted)] mt-0.5">
            {order.vehicleSummary}
            {order.helperNames.length > 0 && ` • Ayudantes: ${order.helperNames.join(", ")}`}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-[11px] sm:text-xs text-[var(--color-text-muted)] block sm:inline mr-1">
              Mano de obra:
            </span>
            <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {formatCents(order.totalCommissionCents)}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-[var(--color-text-muted)]"
            aria-label={isOpen ? "Ocultar conceptos" : "Ver conceptos"}
          >
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Expanded Concepts Detail */}
      {isOpen && (
        <div className="px-3 pb-3 sm:px-4 sm:pb-4 pt-1 space-y-2 border-t border-[var(--color-border-light)]/40 bg-[var(--color-bg-soft)]/20">
          {/* Mobile Items (< sm) */}
          <div className="sm:hidden space-y-1.5 pt-1">
            {order.items.map((item) => {
              const hasAdjustment = item.payrollBaseCents !== item.clientTotalCents;
              return (
                <div
                  key={`m-${item.id}`}
                  className="rounded-[var(--radius-sm)] bg-[var(--color-surface)] border border-[var(--color-border-light)]/60 p-2 text-xs space-y-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-[var(--color-text-main)] leading-snug">
                      {item.description}
                    </span>
                    {item.category === "WELDING" ? (
                      <Badge variant="warning" className="text-[10px] py-0 px-1.5 shrink-0">
                        Soldadura
                      </Badge>
                    ) : (
                      <Badge variant="default" className="text-[10px] py-0 px-1.5 shrink-0">
                        General
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)] pt-1 border-t border-[var(--color-border-light)]/40">
                    <div>
                      <span>Cobro: {formatCents(item.clientTotalCents)}</span>
                      {hasAdjustment && (
                        <span className="ml-1 text-amber-600 dark:text-amber-400 font-medium">
                          (Base: {formatCents(item.payrollBaseCents)})
                        </span>
                      )}
                      <span className="ml-1.5">• {item.ratePercent}%</span>
                    </div>
                    <div className="font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                      {formatCents(item.commissionCents)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table (>= sm) */}
          <div className="hidden sm:block rounded-[var(--radius-sm)] border border-[var(--color-border-light)]/60 bg-[var(--color-surface)] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[var(--color-border-light)]/40 bg-[var(--color-bg-soft)]/50 hover:bg-transparent">
                  <TableHead className="h-7 px-2 py-1 text-xs font-medium">Concepto</TableHead>
                  <TableHead className="h-7 px-2 py-1 text-right text-xs font-medium">Cobro Cliente</TableHead>
                  <TableHead className="h-7 px-2 py-1 text-right text-xs font-medium">Base Nómina</TableHead>
                  <TableHead className="h-7 px-2 py-1 text-center text-xs font-medium">% Pago</TableHead>
                  <TableHead className="h-7 px-2 py-1 text-right text-xs font-medium">A Liquidar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => {
                  const hasAdjustment = item.payrollBaseCents !== item.clientTotalCents;
                  return (
                    <TableRow key={`d-${item.id}`} className="text-xs hover:bg-[var(--color-bg-soft)]/50">
                      <TableCell className="px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <span>{item.description}</span>
                          {item.category === "WELDING" ? (
                            <Badge variant="warning" className="text-[10px] py-0 px-1.5">
                              Soldadura / Soplete
                            </Badge>
                          ) : (
                            <Badge variant="default" className="text-[10px] py-0 px-1.5">
                              General
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-right text-[var(--color-text-muted)]">
                        {formatCents(item.clientTotalCents)}
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-right">
                        {hasAdjustment ? (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            {formatCents(item.payrollBaseCents)}
                          </span>
                        ) : (
                          formatCents(item.payrollBaseCents)
                        )}
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-center font-medium">
                        {item.ratePercent}%
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCents(item.commissionCents)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
