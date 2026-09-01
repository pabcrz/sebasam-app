"use client";

import { useState } from "react";
import { Boxes, CheckCircle2, CircleDollarSign, Coins, TrendingUp } from "lucide-react";
import { Card, MetricCardGroup, StatCard, Tabs } from "@/components/ui";
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
  week: "Esta semana",
  month: "Este mes",
  year: "Este año",
};

export function KpiPeriodMetrics({ kpis }: KpiPeriodMetricsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriodKey>("week");
  const activeMetrics = kpis[selectedPeriod];

  return (
    <Card className="p-0 shadow-sm">
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
              <TrendingUp className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-[var(--color-text-main)]">Rendimiento Operativo y Cobranza</h2>
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Período: <span className="font-medium text-[var(--color-text-main)]">{activeMetrics.rangeLabel}</span>
            </p>
          </div>
        }
        headerClassName="flex flex-col gap-4 border-b border-[var(--color-border-light)] p-[var(--space-md)] sm:flex-row sm:items-center sm:justify-between"
        tabListClassName="self-start sm:self-auto"
        panelContainerClassName="p-[var(--space-md)] pt-6"
      />
    </Card>
  );
}

function PeriodMetricCards({ metrics }: { metrics: PeriodMetrics }) {
  return (
    <>
      <MetricCardGroup columns={4}>
        <StatCard
          label="Trabajos Finalizados"
          value={metrics.completedWorkOrdersCount}
          numericRole="count"
          description="Órdenes completadas en el período"
          icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
          iconVariant="success"
        />
        <StatCard
          label="Mano de Obra"
          value={formatCents(metrics.completedLaborBilledCents)}
          numericRole="currency"
          description="Mano de obra finalizada facturada"
          icon={<Coins className="h-4 w-4" aria-hidden="true" />}
          iconVariant="info"
        />
        <StatCard
          label="Materiales y Refacciones"
          value={formatCents(metrics.completedMaterialsBilledCents)}
          numericRole="currency"
          description="Materiales y repuestos finalizados"
          icon={<Boxes className="h-4 w-4" aria-hidden="true" />}
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
              pago{metrics.collectedPaymentsCount === 1 ? "" : "s"} registrado
              {metrics.collectedPaymentsCount === 1 ? "" : "s"}
            </>
          }
          icon={<CircleDollarSign className="h-4 w-4" aria-hidden="true" />}
          iconVariant="success"
        />
      </MetricCardGroup>
      <p className="mt-4 text-right text-[11px] text-[var(--color-text-muted)] italic">
        * Los cobros se agrupan según su fecha de registro en el sistema.
      </p>
    </>
  );
}
