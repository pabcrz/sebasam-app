import type { Metadata } from "next";
import { PageHeader, SegmentedControl } from "@/components/ui";
import { BalanceView } from "@/features/balance/components/balance-view";
import { ExpenseAllocationView } from "@/features/balance/components/expense-allocation-view";
import { ComparisonView } from "@/features/balance/components/comparison-view";
import { ExpensesView } from "@/features/balance/components/expenses-view";
import { ProfitView, type ProfitViewKey } from "@/features/balance/components/profit-view";
import { assignExpenseShareFromForm, confirmRecurringExpenseFromForm, createExpenseFromForm, deleteExpenseFromForm, skipRecurringExpenseFromForm, stopRecurringExpenseFromForm, linkExpenseToNoteFromForm, unlinkExpenseFromNoteFromForm, updateExpenseFromForm } from "@/features/balance/expenses/actions";
import { listExpensesForAssignment, listExpensesForMonth, listRecurringForMonth, listSuppliers } from "@/features/balance/expenses/queries";
import { getBalanceSnapshot } from "@/features/balance/queries";
import { getMonthlyComparison, getProfitSnapshot } from "@/features/balance/profit-queries";
import type { ComparisonSeries } from "@/features/balance/profit";
import { canRegisterExpenses, isAdminRole, requireProfileForPage } from "@/lib/auth/session";

const OWNER_ROLE = "SUPER_ADMIN";

export const metadata: Metadata = {
  title: "Balance",
  description: "Ingresos cobrados, cuentas por cobrar, gastos y utilidad.",
};

type BalancePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const TABS = ["cobros", "utilidad", "gastos"] as const;
type Tab = (typeof TABS)[number];
const VIEWS: ProfitViewKey[] = ["general", "mano-de-obra", "refacciones", "comparar", "asignar"];
const SERIES: ComparisonSeries[] = ["todas", "mano-de-obra", "refacciones"];

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const NOTICES: Array<[string, { tone: "success" | "danger"; text: string }]> = [
  ["created", { tone: "success", text: "Gasto registrado." }],
  ["updated", { tone: "success", text: "Gasto actualizado." }],
  ["deleted", { tone: "success", text: "Gasto eliminado." }],
  ["skipped", { tone: "success", text: "Omitido este mes." }],
  ["stopped", { tone: "success", text: "Ya no se repite." }],
  ["assigned", { tone: "success", text: "Reparto guardado." }],
  ["error", { tone: "danger", text: "Revisa los datos e intenta de nuevo. Lo ligado a notas no puede pasar del monto de la compra." }],
];

export default async function BalancePage({ searchParams }: BalancePageProps) {
  const params = (await searchParams) ?? {};
  const { profile } = await requireProfileForPage();
  // Whoever registers expenses (ADMIN, ADMIN_ASSISTANT) never sees profit or how expenses are split: those are the owner's.
  const canSeeExpenses = canRegisterExpenses(profile.role);
  const canSeeProfit = profile.role === OWNER_ROLE;

  const requestedTab = first(params.tab);
  const allowedTabs: readonly Tab[] = canSeeProfit ? TABS : canSeeExpenses ? ["cobros", "gastos"] : ["cobros"];
  const tab: Tab = allowedTabs.includes(requestedTab as Tab) ? (requestedTab as Tab) : "cobros";
  const month = first(params.month);
  const requestedView = first(params.view);
  const view: ProfitViewKey = VIEWS.includes(requestedView as ProfitViewKey) ? (requestedView as ProfitViewKey) : "general";

  const requestedSeries = first(params.serie);
  const series: ComparisonSeries = SERIES.includes(requestedSeries as ComparisonSeries) ? (requestedSeries as ComparisonSeries) : "todas";

  const hrefFor = (target: { tab?: Tab; month?: string | null; view?: ProfitViewKey; serie?: ComparisonSeries }) => {
    const query = new URLSearchParams();
    const nextTab = target.tab ?? tab;
    if (nextTab !== "cobros") query.set("tab", nextTab);
    const nextMonth = target.month === undefined ? month : target.month;
    if (nextMonth) query.set("month", nextMonth);
    const nextView = target.view ?? view;
    if (nextTab === "utilidad" && nextView !== "general") query.set("view", nextView);
    const nextSeries = target.serie ?? series;
    if (nextTab === "utilidad" && nextView === "comparar" && nextSeries !== "todas") query.set("serie", nextSeries);
    const text = query.toString();
    return `/admin/balance${text ? `?${text}` : ""}`;
  };

  const tabControl = canSeeExpenses ? (
    <SegmentedControl
      label="Secciones de Balance"
      value={tab}
      options={[
        { value: "cobros", label: "Cobros y saldos", href: hrefFor({ tab: "cobros" }) },
        ...(canSeeProfit ? [{ value: "utilidad", label: "Utilidad", href: hrefFor({ tab: "utilidad" }) }] : []),
        { value: "gastos", label: "Gastos", href: hrefFor({ tab: "gastos" }) },
      ]}
    />
  ) : null;

  let content: React.ReactNode;
  if (tab === "utilidad") {
    const snapshot = await getProfitSnapshot(month);
    const notice = NOTICES.find(([key]) => first(params[key]))?.[1] ?? null;
    const allocation =
      view === "asignar" ? (
        <div className="grid gap-3">
          {notice ? (
            <p role={notice.tone === "danger" ? "alert" : "status"} className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)] px-4 py-3 text-sm">{notice.text}</p>
          ) : null}
          <ExpenseAllocationView {...(await listExpensesForAssignment(month))} month={snapshot.period.month} assign={assignExpenseShareFromForm} link={linkExpenseToNoteFromForm} unlink={unlinkExpenseFromNoteFromForm} />
        </div>
      ) : null;
    const comparison = view === "comparar" ? <ComparisonView snapshot={await getMonthlyComparison(month, series)} hrefFor={(serie) => hrefFor({ tab: "utilidad", view: "comparar", serie })} /> : null;
    content = (
      <ProfitView
        snapshot={snapshot}
        view={view}
        allocation={allocation}
        comparison={comparison}
        hrefFor={(change) => hrefFor({ tab: "utilidad", month: change.month, view: change.view })}
      />
    );
  } else if (tab === "gastos") {
    const { period, expenses } = await listExpensesForMonth(month);
    const [suppliers, recurring] = await Promise.all([listSuppliers(), listRecurringForMonth(period)]);
    const notice = NOTICES.find(([key]) => first(params[key]))?.[1] ?? null;
    content = (
      <ExpensesView
        period={period}
        expenses={expenses}
        today={new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date())}
        hrefFor={(target) => hrefFor({ tab: "gastos", month: target })}
        actions={{ create: createExpenseFromForm, update: updateExpenseFromForm, remove: deleteExpenseFromForm, confirmRecurring: confirmRecurringExpenseFromForm, skipRecurring: skipRecurringExpenseFromForm, stopRecurring: stopRecurringExpenseFromForm }}
        suppliers={suppliers}
        recurring={recurring}
        notice={notice}
        showAllocation={canSeeProfit}
        canViewReceipts={isAdminRole(profile.role)}
      />
    );
  } else {
    content = <BalanceView snapshot={await getBalanceSnapshot()} showHeader={!canSeeExpenses} />;
  }

  return (
    <section className="mx-auto grid min-w-0 w-full max-w-6xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      {canSeeExpenses ? (
        <>
          <PageHeader title="Balance" subtitle={canSeeProfit ? "Cobros, utilidad y gastos" : "Cobros y gastos"} />
          {tabControl}
        </>
      ) : null}
      {content}
    </section>
  );
}
