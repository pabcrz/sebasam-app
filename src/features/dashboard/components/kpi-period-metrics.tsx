"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { StatCard, Tabs } from "@/components/ui";
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
            <div className="flex items-center gap-2">
              <Icon name="trend-up" className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
              <h2 id="kpis-heading" className="text-lg font-semibold text-[var(--color-text-main)]">
                Resumen del período
              </h2>
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Período: <span className="font-medium text-[var(--color-text-main)]">{activeMetrics.rangeLabel}</span>
            </p>
          </div>
        }
        headerClassName="sticky top-0 z-10 flex flex-col gap-3 bg-[var(--background)]/95 backdrop-blur-xs py-2 pb-3 sm:flex-row sm:items-center sm:justify-between"
        tabListClassName="self-start sm:self-auto"
        panelContainerClassName="pt-2"
      />
    </section>
  );
}

function PeriodMetricCards({ metrics }: { metrics: PeriodMetrics }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Trabajos Finalizados"
          value={metrics.completedWorkOrdersCount}
          numericRole="count"
          description="Órdenes completadas"
          icon={<Icon name="check-circle" className="h-4 w-4" aria-hidden="true" />}
          iconVariant="success"
        />
        <StatCard
          label="Mano de Obra"
          value={formatCents(metrics.completedLaborBilledCents)}
          numericRole="currency"
          description="Facturada finalizada"
          icon={<Icon name="coins" className="h-4 w-4" aria-hidden="true" />}
          iconVariant="info"
        />
        <StatCard
          label="Materiales y Refacciones"
          value={formatCents(metrics.completedMaterialsBilledCents)}
          numericRole="currency"
          description="Materiales y repuestos"
          icon={<Icon name="boxes" className="h-4 w-4" aria-hidden="true" />}
          iconVariant="primary"
        />
        <StatCard
          label="Cobros Recibidos"
          value={formatCents(metrics.collectedPaymentsTotalCents)}
          numericRole="currency"
          valueClassName="text-[var(--color-status-success)]"
          description={
            <>
              <span data-numeric-role="supporting-count" className="font-medium tabular-nums">
                {metrics.collectedPaymentsCount}
              </span>{" "}
              pago{metrics.collectedPaymentsCount === 1 ? "" : "s"}
            </>
          }
          icon={<Icon name="money" className="h-4 w-4" aria-hidden="true" />}
          iconVariant="success"
        />
      </div>
      <p className="mt-3 text-right text-[11px] text-[var(--color-text-muted)] italic">
        * Los cobros se agrupan según su fecha de registro en el sistema.
      </p>
    </>
  );
}
