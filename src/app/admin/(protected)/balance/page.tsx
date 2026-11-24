import type { Metadata } from "next";
import { PageHeader, SegmentedControl } from "@/components/ui";
import { BalanceView } from "@/features/balance/components/balance-view";
import { ExpensesView } from "@/features/balance/components/expenses-view";
import { ProfitView, type ProfitViewKey } from "@/features/balance/components/profit-view";
import { createExpenseFromForm, deleteExpenseFromForm, updateExpenseFromForm } from "@/features/balance/expenses/actions";
import { listExpensesForMonth } from "@/features/balance/expenses/queries";
import { getBalanceSnapshot } from "@/features/balance/queries";
import { getProfitSnapshot } from "@/features/balance/profit-queries";
import { isAdminRole, requireProfileForPage } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Balance",
  description: "Ingresos cobrados, cuentas por cobrar, gastos y utilidad.",
};

type BalancePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const TABS = ["cobros", "utilidad", "gastos"] as const;
type Tab = (typeof TABS)[number];
const VIEWS: ProfitViewKey[] = ["general", "mano-de-obra", "refacciones"];

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const NOTICES: Array<[string, { tone: "success" | "danger"; text: string }]> = [
  ["created", { tone: "success", text: "Gasto registrado." }],
  ["updated", { tone: "success", text: "Gasto actualizado." }],
  ["deleted", { tone: "success", text: "Gasto eliminado." }],
  ["error", { tone: "danger", text: "Revisa los datos del gasto e intenta de nuevo." }],
];

export default async function BalancePage({ searchParams }: BalancePageProps) {
  const params = (await searchParams) ?? {};
  const { profile } = await requireProfileForPage();
  const canSeeProfit = isAdminRole(profile.role);

  const requestedTab = first(params.tab);
  const tab: Tab = canSeeProfit && TABS.includes(requestedTab as Tab) ? (requestedTab as Tab) : "cobros";
  const month = first(params.month);
  const requestedView = first(params.view);
  const view: ProfitViewKey = VIEWS.includes(requestedView as ProfitViewKey) ? (requestedView as ProfitViewKey) : "general";

  const hrefFor = (target: { tab?: Tab; month?: string | null; view?: ProfitViewKey }) => {
    const query = new URLSearchParams();
    const nextTab = target.tab ?? tab;
    if (nextTab !== "cobros") query.set("tab", nextTab);
    const nextMonth = target.month === undefined ? month : target.month;
    if (nextMonth) query.set("month", nextMonth);
    const nextView = target.view ?? view;
    if (nextTab === "utilidad" && nextView !== "general") query.set("view", nextView);
    const text = query.toString();
    return `/admin/balance${text ? `?${text}` : ""}`;
  };

  const tabControl = canSeeProfit ? (
    <SegmentedControl
      label="Secciones de Balance"
      value={tab}
      options={[
        { value: "cobros", label: "Cobros y saldos", href: hrefFor({ tab: "cobros" }) },
        { value: "utilidad", label: "Utilidad", href: hrefFor({ tab: "utilidad" }) },
        { value: "gastos", label: "Gastos", href: hrefFor({ tab: "gastos" }) },
      ]}
    />
  ) : null;

  let content: React.ReactNode;
  if (tab === "utilidad") {
    const snapshot = await getProfitSnapshot(month);
    content = (
      <ProfitView
        snapshot={snapshot}
        view={view}
        hrefFor={(change) => hrefFor({ tab: "utilidad", month: change.month, view: change.view })}
      />
    );
  } else if (tab === "gastos") {
    const { period, expenses } = await listExpensesForMonth(month);
    const notice = NOTICES.find(([key]) => first(params[key]))?.[1] ?? null;
    content = (
      <ExpensesView
        period={period}
        expenses={expenses}
        today={new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date())}
        hrefFor={(target) => hrefFor({ tab: "gastos", month: target })}
        actions={{ create: createExpenseFromForm, update: updateExpenseFromForm, remove: deleteExpenseFromForm }}
        notice={notice}
      />
    );
  } else {
    content = <BalanceView snapshot={await getBalanceSnapshot()} showHeader={!canSeeProfit} />;
  }

  return (
    <section className="mx-auto grid min-w-0 w-full max-w-6xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      {canSeeProfit ? (
        <>
          <PageHeader title="Balance" subtitle="Cobros, utilidad y gastos" />
          {tabControl}
        </>
      ) : null}
      {content}
    </section>
  );
}
