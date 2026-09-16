"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, FileSignature } from "lucide-react";
import { PayrollPeriodStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { payrollHref, type PayrollPeriodMode } from "../period";
import { PayrollWeekStatusControls } from "./payroll-week-status-dialog";

interface PayrollPeriodNavProps {
  mode?: PayrollPeriodMode;
  rangeLabel: string;
  anchor: string;
  prevAnchor: string;
  nextAnchor: string;
  isCurrentWeek?: boolean;
  isCurrentPeriod?: boolean;
  hasData?: boolean;
  weekStatus?: PayrollPeriodStatus;
  onExportExcel?: () => void;
  onOpenSigningSheet?: () => void;
}

export function PayrollPeriodNav({
  mode = "weekly",
  rangeLabel,
  anchor,
  prevAnchor,
  nextAnchor,
  isCurrentWeek,
  isCurrentPeriod,
  hasData = true,
  weekStatus,
  onExportExcel,
  onOpenSigningSheet,
}: PayrollPeriodNavProps) {
  const isCurrent = isCurrentPeriod ?? isCurrentWeek ?? false;

  return (
    <Card data-testid="payroll-period-nav" className="min-w-0 max-w-full flex flex-col gap-3 p-4 shadow-sm sm:p-5">
      {/* Top row: Mode switch & Actions */}
      <div className="flex min-w-0 max-w-full flex-col flex-wrap gap-3 border-b border-[var(--color-border-light)] pb-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Mode Selector */}
        <div className="flex max-w-full flex-wrap items-center gap-1 self-start rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-0.5">
          <Button
            variant={mode === "weekly" ? "secondary" : "ghost"}
            size="sm"
            asChild
            className="h-8 text-xs px-3 font-medium"
          >
            <Link href={payrollHref({ mode: "weekly" })}>Semanal</Link>
          </Button>
          <Button
            variant={mode === "monthly" ? "secondary" : "ghost"}
            size="sm"
            asChild
            className="h-8 text-xs px-3 font-medium"
          >
            <Link href={payrollHref({ mode: "monthly" })}>Mensual</Link>
          </Button>
        </div>

        {/* Action Buttons: Excel & Signing Sheet (Disabled when no jobs) */}
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
          {onOpenSigningSheet && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenSigningSheet}
              disabled={!hasData}
              title={!hasData ? "No hay trabajos registrados en este período" : "Imprimir hoja de firmas de nómina"}
              className="h-8 text-xs px-3 gap-1.5"
            >
              <FileSignature className="h-3.5 w-3.5 text-[var(--color-primary)]" />
              Hoja de Firmas
            </Button>
          )}

          {onExportExcel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onExportExcel}
              disabled={!hasData}
              title={!hasData ? "No hay datos para exportar en este período" : "Descargar reporte en Excel"}
              className="h-8 text-xs px-3 gap-1.5 text-[var(--color-status-success)] border-[var(--color-status-success-border)] hover:bg-[var(--color-status-success-bg)]"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar Excel
            </Button>
          )}
        </div>
      </div>

      {/* Bottom row: Period info & Navigation */}
      <div className="flex min-w-0 max-w-full flex-col flex-wrap gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="break-words text-base font-semibold capitalize text-[var(--color-text-main)] sm:text-lg">
              {rangeLabel}
            </h2>
            {isCurrent && (
              <Badge variant="info" className="text-xs py-0.5 px-2">
                {mode === "monthly" ? "Mes en curso" : "Semana en curso"}
              </Badge>
            )}
            {mode === "weekly" && (
              <PayrollWeekStatusControls
                weekStart={anchor}
                status={weekStatus}
                isCurrentWeek={isCurrentWeek}
              />
            )}
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            {mode === "monthly"
              ? "Resumen mensual acumulado de órdenes completadas"
              : "Órdenes completadas y mano de obra a liquidar"}
          </p>
        </div>

        <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2">
          <Button variant="outline" size="sm" asChild className="h-9 text-xs px-3">
            <Link
              href={payrollHref({ mode, anchor: prevAnchor })}
              aria-label={mode === "monthly" ? "Mes anterior" : "Semana anterior"}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Link>
          </Button>

          {!isCurrent && (
            <Button variant="secondary" size="sm" asChild className="h-9 text-xs px-3">
              <Link href={payrollHref({ mode })}>Hoy</Link>
            </Button>
          )}

          <Button variant="outline" size="sm" asChild className="h-9 text-xs px-3">
            <Link
              href={payrollHref({ mode, anchor: nextAnchor })}
              aria-label={mode === "monthly" ? "Mes siguiente" : "Semana siguiente"}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
