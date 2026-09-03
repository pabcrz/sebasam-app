"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { payrollHref, type PayrollPeriodMode } from "../period";

interface PayrollPeriodNavProps {
  mode?: PayrollPeriodMode;
  rangeLabel: string;
  anchor: string;
  prevAnchor: string;
  nextAnchor: string;
  isCurrentWeek?: boolean;
  isCurrentPeriod?: boolean;
  hasData?: boolean;
  onExportExcel?: () => void;
  onOpenSigningSheet?: () => void;
}

export function PayrollPeriodNav({
  mode = "weekly",
  rangeLabel,
  prevAnchor,
  nextAnchor,
  isCurrentWeek,
  isCurrentPeriod,
  hasData = true,
  onExportExcel,
  onOpenSigningSheet,
}: PayrollPeriodNavProps) {
  const isCurrent = isCurrentPeriod ?? isCurrentWeek ?? false;

  return (
    <Card className="flex flex-col gap-3 p-4 shadow-sm sm:p-5">
      {/* Top row: Mode switch & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[var(--color-border-light)]">
        {/* Mode Selector */}
        <div className="flex items-center gap-1 bg-[var(--color-bg-soft)] p-0.5 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] self-start">
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
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-semibold text-[var(--color-text-main)] capitalize">
              {rangeLabel}
            </h2>
            {isCurrent && (
              <Badge variant="info" className="text-xs py-0.5 px-2">
                {mode === "monthly" ? "Mes en curso" : "Semana en curso"}
              </Badge>
            )}
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            {mode === "monthly"
              ? "Resumen mensual acumulado de órdenes completadas"
              : "Órdenes completadas y mano de obra a liquidar"}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2">
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
