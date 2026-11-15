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
    <div data-testid="payroll-metrics" className="grid min-w-0 max-w-full grid-cols-2 gap-3">
      <StatTile
        label="Total a pagar"
        value={formatCents(payableCents)}
        description={`${totalWorkers} ${totalWorkers === 1 ? "maestro" : "maestros"}`}
        info="Comisiones y sueldos fijos a liquidar"
      />
      <StatTile
        label="Mano de obra"
        value={formatCents(totalClientLaborCents)}
        description={`${totalCompletedOrders} ${totalCompletedOrders === 1 ? "orden" : "órdenes"}`}
        info={hasBaseAdjustment ? `Base nómina: ${formatCents(totalPayrollBaseCents)}` : "Cobrado a clientes por mano de obra"}
      />
    </div>
  );
}
