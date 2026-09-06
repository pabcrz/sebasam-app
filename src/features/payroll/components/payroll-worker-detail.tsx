"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Mail } from "lucide-react";
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
import toast from "react-hot-toast";
import {
  computeCommissionCents,
  type WorkerPayrollSummary,
  type WorkOrderPayrollDetail,
} from "../domain";
import { updatePayrollItemBase } from "../actions";

interface PayrollWorkerDetailProps {
  workers: WorkerPayrollSummary[];
  selectedWorkerId: string;
  onOpenEnvelope?: (worker: WorkerPayrollSummary) => void;
}

export function PayrollWorkerDetail({
  workers,
  selectedWorkerId,
  onOpenEnvelope,
}: PayrollWorkerDetailProps) {
  const activeWorker = workers.find((w) => w.workerId === selectedWorkerId) || workers[0];

  if (!activeWorker) return null;

  return (
    <div className="space-y-2.5">
      {/* Title with Active Worker Context and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-sm sm:text-base font-semibold text-[var(--color-text-main)]">
          Mano de obra - {activeWorker.displayName}
        </h2>
        <div className="flex items-center gap-3">
          {onOpenEnvelope && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenEnvelope(activeWorker)}
              className="h-7 text-xs px-2.5 gap-1.5"
            >
              <Mail className="h-3.5 w-3.5 text-[var(--color-primary)]" />
              Sobre de Pago
            </Button>
          )}
          <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
            Total: {formatCents(activeWorker.totalCommissionCents)}
          </span>
        </div>
      </div>

      {/* Accordion List of Work Orders */}
      <Card className="overflow-hidden p-0">
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
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState<string>("");
  const [editRateValue, setEditRateValue] = React.useState<string>("");
  const [isPending, startTransition] = React.useTransition();

  const startEditing = (itemId: string, currentBaseCents: number, currentRatePercent: number) => {
    setEditingItemId(itemId);
    setEditValue(String(currentBaseCents / 100));
    setEditRateValue(String(currentRatePercent));
  };

  const cancelEditing = () => {
    setEditingItemId(null);
    setEditValue("");
    setEditRateValue("");
  };

  const handleSave = (itemId: string, clientTotalCents: number) => {
    const trimmedBase = editValue.trim();
    if (trimmedBase === "") {
      toast.error("Ingresa un importe para la base o pulsa cancelar.");
      return;
    }
    const numericBase = Number(trimmedBase);
    if (isNaN(numericBase) || numericBase < 0) {
      toast.error("Ingresa un importe válido mayor o igual a 0.");
      return;
    }
    const cents = Math.round(numericBase * 100);

    if (cents > clientTotalCents) {
      toast.error("La base de nómina no puede ser mayor al cobro del cliente.");
      return;
    }

    let ratePercentToSave: number | null = null;
    const trimmedRate = editRateValue.trim();
    if (trimmedRate !== "") {
      const numericRate = Number(trimmedRate);
      if (!Number.isInteger(numericRate) || numericRate < 1 || numericRate > 100) {
        toast.error("El porcentaje debe ser un número entero entre 1% y 100%.");
        return;
      }
      ratePercentToSave = numericRate;
    }

    startTransition(async () => {
      try {
        const res = await updatePayrollItemBase({
          itemId,
          customPayrollBaseCents: cents,
          customRatePercent: ratePercentToSave,
        });
        if (res.success) {
          toast.success("Ajuste de nómina actualizado");
          cancelEditing();
        } else {
          toast.error(res.error || "No se pudo actualizar el ajuste.");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        const friendlyMsg =
          msg.includes("Server Components render") || msg.includes("digest")
            ? "Error en el servidor al actualizar la nómina. Intenta de nuevo."
            : msg || "Error de conexión al guardar.";
        toast.error(friendlyMsg);
      }
    });
  };

  const handleReset = (itemId: string) => {
    startTransition(async () => {
      try {
        const res = await updatePayrollItemBase({
          itemId,
          customPayrollBaseCents: null,
          customRatePercent: null,
        });
        if (res.success) {
          toast.success("Ajuste eliminado, valores originales restaurados");
          cancelEditing();
        } else {
          toast.error(res.error || "Error al restablecer");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        const friendlyMsg =
          msg.includes("Server Components render") || msg.includes("digest")
            ? "Error en el servidor al restablecer el ajuste."
            : msg || "Error de conexión al restablecer.";
        toast.error(friendlyMsg);
      }
    });
  };

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
          <div className="sm:hidden space-y-2 pt-1">
            {order.items.map((item) => {
              const hasAdjustment =
                item.payrollBaseCents !== item.clientTotalCents || Boolean(item.hasCustomRate);
              const isEditing = editingItemId === item.id;
              const parsedBaseCents =
                editValue.trim() === "" ? null : Math.round(Number(editValue) * 100);
              const parsedRate = editRateValue.trim() === "" ? item.ratePercent : Number(editRateValue);
              const effectiveRate =
                !isNaN(parsedRate) && parsedRate >= 1 && parsedRate <= 100 ? parsedRate : item.ratePercent;
              const liveCommission =
                parsedBaseCents != null && !isNaN(parsedBaseCents) && parsedBaseCents >= 0
                  ? computeCommissionCents(parsedBaseCents, effectiveRate)
                  : null;

              if (isEditing) {
                return (
                  <div
                    key={`m-${item.id}`}
                    className="rounded-[var(--radius-sm)] bg-[var(--color-surface)] border-2 border-[var(--color-primary)]/40 p-2.5 text-xs space-y-2.5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-[var(--color-text-main)] leading-snug">
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

                    <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg-soft)]/60 p-2 space-y-2 border border-[var(--color-border-light)]/60">
                      <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                        <span>Cobro al cliente:</span>
                        <span className="font-medium text-[var(--color-text-main)]">
                          {formatCents(item.clientTotalCents)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label
                            htmlFor={`base-input-m-${item.id}`}
                            className="block text-[11px] font-medium text-[var(--color-text-main)]"
                          >
                            Base nómina
                          </label>
                          <div className="relative rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)] focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-focus-ring)]">
                            <span
                              className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs text-[var(--color-text-muted)] font-medium"
                              aria-hidden="true"
                            >
                              $
                            </span>
                            <input
                              id={`base-input-m-${item.id}`}
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="block w-full h-8 pl-6 pr-2.5 bg-transparent text-xs text-[var(--color-text-main)] outline-none"
                              autoFocus
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label
                            htmlFor={`rate-input-m-${item.id}`}
                            className="block text-[11px] font-medium text-[var(--color-text-main)]"
                          >
                            % Comisión
                          </label>
                          <div className="relative rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)] focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-focus-ring)]">
                            <input
                              id={`rate-input-m-${item.id}`}
                              type="number"
                              min="1"
                              max="100"
                              step="1"
                              placeholder="50"
                              value={editRateValue}
                              onChange={(e) => setEditRateValue(e.target.value)}
                              className="block w-full h-8 pl-2.5 pr-6 text-right bg-transparent text-xs text-[var(--color-text-main)] outline-none"
                            />
                            <span
                              className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-xs text-[var(--color-text-muted)] font-medium"
                              aria-hidden="true"
                            >
                              %
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Live calculation preview */}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[var(--color-border-light)]/40">
                        <span className="text-[var(--color-text-muted)]">
                          Comisión ({effectiveRate}%):
                        </span>
                        <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                          {liveCommission != null ? formatCents(liveCommission) : "-"}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1.5 pt-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={cancelEditing}
                        disabled={isPending}
                        className="h-7 text-xs px-2"
                      >
                        Cancelar
                      </Button>
                      {hasAdjustment && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleReset(item.id)}
                          disabled={isPending}
                          className="h-7 text-xs px-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                        >
                          Restablecer original
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => handleSave(item.id, item.clientTotalCents)}
                        disabled={isPending}
                        className="h-7 text-xs px-3 font-semibold"
                      >
                        {isPending ? "Guardando..." : "Guardar"}
                      </Button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={`m-${item.id}`}
                  className="rounded-[var(--radius-sm)] bg-[var(--color-surface)] border border-[var(--color-border-light)]/60 p-2 text-xs space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-[var(--color-text-main)] leading-snug">
                      {item.description}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.category === "WELDING" ? (
                        <Badge variant="warning" className="text-[10px] py-0 px-1.5 shrink-0">
                          Soldadura
                        </Badge>
                      ) : (
                        <Badge variant="default" className="text-[10px] py-0 px-1.5 shrink-0">
                          General
                        </Badge>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(item.id, item.payrollBaseCents, item.ratePercent)}
                        className="h-6 px-1.5 text-[11px] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 font-medium"
                        aria-label={`Ajustar base de nómina para ${item.description}`}
                      >
                        Ajustar
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)] pt-1 border-t border-[var(--color-border-light)]/40">
                    <div>
                      <span>Cobro: {formatCents(item.clientTotalCents)}</span>
                      {item.payrollBaseCents !== item.clientTotalCents && (
                        <span className="ml-1 text-amber-600 dark:text-amber-400 font-medium">
                          (Base: {formatCents(item.payrollBaseCents)})
                        </span>
                      )}
                      <span className="ml-1.5 font-medium">
                        • {item.ratePercent}%
                        {item.hasCustomRate && (
                          <span className="ml-0.5 text-indigo-600 dark:text-indigo-400 font-bold">*</span>
                        )}
                      </span>
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
                  <TableHead className="h-7 px-2 py-1 text-right text-xs font-medium w-36">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => {
                  const hasAdjustment =
                    item.payrollBaseCents !== item.clientTotalCents || Boolean(item.hasCustomRate);
                  const isEditing = editingItemId === item.id;
                  const parsedBaseCents =
                    editValue.trim() === "" ? null : Math.round(Number(editValue) * 100);
                  const parsedRate = editRateValue.trim() === "" ? item.ratePercent : Number(editRateValue);
                  const effectiveRate =
                    !isNaN(parsedRate) && parsedRate >= 1 && parsedRate <= 100 ? parsedRate : item.ratePercent;
                  const liveCommission =
                    parsedBaseCents != null && !isNaN(parsedBaseCents) && parsedBaseCents >= 0
                      ? computeCommissionCents(parsedBaseCents, effectiveRate)
                      : null;

                  if (isEditing) {
                    return (
                      <React.Fragment key={`d-${item.id}`}>
                        <TableRow className="text-xs bg-[var(--color-bg-soft)]/40 border-b border-[var(--color-border-light)]/60">
                          <TableCell className="px-2 py-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold">{item.description}</span>
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
                            <div className="flex items-center justify-end">
                              <div className="relative w-28 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)] focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-focus-ring)]">
                                <span
                                  className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2 text-xs text-[var(--color-text-muted)] font-medium"
                                  aria-hidden="true"
                                >
                                  $
                                </span>
                                <input
                                  id={`base-input-d-${item.id}`}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="block w-full h-7 pl-5 pr-2 text-right bg-transparent text-xs text-[var(--color-text-main)] outline-none font-medium"
                                  autoFocus
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-2 py-1.5 text-center font-medium">
                            <div className="flex items-center justify-center">
                              <div className="relative w-20 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)] focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-focus-ring)]">
                                <input
                                  id={`rate-input-d-${item.id}`}
                                  type="number"
                                  min="1"
                                  max="100"
                                  step="1"
                                  value={editRateValue}
                                  onChange={(e) => setEditRateValue(e.target.value)}
                                  className="block w-full h-7 pl-2 pr-6 text-center bg-transparent text-xs text-[var(--color-text-main)] outline-none font-medium"
                                />
                                <span
                                  className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-xs text-[var(--color-text-muted)] font-medium"
                                  aria-hidden="true"
                                >
                                  %
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-2 py-1.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                            {liveCommission != null ? formatCents(liveCommission) : "-"}
                          </TableCell>
                          <TableCell className="px-2 py-1.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="primary"
                                 size="sm"
                                onClick={() => handleSave(item.id, item.clientTotalCents)}
                                disabled={isPending}
                                className="h-6 text-xs px-2 font-medium"
                              >
                                {isPending ? "..." : "Guardar"}
                              </Button>
                              {hasAdjustment && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReset(item.id)}
                                  disabled={isPending}
                                  className="h-6 text-xs px-1.5 text-[var(--color-text-muted)]"
                                  title="Restablecer base y porcentaje original"
                                >
                                  Quitar
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={cancelEditing}
                                disabled={isPending}
                                className="h-6 text-xs px-1.5"
                              >
                                Cancelar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  }

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
                        {item.payrollBaseCents !== item.clientTotalCents ? (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            {formatCents(item.payrollBaseCents)}
                          </span>
                        ) : (
                          formatCents(item.payrollBaseCents)
                        )}
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-center font-medium">
                        {item.ratePercent}%
                        {item.hasCustomRate && (
                          <span className="ml-0.5 text-indigo-600 dark:text-indigo-400 font-bold">*</span>
                        )}
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCents(item.commissionCents)}
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(item.id, item.payrollBaseCents, item.ratePercent)}
                          className="h-6 px-2 text-xs text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 font-medium"
                          aria-label={`Ajustar base para ${item.description}`}
                        >
                          Ajustar
                        </Button>
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
