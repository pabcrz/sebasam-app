import type { ReactNode } from "react";
import { SegmentedControl, StatTile } from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import type { ProfitSnapshot } from "../profit-queries";
import type { InvoiceSplit } from "../profit";
import { MonthNavigator } from "./month-navigator";

export type ProfitViewKey = "general" | "mano-de-obra" | "refacciones" | "asignar";

const VIEW_OPTIONS: Array<{ value: ProfitViewKey; label: string }> = [
  { value: "general", label: "General" },
  { value: "mano-de-obra", label: "Mano de obra" },
  { value: "refacciones", label: "Refacciones" },
  { value: "asignar", label: "Asignar" },
];

type ProfitViewProps = {
  snapshot: ProfitSnapshot;
  view: ProfitViewKey;
  /** Link for another month and/or view, keeping the rest. */
  hrefFor: (change: { month?: string | null; view?: ProfitViewKey }) => string;
  /** The "Asignar" view: how each expense is split between the two accounts. */
  allocation?: ReactNode;
};

type Row = { label: string; cents: number; strong?: boolean; hint?: string; split?: InvoiceSplit };

function remainingTone(cents: number) {
  return cents < 0 ? "danger" : "success";
}

function FigureTable({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <table className="w-full border-collapse text-sm">
      <caption className="pb-2 text-left text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">{title}</caption>
      <tbody className="divide-y divide-[var(--color-border-light)] rounded-[var(--radius-md)] bg-[var(--color-surface)]">
        {rows.map((row) => (
          <tr key={row.label} className={row.strong ? "font-bold" : undefined}>
            <th scope="row" className="py-2 pl-3 pr-2 text-left font-[inherit]">
              {row.label}
              {row.hint ? <span className="block text-xs font-normal text-[var(--color-text-muted)]">{row.hint}</span> : null}
              {row.split ? (
                <span className="block text-xs font-normal tabular-nums text-[var(--color-text-muted)]" data-testid="invoice-split">
                  Con factura {formatCents(row.split.invoicedCents)} · Sin factura {formatCents(row.split.notInvoicedCents)}
                </span>
              ) : null}
            </th>
            <td className="whitespace-nowrap py-2 pl-2 pr-3 text-right tabular-nums">{formatCents(row.cents)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ProfitView({ snapshot, view, hrefFor, allocation }: ProfitViewProps) {
  const { period, summary } = snapshot;
  const { general, labor, parts, income } = summary;

  return (
    <section aria-labelledby="profit-heading" data-testid="profit-view" className="grid gap-4">
      <h2 id="profit-heading" className="sr-only">Utilidad</h2>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthNavigator period={period} hrefFor={(month) => hrefFor({ month })} />
        <SegmentedControl
          label="Vista de utilidad"
          value={view}
          options={VIEW_OPTIONS.map((option) => ({ ...option, href: hrefFor({ view: option.value }) }))}
        />
      </div>

      {view === "asignar" ? allocation : null}

      {view === "general" ? (
        <div className="grid gap-4" data-testid="profit-general">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Entró" value={formatCents(general.incomeCents)} numericRole="currency" description="Notas liquidadas en el mes, sin IVA" />
            <StatTile label="Se gastó" value={formatCents(general.spentCents)} numericRole="currency" tone="warning" description="Nómina calculada, gastos y compras" />
            <StatTile label="Queda" value={formatCents(general.remainingCents)} numericRole="currency" tone={remainingTone(general.remainingCents)} description="Entró menos se gastó" />
          </div>
          <FigureTable
            title="Lo que queda, por cuenta"
            rows={[
              { label: "Queda de mano de obra", cents: labor.remainingCents },
              { label: "Queda de refacciones y materiales", cents: parts.remainingCents },
              ...(income.otherCents > 0 ? [{ label: "Otros ingresos", cents: income.otherCents, hint: "Partidas de tipo «Otro»; fuera de ambas cuentas" }] : []),
              { label: "Queda en total", cents: general.remainingCents, strong: true },
            ]}
          />
          <FigureTable
            title="Detalle"
            rows={[
              { label: "Entró por mano de obra", cents: income.laborCents },
              { label: "Entró por refacciones y materiales", cents: income.partsCents },
              ...(income.otherCents > 0 ? [{ label: "Entró por otros", cents: income.otherCents }] : []),
              { label: "Comisiones de nómina", cents: general.payrollCents, hint: "Calculadas por el sistema de nómina" },
              { label: "Gastos y compras registrados", cents: general.expensesCents, split: general.expensesByInvoice },
            ]}
          />
        </div>
      ) : null}

      {view === "mano-de-obra" ? (
        <div className="grid gap-4" data-testid="profit-labor">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Entró" value={formatCents(labor.incomeCents)} numericRole="currency" description="Mano de obra de notas liquidadas" />
            <StatTile label="Se gastó" value={formatCents(labor.payrollCents + labor.expensesCents)} numericRole="currency" tone="warning" description="Nómina y gastos que le tocan" />
            <StatTile label="Queda" value={formatCents(labor.remainingCents)} numericRole="currency" tone={remainingTone(labor.remainingCents)} description="Lo que sobra de mano de obra" />
          </div>
          <p data-testid="labor-coverage" className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-4 text-sm shadow-[var(--shadow-card)]">
            {labor.coveragePercent === null
              ? "No hay costos de mano de obra en el mes."
              : labor.coveragePercent >= 100
                ? `La mano de obra cubre ${labor.coveragePercent} % de la nómina y los gastos que le tocan: se sostiene sola.`
                : `La mano de obra cubre ${labor.coveragePercent} % de la nómina y los gastos que le tocan. Faltan ${formatCents(-labor.remainingCents)}.`}
          </p>
          <FigureTable
            title="Detalle"
            rows={[
              { label: "Entró por mano de obra", cents: labor.incomeCents },
              { label: "Comisiones de nómina", cents: labor.payrollCents, hint: "Calculadas por el sistema de nómina" },
              { label: "Gastos que le tocan", cents: labor.expensesCents, split: labor.expensesByInvoice },
              { label: "Queda de mano de obra", cents: labor.remainingCents, strong: true },
            ]}
          />
        </div>
      ) : null}

      {view === "refacciones" ? (
        <div className="grid gap-4" data-testid="profit-parts">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Entró" value={formatCents(parts.incomeCents)} numericRole="currency" description="Refacciones y materiales de notas liquidadas" />
            <StatTile label="Se gastó" value={formatCents(parts.expensesCents)} numericRole="currency" tone="warning" description="Compras y su parte de gastos compartidos" />
            <StatTile label="Utilidad libre" value={formatCents(parts.remainingCents)} numericRole="currency" tone={remainingTone(parts.remainingCents)} description="No está comprometida a pagar renta ni luz" />
          </div>
          <FigureTable
            title="Detalle"
            rows={[
              { label: "Entró por refacciones y materiales", cents: parts.incomeCents },
              { label: "Compras y gastos que le tocan", cents: parts.expensesCents, split: parts.expensesByInvoice },
              { label: "Utilidad libre", cents: parts.remainingCents, strong: true },
            ]}
          />
        </div>
      ) : null}

      <div className="grid gap-1 text-xs text-[var(--color-text-muted)]" data-testid="profit-notes">
        <p>Cobrado en efectivo en {period.label}: <span className="font-semibold tabular-nums">{formatCents(summary.cashCollectedCents)}</span>. Puede diferir de «Entró» porque una nota cuenta cuando queda totalmente liquidada, y sus abonos pueden haber llegado en otros meses.</p>
        <p>Ingresos y gastos pueden caer en meses distintos (por ejemplo, una refacción comprada un mes y liquidada al siguiente). Es una aproximación: la utilidad exacta por trabajo requiere ligar cada compra a su nota.</p>
      </div>
    </section>
  );
}
