import { Banknote, CheckCircle2, DollarSign, Users } from "lucide-react";
import { formatCents } from "@/features/quotes/lib/format";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";

interface PayrollMetricsProps {
  totalCommissionCents: number;
  totalClientLaborCents: number;
  totalPayrollBaseCents: number;
  totalCompletedOrders: number;
  totalWorkers: number;
}

export function PayrollMetrics({
  totalCommissionCents,
  totalClientLaborCents,
  totalPayrollBaseCents,
  totalCompletedOrders,
  totalWorkers,
}: PayrollMetricsProps) {
  const hasBaseAdjustment = totalPayrollBaseCents !== totalClientLaborCents;

  return (
    <>
      {/* Mobile Consolidated KPI Card (< sm) */}
      <Card className="sm:hidden p-3 space-y-2.5 bg-[var(--color-surface)]">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-[var(--color-text-muted)] block">
              Total Nómina a Liquidar
            </span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCents(totalCommissionCents)}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Banknote className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 pt-2 border-t border-[var(--color-border-light)]/60 text-center text-xs">
          <div className="border-r border-[var(--color-border-light)]/50 pr-1">
            <span className="text-[10px] text-[var(--color-text-muted)] block truncate">Facturado</span>
            <span className="font-semibold text-[11px] text-[var(--color-text-main)] truncate block">
              {formatCents(totalClientLaborCents)}
            </span>
          </div>
          <div className="border-r border-[var(--color-border-light)]/50 px-1">
            <span className="text-[10px] text-[var(--color-text-muted)] block">Órdenes</span>
            <span className="font-semibold text-xs text-[var(--color-text-main)] block">
              {totalCompletedOrders}
            </span>
          </div>
          <div className="pl-1">
            <span className="text-[10px] text-[var(--color-text-muted)] block">Maestros</span>
            <span className="font-semibold text-xs text-[var(--color-text-main)] block">
              {totalWorkers}
            </span>
          </div>
        </div>
      </Card>

      {/* Desktop 4-Card Grid (>= sm) */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Nómina a Pagar"
          value={formatCents(totalCommissionCents)}
          description="Comisiones calculadas a liquidar"
          icon={
            <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Banknote className="h-4 w-4" aria-hidden="true" />
            </div>
          }
        />

        <StatCard
          label="Mano de Obra Facturada"
          value={formatCents(totalClientLaborCents)}
          description={
            hasBaseAdjustment
              ? `Base nómina: ${formatCents(totalPayrollBaseCents)}`
              : "Cobrado a clientes por mano de obra"
          }
          icon={
            <div className="p-2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <DollarSign className="h-4 w-4" aria-hidden="true" />
            </div>
          }
        />

        <StatCard
          label="Órdenes Completadas"
          value={totalCompletedOrders}
          description="Trabajos concluidos en la semana"
          icon={
            <div className="p-2 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            </div>
          }
        />

        <StatCard
          label="Maestros / Asignados"
          value={totalWorkers}
          description="Personal con trabajos liquidados"
          icon={
            <div className="p-2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Users className="h-4 w-4" aria-hidden="true" />
            </div>
          }
        />
      </div>
    </>
  );
}
