import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { SectionLabel } from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import type { ReceivableCustomer } from "../types";

interface ReceivablesSectionProps {
  customers: ReceivableCustomer[];
}

export function ReceivablesSection({ customers }: ReceivablesSectionProps) {
  return (
    <section aria-labelledby="receivables-heading">
      <div className="mb-3 flex items-center gap-2">
        <Icon name="money" className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" />
        <div>
          <SectionLabel>Finanzas</SectionLabel>
          <h2 id="receivables-heading" className="text-base font-semibold text-[var(--color-text-main)]">
            Cuentas por cobrar
          </h2>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface)] p-6 text-center shadow-[var(--shadow-card)]">
          <Icon name="check-circle" className="mb-2 h-8 w-8 text-[var(--color-status-success)]" aria-hidden="true" />
          <p className="text-sm font-semibold text-[var(--color-text-main)]">No hay saldos pendientes por cobrar</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-border-light)] overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
          {customers.map((customer) => (
            <Link
              key={customer.customerId}
              href={`/admin/customers/${customer.customerId}/estado-de-cuenta`}
              className="group flex items-center justify-between gap-3 p-3.5 transition-colors hover:bg-[var(--color-bg-soft)] active-press-subtle focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--color-text-main)] group-hover:text-[var(--color-primary)]">
                  {customer.customerName}
                </p>
                <p className={customer.isOverdue ? "text-xs font-semibold text-[var(--color-status-danger)]" : "text-xs text-[var(--color-text-muted)]"}>
                  {customer.isOverdue ? "Saldo vencido" : "Saldo pendiente"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold tabular-nums text-[var(--color-total-emphasis)]">
                  {formatCents(customer.pendingBalanceCents)}
                </span>
                <Icon name="arrow-right" className="h-4 w-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)]" aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
