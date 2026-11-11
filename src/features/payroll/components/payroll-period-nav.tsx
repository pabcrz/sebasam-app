"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PayrollPeriodStatus } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { PeriodNavigator } from "@/components/ui/period-navigator";
import { payrollHref, type PayrollPeriodMode } from "../period";
import { PayrollWeekStatusBadge, PayrollWeekStatusControls } from "./payroll-week-status-dialog";

interface PayrollPeriodNavProps {
  mode?: PayrollPeriodMode;
  /** "YYYY-MM-DD" inside the shown period; the period itself is decided by period.ts. */
  anchor: string;
  isCurrentWeek?: boolean;
  hasData?: boolean;
  weekStatus?: PayrollPeriodStatus;
  onOpenSigningSheet?: () => void;
  role?: string;
}

/** Page title with the week status and print action, then the period navigator and the week controls. */
export function PayrollPeriodNav({
  mode = "weekly",
  anchor,
  isCurrentWeek,
  hasData = true,
  weekStatus,
  onOpenSigningSheet,
  role = "SUPER_ADMIN",
}: PayrollPeriodNavProps) {
  const router = useRouter();
  const [today] = React.useState(() => new Date());
  const isAdmin = role === "ADMIN";
  const isWeekly = mode === "weekly";
  const showWeekStatus = isWeekly && !isAdmin;

  return (
    <div data-testid="payroll-period-nav" className="grid min-w-0 max-w-full gap-3">
      <PageHeader
        title="Nómina"
        status={showWeekStatus ? <PayrollWeekStatusBadge status={weekStatus} /> : null}
        secondaryActions={
          !isAdmin && onOpenSigningSheet ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onOpenSigningSheet}
              disabled={!hasData}
              aria-label="Hoja de firmas"
              title={!hasData ? "No hay trabajos registrados en este período" : "Imprimir hoja de firmas de nómina"}
            >
              <Icon name="print" className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null
        }
      />

      <PeriodNavigator
        view={isWeekly ? "week" : "month"}
        anchor={anchor}
        today={today}
        views={isAdmin ? ["week"] : ["week", "month"]}
        weekDays={6}
        onViewChange={(next) => router.push(payrollHref({ mode: next === "month" ? "monthly" : "weekly", anchor }))}
        onAnchorChange={(next) => router.push(payrollHref({ mode, anchor: next }))}
      />

      {showWeekStatus ? (
        <div className="flex justify-end">
          <PayrollWeekStatusControls weekStart={anchor} status={weekStatus} isCurrentWeek={isCurrentWeek} />
        </div>
      ) : null}
    </div>
  );
}
