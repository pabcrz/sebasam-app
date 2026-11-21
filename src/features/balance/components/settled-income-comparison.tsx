"use client";

import * as React from "react";
import { SectionLabel, SegmentedControl } from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import { INCOME_CATEGORY_LABELS, type BalancePeriodRow, type IncomeCategory } from "../domain";

type CategoryFilter = "all" | IncomeCategory;

const CATEGORIES = Object.keys(INCOME_CATEGORY_LABELS) as IncomeCategory[];

const filterOptions: Array<{ value: CategoryFilter; label: string }> = [
  { value: "all", label: "Todas" },
  ...CATEGORIES.map((category) => ({ value: category, label: INCOME_CATEGORY_LABELS[category] })),
];

export function SettledIncomeComparison({ periods }: { periods: BalancePeriodRow[] }) {
  const [filter, setFilter] = React.useState<CategoryFilter>("all");
  const columns = filter === "all" ? CATEGORIES : [filter];
  const cell = "px-3 py-2 text-right tabular-nums whitespace-nowrap";

  return (
    <section aria-labelledby="balance-settled-heading" className="grid min-w-0 gap-3">
      <SectionLabel id="balance-settled-heading">Notas liquidadas por categoría</SectionLabel>
      <SegmentedControl
        label="Categoría"
        value={filter}
        onValueChange={(value) => setFilter(value as CategoryFilter)}
        options={filterOptions}
      />

      <div className="overflow-x-auto rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <thead className="bg-[var(--color-bg-soft)] text-xs font-semibold text-[var(--color-text-muted)]">
            <tr>
              <th scope="col" className="px-3 py-2 text-left">Periodo</th>
              {columns.map((category) => (
                <th key={category} scope="col" className="px-3 py-2 text-right">{INCOME_CATEGORY_LABELS[category]}</th>
              ))}
              {filter === "all" ? <th scope="col" className="px-3 py-2 text-right">Total facturado</th> : null}
              <th scope="col" className="px-3 py-2 text-right">CxC al cierre (no verificada)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-light)]">
            {[...periods].reverse().map((row) => (
              <tr key={row.label}>
                <th scope="row" className="px-3 py-2 text-left font-medium text-[var(--color-text-main)]">{row.label}</th>
                {columns.map((category) => (
                  <td key={category} className={cell}>{formatCents(row.settledBilled[category])}</td>
                ))}
                {filter === "all" ? (
                  <td className={`${cell} font-semibold`}>
                    {formatCents(CATEGORIES.reduce((total, category) => total + row.settledBilled[category], 0))}
                  </td>
                ) : null}
                <td className={`${cell} text-[var(--color-text-muted)]`}>{formatCents(row.receivableAtCloseCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-1 text-xs text-[var(--color-text-muted)]">
        <li>
          Importe facturado de las notas que quedaron liquidadas por completo, en el periodo en que se liquidaron. No es efectivo
          cobrado ni saldo por cobrar; los abonos parciales no se reparten entre categorías.
        </li>
        <li>
          CxC al cierre: reconstruida con los registros actuales. No está verificada porque no hay saldo de apertura ni cortes
          guardados.
        </li>
        <li>Semanas de lunes a domingo; meses y años de calendario; hora de la Ciudad de México.</li>
      </ul>
    </section>
  );
}
