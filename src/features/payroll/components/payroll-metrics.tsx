import { Banknote, CheckCircle2, DollarSign, Users } from "lucide-react";
import { formatCents } from "@/features/quotes/lib/format";
import { Card } from "@/components/ui/card";
import { MetricCardGroup } from "@/components/ui/metric-card-group";
import { StatCard } from "@/components/ui/stat-card";

interface PayrollMetricsProps {
  totalCommissionCents: number;
  totalPayableCents?: number;
  totalClientLaborCents: number;
  totalPayrollBaseCents: number;
  totalCompletedOrders: number;
  totalWorkers: number;
}

export function PayrollMetrics({
  totalCommissionCents,
  totalPayableCents,
  totalClientLaborCents,
  totalPayrollBaseCents,
  totalCompletedOrders,
  totalWorkers,
}: PayrollMetricsProps) {
  const hasBaseAdjustment = totalPayrollBaseCents !== totalClientLaborCents;
  const payableCents = totalPayableCents ?? totalCommissionCents;

  return (
    <>
      {/* Mobile Consolidated KPI Card (< sm) */}
      <Card data-testid="payroll-metrics-mobile" className="min-w-0 sm:hidden p-3 space-y-2.5 bg-[var(--color-surface)]">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-medium text-[var(--color-text-muted)] block">
              Total Nómina a Liquidar
            </span>
            <span className="break-words text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCents(payableCents)}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Banknote className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-3 gap-1 pt-2 border-t border-[var(--color-border-light)]/60 text-center text-xs">
          <div className="min-w-0 border-r border-[var(--color-border-light)]/50 pr-1">
            <span className="text-[10px] text-[var(--color-text-muted)] block truncate">Facturado</span>
            <span className="block break-words font-semibold text-[11px] text-[var(--color-text-main)]">
              {formatCents(totalClientLaborCents)}
            </span>
          </div>
          <div className="min-w-0 border-r border-[var(--color-border-light)]/50 px-1">
            <span className="text-[10px] text-[var(--color-text-muted)] block">Órdenes</span>
            <span className="font-semibold text-xs text-[var(--color-text-main)] block">
              {totalCompletedOrders}
            </span>
          </div>
          <div className="min-w-0 pl-1">
            <span className="text-[10px] text-[var(--color-text-muted)] block">Maestros</span>
            <span className="font-semibold text-xs text-[var(--color-text-main)] block">
              {totalWorkers}
            </span>
          </div>
        </div>
      </Card>

      {/* Desktop 4-Card Grid (>= sm) */}
      <div data-testid="payroll-metrics-desktop" className="hidden min-w-0 max-w-full sm:block">
        <MetricCardGroup columns={4}>
          <StatCard
            label="Total Nómina a Pagar"
            value={formatCents(payableCents)}
            numericRole="currency"
            description="Comisiones y sueldos fijos a liquidar"
            icon={<Banknote className="h-4 w-4" aria-hidden="true" />}
            iconVariant="success"
          />

          <StatCard
            label="Mano de Obra Facturada"
            value={formatCents(totalClientLaborCents)}
            numericRole="currency"
            description={
              hasBaseAdjustment
                ? `Base nómina: ${formatCents(totalPayrollBaseCents)}`
                : "Cobrado a clientes por mano de obra"
            }
            icon={<DollarSign className="h-4 w-4" aria-hidden="true" />}
            iconVariant="info"
          />

          <StatCard
            label="Órdenes Completadas"
            value={totalCompletedOrders}
            numericRole="count"
            description="Trabajos concluidos en la semana"
            icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
            iconVariant="violet"
          />

          <StatCard
            label="Maestros / Asignados"
            value={totalWorkers}
            numericRole="count"
            description="Personal con trabajos liquidados"
            icon={<Users className="h-4 w-4" aria-hidden="true" />}
            iconVariant="warning"
          />
        </MetricCardGroup>
      </div>
    </>
  );
}
