import { expensesToCsv } from "@/features/balance/expenses/csv";
import { listExpensesForMonth } from "@/features/balance/expenses/queries";

export const dynamic = "force-dynamic";

/** Expenses of a month (?month=YYYY-MM) as CSV, for whoever registers expenses. */
export async function GET(request: Request) {
  let result;
  try {
    result = await listExpensesForMonth(new URL(request.url).searchParams.get("month") ?? undefined);
  } catch {
    return new Response("No autorizado", { status: 403 });
  }
  return new Response(expensesToCsv(result.expenses), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gastos-${result.period.month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
