import { formatCents } from "@/features/quotes/lib/format";
import { EXPENSE_CATEGORY_LABELS, EXPENSE_INVOICE_LABELS, EXPENSE_PAYMENT_METHODS } from "../expenses/categories";
import { ExpenseFormDialog } from "../expenses/expense-form-dialog";
import { ExpenseRowActions } from "../expenses/expense-row-actions";
import type { ExpenseRow, RecurringRow, SupplierOption } from "../expenses/queries";
import type { MonthPeriod } from "../profit-queries";
import { MonthNavigator } from "./month-navigator";
import { RecurringExpensesSection } from "./recurring-expenses-section";

type ExpensesViewProps = {
  period: MonthPeriod;
  expenses: ExpenseRow[];
  today: string;
  hrefFor: (month: string | null) => string;
  actions: {
    create: (formData: FormData) => void | Promise<void>;
    update: (expenseId: string, formData: FormData) => void | Promise<void>;
    remove: (expenseId: string, formData: FormData) => void | Promise<void>;
    confirmRecurring: (recurringId: string, formData: FormData) => void | Promise<void>;
    skipRecurring: (recurringId: string, formData: FormData) => void | Promise<void>;
    stopRecurring: (recurringId: string, formData: FormData) => void | Promise<void>;
  };
  suppliers?: SupplierOption[];
  recurring?: { templates: RecurringRow[]; pending: RecurringRow[] };
  notice?: { tone: "success" | "danger"; text: string } | null;
  /** Only the owner sees how an expense is split between the two accounts. */
  showAllocation?: boolean;
};

const dateFormatter = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });
const methodLabels = Object.fromEntries(EXPENSE_PAYMENT_METHODS.map((method) => [method.value, method.label]));

export function ExpensesView({ period, expenses, today, hrefFor, actions, notice, showAllocation = false, suppliers = [], recurring = { templates: [], pending: [] } }: ExpensesViewProps) {
  const invoiced = expenses.filter((expense) => expense.invoiceStatus === "INVOICED").reduce((sum, expense) => sum + expense.amountCents, 0);
  const total = expenses.reduce((sum, expense) => sum + expense.amountCents, 0);

  return (
    <section aria-labelledby="expenses-heading" data-testid="expenses-view" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="expenses-heading" className="sr-only">Gastos</h2>
        <MonthNavigator period={period} hrefFor={hrefFor} />
        <ExpenseFormDialog action={actions.create} month={period.month} today={today} suppliers={suppliers} />
      </div>

      {notice ? (
        <p role={notice.tone === "danger" ? "alert" : "status"} className={`rounded-[var(--radius-sm)] border px-4 py-3 text-sm ${notice.tone === "danger" ? "border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger-fg)]" : "border-[var(--color-status-success-border)] bg-[var(--color-status-success-bg)] text-[var(--color-status-success-fg)]"}`}>
          {notice.text}
        </p>
      ) : null}

      <RecurringExpensesSection
        month={period.month}
        templates={recurring.templates}
        pending={recurring.pending}
        actions={{ confirm: actions.confirmRecurring, skip: actions.skipRecurring, stop: actions.stopRecurring }}
      />

      <dl className="grid grid-cols-3 gap-3 text-sm" data-testid="expenses-totals">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-3">
          <dt className="text-xs text-[var(--color-text-muted)]">Total del mes</dt>
          <dd className="font-semibold tabular-nums">{formatCents(total)}</dd>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-3">
          <dt className="text-xs text-[var(--color-text-muted)]">Con factura</dt>
          <dd className="font-semibold tabular-nums">{formatCents(invoiced)}</dd>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-3">
          <dt className="text-xs text-[var(--color-text-muted)]">Sin factura</dt>
          <dd className="font-semibold tabular-nums">{formatCents(total - invoiced)}</dd>
        </div>
      </dl>

      {expenses.length === 0 ? (
        <p className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-6 text-center text-sm text-[var(--color-text-muted)] shadow-[var(--shadow-card)]">
          No hay gastos registrados en {period.label}.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-border-light)] overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
          {expenses.map((expense) => (
            <li key={expense.id} data-testid="expense-row" className="flex items-center justify-between gap-3 p-3">
              <div className="grid min-w-0 gap-0.5">
                <p className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-[var(--color-text-main)]">
                  <span>{EXPENSE_CATEGORY_LABELS[expense.category as keyof typeof EXPENSE_CATEGORY_LABELS] ?? expense.category}</span>
                  <span className="text-xs font-medium text-[var(--color-text-muted)]">{EXPENSE_INVOICE_LABELS[expense.invoiceStatus]}</span>
                </p>
                <p className="truncate text-xs text-[var(--color-text-muted)]">
                  {[
                    dateFormatter.format(expense.spentAt),
                    expense.supplier,
                    expense.paymentMethod ? methodLabels[expense.paymentMethod] : null,
                    showAllocation && expense.partsSharePercent > 0 ? `${expense.partsSharePercent} % a refacciones` : null,
                    expense.notes,
                  ].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-bold tabular-nums text-[var(--color-text-main)]">{formatCents(expense.amountCents)}</span>
                <ExpenseRowActions
                  expense={expense}
                  month={period.month}
                  today={today}
                  updateAction={actions.update.bind(null, expense.id)}
                  deleteAction={actions.remove.bind(null, expense.id)}
                  suppliers={suppliers}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
