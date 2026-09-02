"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Calendar, Download, FileSignature } from "lucide-react";
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
  onExportExcel,
  onOpenSigningSheet,
}: PayrollPeriodNavProps) {
  const isCurrent = isCurrentPeriod ?? isCurrentWeek ?? false;

  return (
    <Card className="flex flex-col gap-3 p-3 sm:p-4">
      {/* Top row: Mode switch & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2 border-b border-[var(--color-border-light)]/60">
        {/* Mode Selector */}
        <div className="flex items-center gap-1 bg-[var(--color-bg-soft)] p-0.5 rounded-lg border border-[var(--color-border-light)] self-start">
          <Button
            variant={mode === "weekly" ? "secondary" : "ghost"}
            size="sm"
            asChild
            className="h-7 text-xs px-3 font-medium"
          >
            <Link href={payrollHref({ mode: "weekly" })}>Semanal</Link>
          </Button>
          <Button
            variant={mode === "monthly" ? "secondary" : "ghost"}
            size="sm"
            asChild
            className="h-7 text-xs px-3 font-medium"
          >
            <Link href={payrollHref({ mode: "monthly" })}>Mensual</Link>
          </Button>
        </div>

        {/* Action Buttons: Excel & Signing Sheet */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {onOpenSigningSheet && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenSigningSheet}
              className="h-7 sm:h-8 text-xs px-2.5 gap-1.5"
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
              className="h-7 sm:h-8 text-xs px-2.5 gap-1.5 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar Excel
            </Button>
          )}
        </div>
      </div>

      {/* Bottom row: Period info & Navigation */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] shrink-0">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-semibold text-[var(--color-text-main)] capitalize">
                {rangeLabel}
              </h2>
              {isCurrent && (
                <Badge variant="success" className="text-[10px] sm:text-xs py-0 px-2">
                  {mode === "monthly" ? "Mes en curso" : "Semana en curso"}
                </Badge>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-[var(--color-text-muted)]">
              {mode === "monthly"
                ? "Resumen mensual acumulado de órdenes completadas"
                : "Órdenes completadas y mano de obra a liquidar"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
          <Button variant="outline" size="sm" asChild className="h-8 text-xs px-2.5">
            <Link
              href={payrollHref({ mode, anchor: prevAnchor })}
              aria-label={mode === "monthly" ? "Mes anterior" : "Semana anterior"}
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
              Anterior
            </Link>
          </Button>

          {!isCurrent && (
            <Button variant="secondary" size="sm" asChild className="h-8 text-xs px-2.5">
              <Link href={payrollHref({ mode })}>Hoy</Link>
            </Button>
          )}

          <Button variant="outline" size="sm" asChild className="h-8 text-xs px-2.5">
            <Link
              href={payrollHref({ mode, anchor: nextAnchor })}
              aria-label={mode === "monthly" ? "Mes siguiente" : "Semana siguiente"}
            >
              Siguiente
              <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
