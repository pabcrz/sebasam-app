import { Button, Input } from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import { EXPENSE_CATEGORY_LABELS } from "../expenses/categories";
import type { RecurringRow } from "../expenses/queries";

type RecurringExpensesSectionProps = {
  month: string;
  templates: RecurringRow[];
  pending: RecurringRow[];
  actions: {
    confirm: (recurringId: string, formData: FormData) => void | Promise<void>;
    skip: (recurringId: string, formData: FormData) => void | Promise<void>;
    stop: (recurringId: string, formData: FormData) => void | Promise<void>;
  };
};

const label = (row: RecurringRow) => [EXPENSE_CATEGORY_LABELS[row.category as keyof typeof EXPENSE_CATEGORY_LABELS] ?? row.category, row.supplier].filter(Boolean).join(" · ");

/** The month's proposals (confirm, adjust or skip) and the list of templates. Nothing is registered without a confirmation. */
export function RecurringExpensesSection({ month, templates, pending, actions }: RecurringExpensesSectionProps) {
  if (templates.length === 0) return null;

  return (
    <div className="grid gap-3" data-testid="recurring-section">
      {pending.length > 0 ? (
        <section aria-labelledby="recurring-pending-heading" className="grid gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-card)]">
          <h3 id="recurring-pending-heading" className="text-sm font-semibold text-[var(--color-text-main)]">Pendientes de este mes</h3>
          <ul className="grid gap-3">
            {pending.map((row) => (
              <li key={row.id} data-testid="recurring-pending" className="grid gap-2">
                <p className="text-sm text-[var(--color-text-main)]">{label(row)} <span className="text-xs text-[var(--color-text-muted)]">· día {row.dayOfMonth}</span></p>
                <form action={actions.confirm.bind(null, row.id)} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="month" value={month} />
                  <Input name="amount" type="number" inputMode="decimal" min="0.01" step="0.01" required defaultValue={(row.amountCents / 100).toFixed(2)} aria-label={`Monto de ${label(row)}`} className="w-32" />
                  <Button type="submit" variant="primary" size="sm">Confirmar</Button>
                  <Button type="submit" formAction={actions.skip.bind(null, row.id)} formNoValidate variant="outline" size="sm">Omitir este mes</Button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <details className="rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-3 text-sm">
        <summary className="cursor-pointer font-semibold text-[var(--color-text-main)]">Gastos que se repiten ({templates.length})</summary>
        <ul className="mt-2 divide-y divide-[var(--color-border-light)]">
          {templates.map((row) => (
            <li key={row.id} data-testid="recurring-template" className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0 truncate">{label(row)} · día {row.dayOfMonth} · {formatCents(row.amountCents)}</span>
              <form action={actions.stop.bind(null, row.id)}>
                <input type="hidden" name="month" value={month} />
                <Button type="submit" variant="ghost" size="sm">Dejar de repetir</Button>
              </form>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
