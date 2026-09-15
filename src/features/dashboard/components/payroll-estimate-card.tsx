import Link from "next/link";
import { ArrowRight, Banknote, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/features/quotes/lib/format";
import type { WeeklyPayrollEstimate } from "../types";

interface PayrollEstimateCardProps {
  payroll: WeeklyPayrollEstimate;
}

export function PayrollEstimateCard({ payroll }: PayrollEstimateCardProps) {
  return (
      <Card className="min-w-0 shadow-sm">
      <CardHeader className="flex flex-col items-start gap-2 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <Banknote className="h-5 w-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
          <CardTitle as="h2" className="min-w-0 break-words text-base font-semibold text-[var(--color-text-main)]">
            Nómina Semanal (Estimada)
          </CardTitle>
        </div>
        <Badge variant="warning" className="text-xs font-normal">Cálculo estimado</Badge>
      </CardHeader>

      <CardContent>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <div className="min-w-0">
            <div
              data-numeric-role="currency"
              className="break-words font-mono text-xl font-bold leading-tight tabular-nums text-[var(--color-text-main)] sm:text-2xl"
            >
              {formatCents(payroll.estimatedCommissionsCents)}
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Comisiones estimadas · {payroll.rangeLabel}
            </p>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--color-text-muted)]">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" aria-hidden="true" />
              <span>
                <span data-numeric-role="supporting-count" className="font-medium tabular-nums">
                  {payroll.totalWorkers}
                </span>{" "}
                trabajador{payroll.totalWorkers === 1 ? "" : "es"} activo{payroll.totalWorkers === 1 ? "" : "s"}
              </span>
            </div>
            <Link
              href="/admin/nomina"
              className="flex items-center font-medium text-[var(--color-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] rounded-sm"
            >
              Ver liquidación <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-[var(--color-text-muted)] italic border-t border-[var(--color-border-light)] pt-2">
          * Basado en trabajos finalizados en la semana. Este monto es una proyección y no constituye un pago cerrado.
        </p>
      </CardContent>
    </Card>
  );
}
