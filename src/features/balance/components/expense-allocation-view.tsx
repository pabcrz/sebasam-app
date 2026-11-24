import { Button, Input, Label } from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import { EXPENSE_CATEGORY_LABELS } from "../expenses/categories";
import type { ExpenseRow } from "../expenses/queries";
import { splitExpense } from "../profit";

type ExpenseAllocationViewProps = {
  expenses: ExpenseRow[];
  month: string;
  assign: (expenseId: string, formData: FormData) => void | Promise<void>;
};

const dateFormatter = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });

/** Owner only: decide, expense by expense, how much is charged to refacciones y materiales; the rest goes to mano de obra. */
export function ExpenseAllocationView({ expenses, month, assign }: ExpenseAllocationViewProps) {
  return (
    <section aria-labelledby="allocation-heading" data-testid="allocation-view" className="grid gap-3">
      <div>
        <h3 id="allocation-heading" className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Asignar gastos</h3>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          Quien captura los gastos no ve esto. Cada gasto empieza con el reparto que propone su categoría; aquí lo ajustas: el porcentaje que se carga a refacciones y materiales, y el resto a mano de obra.
        </p>
      </div>

      {expenses.length === 0 ? (
        <p className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-6 text-center text-sm text-[var(--color-text-muted)] shadow-[var(--shadow-card)]">
          No hay gastos registrados este mes.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-border-light)] overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
          {expenses.map((expense) => {
            const { partsCents, laborCents } = splitExpense(expense.amountCents, expense.partsSharePercent);
            const inputId = `share-${expense.id}`;
            return (
              <li key={expense.id} data-testid="allocation-row" className="grid gap-2 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="grid min-w-0 gap-0.5">
                  <p className="text-sm font-semibold text-[var(--color-text-main)]">
                    {EXPENSE_CATEGORY_LABELS[expense.category as keyof typeof EXPENSE_CATEGORY_LABELS] ?? expense.category}
                    <span className="ml-2 font-bold tabular-nums">{formatCents(expense.amountCents)}</span>
                  </p>
                  <p className="truncate text-xs text-[var(--color-text-muted)]">
                    {[dateFormatter.format(expense.spentAt), expense.supplier, expense.notes].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-xs tabular-nums text-[var(--color-text-muted)]" data-testid="allocation-split">
                    Refacciones {formatCents(partsCents)} · Mano de obra {formatCents(laborCents)}
                  </p>
                </div>
                <form action={assign.bind(null, expense.id)} className="flex items-end gap-2">
                  <input type="hidden" name="month" value={month} />
                  <div className="grid gap-1">
                    <Label htmlFor={inputId} className="text-xs">% a refacciones</Label>
                    <Input id={inputId} name="partsSharePercent" type="number" inputMode="numeric" min="0" max="100" step="1" required defaultValue={expense.partsSharePercent} className="w-24" />
                  </div>
                  <Button type="submit" variant="outline" size="sm">Guardar</Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
