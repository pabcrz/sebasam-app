import { PageHeader, SectionLabel, StatTile } from "@/components/ui";
import { ReceivablesSection } from "@/features/dashboard/components/receivables-section";
import { formatCents } from "@/features/quotes/lib/format";
import type { BalanceSnapshot } from "../types";

const PERIOD_TITLES = { week: "Esta semana", month: "Este mes", year: "Este año" } as const;

function paymentsLabel(count: number) {
  return count === 0 ? "Sin pagos registrados" : `${count} ${count === 1 ? "pago registrado" : "pagos registrados"}`;
}

/** Two separate sections: what came in (Cobrado) and what is still owed (Por cobrar). */
export function BalanceView({ snapshot, showHeader = true }: { snapshot: BalanceSnapshot; showHeader?: boolean }) {
  const { collected, receivables } = snapshot;

  return (
    <div className="grid gap-6">
      {showHeader ? <PageHeader title="Balance" subtitle="Cobrado y por cobrar" /> : null}

      <section aria-labelledby="balance-collected-heading" data-testid="balance-collected" className="grid gap-3">
        <div>
          <SectionLabel id="balance-collected-heading">Cobrado</SectionLabel>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Dinero recibido: pagos registrados en cada periodo.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {(["week", "month", "year"] as const).map((period) => (
            <StatTile
              key={period}
              label={PERIOD_TITLES[period]}
              value={formatCents(collected[period].totalCents)}
              numericRole="currency"
              tone="success"
              description={`${paymentsLabel(collected[period].paymentsCount)} · ${collected[period].rangeLabel}`}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="balance-receivables-heading" data-testid="balance-receivables" className="grid gap-3">
        <div>
          <SectionLabel id="balance-receivables-heading">Por cobrar</SectionLabel>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            Saldo pendiente de notas completadas. No es dinero cobrado y no se suma a lo cobrado.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatTile
            label="Total por cobrar"
            value={formatCents(receivables.totalCents)}
            numericRole="currency"
            tone="warning"
            description={
              receivables.customers.length === 0
                ? "Sin saldos pendientes"
                : `${receivables.customers.length} ${receivables.customers.length === 1 ? "cliente" : "clientes"} con saldo`
            }
          />
          <StatTile
            label="Vencido"
            value={formatCents(receivables.overdueCents)}
            numericRole="currency"
            tone={receivables.overdueCents > 0 ? "danger" : "neutral"}
            description="Parte del total que ya superó su fecha límite"
          />
        </div>
        <ReceivablesSection customers={receivables.customers} limit={receivables.customers.length} showHeading={false} />
      </section>
    </div>
  );
}
