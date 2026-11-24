import { SegmentedControl } from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import { COMPARISON_BAND, type ComparisonLevel, type ComparisonSeries } from "../profit";
import type { ComparisonSnapshot } from "../profit-queries";

const SERIES_OPTIONS: Array<{ value: ComparisonSeries; label: string }> = [
  { value: "todas", label: "Todas" },
  { value: "mano-de-obra", label: "Mano de obra" },
  { value: "refacciones", label: "Refacciones" },
];

const LEVEL_LABELS: Record<ComparisonLevel, string> = { fuerte: "Más fuerte", debil: "Más débil", tipico: "Típico" };

type ComparisonViewProps = {
  snapshot: ComparisonSnapshot;
  hrefFor: (series: ComparisonSeries) => string;
};

/** The last 12 months side by side: what came in, what share was labor, what was spent and how the month compares with the rest. A description, never a score or a forecast. */
export function ComparisonView({ snapshot, hrefFor }: ComparisonViewProps) {
  const { months, medianCents, totals, series } = snapshot;
  const band = Math.round(COMPARISON_BAND * 100);

  return (
    <section aria-labelledby="comparison-heading" data-testid="profit-comparison" className="grid gap-3">
      <h3 id="comparison-heading" className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Últimos 12 meses</h3>
      <SegmentedControl label="Qué comparar" value={series} options={SERIES_OPTIONS.map((option) => ({ ...option, href: hrefFor(option.value) }))} />

      <div className="overflow-x-auto rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-[var(--color-text-muted)]">
              <th scope="col" className="py-2 pl-3 pr-2 font-medium">Mes</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">Entró</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">% mano de obra</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">Gastos</th>
              <th scope="col" className="py-2 pl-2 pr-3 font-medium">Frente al resto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-light)]">
            {months.map((month) => (
              <tr key={month.month} data-testid="comparison-row">
                <th scope="row" className="py-2 pl-3 pr-2 text-left font-medium capitalize">{month.label}</th>
                <td className="px-2 py-2 text-right tabular-nums">{formatCents(month.valueCents)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{month.laborSharePercent === null ? "—" : `${month.laborSharePercent} %`}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatCents(month.expensesCents)}</td>
                <td className="py-2 pl-2 pr-3" data-testid="comparison-level">{month.level ? LEVEL_LABELS[month.level] : month.valueCents > 0 ? "—" : "Sin cobros"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <th scope="row" className="py-2 pl-3 pr-2 text-left">12 meses</th>
              <td className="px-2 py-2 text-right tabular-nums" data-testid="comparison-total">{formatCents(months.reduce((sum, month) => sum + month.valueCents, 0))}</td>
              <td />
              <td className="px-2 py-2 text-right tabular-nums">{formatCents(totals.expensesCents)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="grid gap-1 text-xs text-[var(--color-text-muted)]" data-testid="comparison-notes">
        {medianCents === null ? (
          <p>Todavía hay pocos meses con cobros para comparar (se necesitan al menos 3).</p>
        ) : (
          <p>«Frente al resto» compara cada mes con la mediana de los meses que tuvieron cobros ({formatCents(medianCents)}): más fuerte si la supera por más de {band} %, más débil si queda más de {band} % abajo y típico en medio. Es una descripción del pasado, no una calificación ni un pronóstico.</p>
        )}
        <p>«Entró» son notas totalmente liquidadas en el mes, sin IVA, con el total de la nota en el mes en que se liquida aunque hubiera abonos antes. «% mano de obra» es mano de obra entre mano de obra más refacciones; las partidas «Otro» cuentan como mano de obra.</p>
        <p>Los gastos no incluyen nómina. Los meses son calendario de la Ciudad de México. No se muestra la cuenta por cobrar de meses pasados porque no hay saldo inicial verificado: la de hoy está en Cobros y saldos.</p>
      </div>
    </section>
  );
}
