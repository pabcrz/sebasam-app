"use client";

import { useState } from "react";
import { SectionLabel, StatTile, Tabs } from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import type { DashboardPeriodKey, PeriodMetrics } from "../types";

interface KpiPeriodMetricsProps {
  kpis: {
    week: PeriodMetrics;
    month: PeriodMetrics;
    year: PeriodMetrics;
  };
}

const PERIOD_LABELS: Record<DashboardPeriodKey, string> = {
  week: "Semana",
  month: "Mes",
  year: "Año",
};

export function KpiPeriodMetrics({ kpis }: KpiPeriodMetricsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriodKey>("week");
  const activeMetrics = kpis[selectedPeriod];

  return (
    <section aria-labelledby="kpis-heading" className="w-full">
      <Tabs
        tabs={(["week", "month", "year"] as DashboardPeriodKey[]).map((periodKey) => ({
          value: periodKey,
          label: PERIOD_LABELS[periodKey],
          panel: <PeriodMetricCards metrics={kpis[periodKey]} />,
        }))}
        label="Seleccionar período de métricas"
        value={selectedPeriod}
        onValueChange={(value) => setSelectedPeriod(value as DashboardPeriodKey)}
        header={
          <div>
            <SectionLabel id="kpis-heading">Resumen</SectionLabel>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{activeMetrics.rangeLabel}</p>
          </div>
        }
        headerClassName="flex items-start justify-between gap-3 pb-3"
        tabListClassName="shrink-0"
        panelContainerClassName="pt-2"
      />
    </section>
  );
}

function PeriodMetricCards({ metrics }: { metrics: PeriodMetrics }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Trabajos finalizados"
          value={metrics.completedWorkOrdersCount}
          numericRole="count"
          description="Órdenes completadas"
        />
        <StatTile
          label="Mano de obra"
          value={formatCents(metrics.completedLaborBilledCents)}
          numericRole="currency"
          description="Facturada finalizada"
        />
        <StatTile
          label="Materiales y refacciones"
          value={formatCents(metrics.completedMaterialsBilledCents)}
          numericRole="currency"
          description="Materiales y repuestos"
        />
        <StatTile
          label="Cobros recibidos"
          value={formatCents(metrics.collectedPaymentsTotalCents)}
          numericRole="currency"
          tone="success"
          description={
            <>
              <span data-numeric-role="supporting-count" className="font-medium tabular-nums">
                {metrics.collectedPaymentsCount}
              </span>{" "}
              pago{metrics.collectedPaymentsCount === 1 ? "" : "s"}
            </>
          }
        />
      </div>
      <p className="mt-2 text-xs text-[var(--color-text-muted)]">Los cobros cuentan por su fecha de registro.</p>
    </>
  );
}
