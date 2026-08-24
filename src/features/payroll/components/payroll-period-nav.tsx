"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { payrollHref } from "../period";

interface PayrollPeriodNavProps {
  rangeLabel: string;
  anchor: string;
  prevAnchor: string;
  nextAnchor: string;
  isCurrentWeek: boolean;
}

export function PayrollPeriodNav({
  rangeLabel,
  prevAnchor,
  nextAnchor,
  isCurrentWeek,
}: PayrollPeriodNavProps) {
  return (
    <Card className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="p-2 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] shrink-0">
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <h2 className="text-sm sm:text-base font-semibold text-[var(--color-text-main)] capitalize">
              {rangeLabel}
            </h2>
            {isCurrentWeek && (
              <Badge variant="success" className="text-[10px] sm:text-xs py-0 px-2">
                Semana en curso
              </Badge>
            )}
          </div>
          <p className="text-[11px] sm:text-xs text-[var(--color-text-muted)]">
            Órdenes completadas y mano de obra a liquidar
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5 sm:gap-2">
        <Button variant="outline" size="sm" asChild className="h-8 text-xs px-2.5">
          <Link href={payrollHref(prevAnchor)} aria-label="Semana anterior">
            <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
            Anterior
          </Link>
        </Button>

        {!isCurrentWeek && (
          <Button variant="secondary" size="sm" asChild className="h-8 text-xs px-2.5">
            <Link href={payrollHref()}>Hoy</Link>
          </Button>
        )}

        <Button variant="outline" size="sm" asChild className="h-8 text-xs px-2.5">
          <Link href={payrollHref(nextAnchor)} aria-label="Semana siguiente">
            Siguiente
            <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
