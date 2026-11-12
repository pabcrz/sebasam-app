"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { PayrollPeriodStatus } from "@/generated/prisma/enums";
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
  onOpenSigningSheet?: () => void;
  role?: string;
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
  onOpenSigningSheet,
  role = "SUPER_ADMIN",
}: PayrollPeriodNavProps) {
  const isCurrent = isCurrentPeriod ?? isCurrentWeek ?? false;
  const isAdmin = role === "ADMIN";

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
            className="text-xs px-3 font-medium"
          >
            <Link href={payrollHref({ mode: "weekly" })}>Semanal</Link>
          </Button>
          {!isAdmin && (
            <Button
              variant={mode === "monthly" ? "secondary" : "ghost"}
              size="sm"
              asChild
              className="text-xs px-3 font-medium"
            >
              <Link href={payrollHref({ mode: "monthly" })}>Mensual</Link>
            </Button>
          )}
        </div>

        {/* Action Buttons: General PDF report (Disabled when no jobs) */}
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
          {!isAdmin && onOpenSigningSheet && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenSigningSheet}
              disabled={!hasData}
              title={!hasData ? "No hay trabajos registrados en este período" : "Imprimir hoja de firmas de nómina"}
              className="text-xs px-3 gap-1.5"
            >
              <Icon name="sign" className="h-3.5 w-3.5 text-[var(--color-primary)]" />
              Hoja de Firmas
            </Button>
          )}
        </div>
      </div>

      {/* Bottom row: Period info & Navigation */}
      <div className="flex min-w-0 max-w-full flex-col flex-wrap gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="break-words text-base font-semibold text-[var(--color-text-main)] sm:text-lg">
              {rangeLabel}
            </h2>
            {isCurrent && (
              <Badge variant="info" className="text-xs py-0.5 px-2">
                {mode === "monthly" ? "Mes en curso" : "Semana en curso"}
              </Badge>
            )}
            {mode === "weekly" && !isAdmin && (
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
          <Button variant="outline" size="sm" asChild className="text-xs px-3">
            <Link
              href={payrollHref({ mode, anchor: prevAnchor })}
              aria-label={mode === "monthly" ? "Mes anterior" : "Semana anterior"}
            >
              <Icon name="chevron-left" className="h-4 w-4 mr-1" />
              Anterior
            </Link>
          </Button>

          {!isCurrent && (
            <Button variant="secondary" size="sm" asChild className="text-xs px-3">
              <Link href={payrollHref({ mode })}>Hoy</Link>
            </Button>
          )}

          <Button variant="outline" size="sm" asChild className="text-xs px-3">
            <Link
              href={payrollHref({ mode, anchor: nextAnchor })}
              aria-label={mode === "monthly" ? "Mes siguiente" : "Semana siguiente"}
            >
              Siguiente
              <Icon name="chevron-right" className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
