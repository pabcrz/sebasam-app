import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { SectionLabel } from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import type { WeeklyPayrollEstimate } from "../types";

interface PayrollEstimateCardProps {
  payroll: WeeklyPayrollEstimate;
}

export function PayrollEstimateCard({ payroll }: PayrollEstimateCardProps) {
  return (
    <section aria-labelledby="payroll-heading" className="grid min-w-0 gap-3">
      <SectionLabel id="payroll-heading">Nómina estimada</SectionLabel>
      <div className="grid gap-1 rounded-[var(--radius-md)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
        <div className="flex min-w-0 items-baseline justify-between gap-3">
          <span
            data-numeric-role="currency"
            className="break-words text-xl font-bold leading-tight tabular-nums text-[var(--color-text-main)] sm:text-2xl"
          >
            {formatCents(payroll.estimatedCommissionsCents)}
          </span>
          <Link
            href="/admin/nomina"
            className="flex shrink-0 items-center rounded-sm text-sm font-medium text-[var(--color-link)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
          >
            Ver nómina <Icon name="arrow-right" className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">
          Comisiones de {payroll.rangeLabel} ·{" "}
          <span data-numeric-role="supporting-count" className="font-medium tabular-nums">
            {payroll.totalWorkers}
          </span>{" "}
          trabajador{payroll.totalWorkers === 1 ? "" : "es"} activo{payroll.totalWorkers === 1 ? "" : "s"}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">Proyección con trabajos finalizados; no es un pago cerrado.</p>
      </div>
    </section>
  );
}
