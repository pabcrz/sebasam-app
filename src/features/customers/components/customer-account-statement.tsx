import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { formatCents, formatDate } from "@/features/quotes/lib/format";
import type { CustomerAccountStatement } from "../queries";

const movementTypeLabels: Record<string, string> = {
  CREDIT: "Crédito",
  DEBIT: "Cargo",
};

const paymentMethodLabels: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CREDIT_CARD: "Tarjeta de crédito",
  DEBIT_CARD: "Tarjeta de débito",
  OTHER: "Otro",
};

type CustomerAccountStatementProps = {
  statement: CustomerAccountStatement;
};

export function CustomerAccountStatement({ statement }: CustomerAccountStatementProps) {
  const isSettled = statement.pendingBalanceCents === 0;

  return (
    <Card data-testid="customer-account-statement">
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
          Estado de cuenta
        </p>
        <CardTitle as="h2">Resumen financiero</CardTitle>
        <p className="text-sm text-[var(--color-text-muted)]">
          Cotizaciones aprobadas y pagos confirmados del cliente.
        </p>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Total contratado</dt>
            <dd className="mt-1 font-mono text-lg font-semibold text-[var(--color-text-main)]">
              {formatCents(statement.totalContractedCents)}
            </dd>
          </div>
          <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Total pagado</dt>
            <dd className="mt-1 font-mono text-lg font-semibold text-[var(--color-text-main)]">
              {formatCents(statement.totalPaidCents)}
            </dd>
          </div>
          <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Saldo pendiente</dt>
            <dd className="mt-1 flex items-center justify-between gap-2 font-mono text-lg font-semibold text-[var(--color-text-main)]">
              {formatCents(statement.pendingBalanceCents)}
              <Badge variant={isSettled ? "success" : "warning"}>{isSettled ? "Cuenta liquidada" : "Pendiente"}</Badge>
            </dd>
          </div>
        </dl>

        <section aria-labelledby="customer-ledger-heading">
          <div className="flex items-center justify-between gap-3">
            <h3 id="customer-ledger-heading" className="text-base font-semibold text-[var(--color-text-main)]">
              Movimientos
            </h3>
            <span className="text-sm text-[var(--color-text-muted)]">{statement.movements.length} registrados</span>
          </div>

          {statement.movements.length === 0 ? (
            <p className="mt-3 rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border-light)] px-4 py-5 text-sm text-[var(--color-text-muted)]">
              Este cliente todavía no tiene movimientos financieros registrados.
            </p>
          ) : (
            <ol className="mt-3 grid gap-3">
              {statement.movements.map((movement) => (
                <li key={movement.id} className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-[var(--color-text-main)]">Cotización {movement.payment.quote.number}</p>
                      <time className="text-sm text-[var(--color-text-muted)]" dateTime={movement.createdAt.toISOString()}>
                        {formatDate(movement.createdAt)}
                      </time>
                    </div>
                    <span className="font-mono font-semibold text-[var(--color-text-main)]">
                      {formatCents(movement.amountCents)}
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-[var(--color-text-muted)]">Tipo</dt>
                      <dd className="font-medium text-[var(--color-text-main)]">{movementTypeLabels[movement.type] ?? movement.type}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--color-text-muted)]">Método</dt>
                      <dd className="font-medium text-[var(--color-text-main)]">{paymentMethodLabels[movement.payment.method] ?? movement.payment.method}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--color-text-muted)]">Saldo resultante</dt>
                      <dd className="font-mono font-medium text-[var(--color-text-main)]">{formatCents(movement.resultingBalanceCents)}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ol>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
