"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
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

interface PayrollWorkerCardProps {
  worker: WorkerPayrollSummary;
}

export function PayrollWorkerCard({ worker }: PayrollWorkerCardProps) {
  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <Card className="overflow-hidden p-0">
      {/* Header Summary */}
      <div className="p-3 sm:p-4 flex items-center justify-between gap-3 bg-[var(--color-bg-soft)]/60 border-b border-[var(--color-border-light)]">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <Icon name="user-check" className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-semibold text-[var(--color-text-main)] truncate">
                {worker.displayName}
              </h3>
              <Badge variant="default" className="text-[10px] sm:text-xs py-0 px-2 font-normal">
                {worker.workerKind === "SPECIAL" ? "Asignación Especial" : "Maestro"}
              </Badge>
            </div>
            <p className="text-[11px] sm:text-xs text-[var(--color-text-muted)]">
              {worker.completedOrderCount} {worker.completedOrderCount === 1 ? "orden concluida" : "órdenes concluidas"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="text-right">
            <span className="block text-[10px] sm:text-xs text-[var(--color-text-muted)]">
              Total a Liquidar
            </span>
            <span className="text-base sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCents(worker.totalCommissionCents)}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label={isOpen ? "Ocultar desglose" : "Ver desglose"}
            className="h-8 w-8 p-0 text-[var(--color-text-muted)]"
          >
            {isOpen ? <Icon name="chevron-up" className="h-4 w-4" /> : <Icon name="chevron-down" className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Breakdown per Work Order - Seamless list with distinct separation lines */}
      {isOpen && (
        <CardContent className="p-0 divide-y-2 divide-[var(--color-border-light)]/80">
          {worker.workOrders.map((order) => (
            <WorkOrderDetailRow key={order.workOrderId} order={order} />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

function WorkOrderDetailRow({ order }: { order: WorkOrderPayrollDetail }) {
  return (
    <div className="p-3.5 sm:p-4 space-y-2.5 bg-[var(--color-surface)]">
      {/* Order top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-1.5 border-b border-[var(--color-border-light)]/40">
        <div>
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

        <div className="text-left sm:text-right flex sm:block items-center justify-between pt-1 sm:pt-0">
          <span className="text-[11px] sm:text-xs text-[var(--color-text-muted)] mr-1">Mano de obra:</span>
          <span className="text-xs sm:text-sm font-bold text-[var(--color-text-main)]">
            {formatCents(order.totalCommissionCents)}
          </span>
        </div>
      </div>

      {/* Mobile Stacked Items (< sm) */}
      <div className="sm:hidden space-y-1.5 pt-0.5">
        {order.items.map((item) => {
          const hasAdjustment = item.payrollBaseCents !== item.clientTotalCents;
          return (
            <div
              key={`m-${item.id}`}
              className="rounded-[var(--radius-sm)] bg-[var(--color-bg-soft)]/50 p-2 text-xs space-y-1"
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
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[var(--color-border-light)]/40 hover:bg-transparent">
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
  );
}

export function PayrollUnassignedCard({ orders }: { orders: WorkOrderPayrollDetail[] }) {
  if (orders.length === 0) return null;

  return (
    <Card className="bg-amber-500/5 border-amber-500/30 p-3.5 sm:p-4 space-y-2.5">
      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
        <Icon name="shield-alert" className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
        <h3 className="font-semibold text-xs sm:text-sm">
          Órdenes completadas sin maestro asignado ({orders.length})
        </h3>
      </div>
      <p className="text-[11px] sm:text-xs text-[var(--color-text-muted)]">
        Las siguientes órdenes fueron cerradas pero no tienen un Maestro o Asignación especial vinculado. Asígnalas en Trabajos para que se reflejen en la nómina correspondiente.
      </p>

      <div className="divide-y divide-[var(--color-border-light)]/40 rounded-[var(--radius-sm)] border border-[var(--color-border-light)]/60 bg-[var(--color-surface)] overflow-hidden">
        {orders.map((order) => (
          <div key={order.workOrderId} className="p-2.5 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold">{order.workTitle || "Trabajo"}</span> • {order.clientName || order.vehicleSummary}
                <span className="ml-1 text-[var(--color-text-muted)]">(Folio {order.workOrderNumber} · {order.quoteNumber})</span>
            </div>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              Mano de obra: {formatCents(order.totalCommissionCents)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
