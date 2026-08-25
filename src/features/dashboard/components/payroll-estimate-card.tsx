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
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
          <CardTitle as="h2" className="text-base font-semibold text-[var(--color-text-main)]">
            Nómina Semanal (Estimada)
          </CardTitle>
        </div>
        <Badge variant="warning">Cálculo estimado</Badge>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
          <div>
            <div className="text-2xl font-bold font-mono text-[var(--color-text-main)]">
              {formatCents(payroll.estimatedCommissionsCents)}
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Comisiones estimadas · {payroll.rangeLabel}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" aria-hidden="true" />
              <span>{payroll.totalWorkers} trabajador{payroll.totalWorkers === 1 ? "" : "es"} activo{payroll.totalWorkers === 1 ? "" : "s"}</span>
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
