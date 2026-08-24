import { Banknote, CheckCircle2, DollarSign, Users } from "lucide-react";
import { formatCents } from "@/features/quotes/lib/format";
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
  );
}
