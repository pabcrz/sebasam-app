import { formatCents } from "@/features/quotes/lib/format";
import { StatTile } from "@/components/ui/stat-tile";

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
    <div data-testid="payroll-metrics" className="grid min-w-0 max-w-full grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile
        label="Total a pagar"
        value={formatCents(payableCents)}
        info="Comisiones y sueldos fijos a liquidar"
      />
      <StatTile
        label="Mano de obra facturada"
        value={formatCents(totalClientLaborCents)}
        info={hasBaseAdjustment ? `Base nómina: ${formatCents(totalPayrollBaseCents)}` : "Cobrado a clientes por mano de obra"}
      />
      <StatTile label="Órdenes completadas" value={totalCompletedOrders} info="Trabajos concluidos en la semana" />
      <StatTile label="Maestros / asignados" value={totalWorkers} info="Personal con trabajos liquidados" />
    </div>
  );
}
