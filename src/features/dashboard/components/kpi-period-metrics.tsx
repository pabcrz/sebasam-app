"use client";

import { useState } from "react";
import { Boxes, CheckCircle2, CircleDollarSign, Coins, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCardGroup } from "@/components/ui/metric-card-group";
import { StatCard } from "@/components/ui/stat-card";
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
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--color-border-light)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
            <CardTitle as="h2" className="text-lg font-semibold text-[var(--color-text-main)]">
              Rendimiento Operativo y Cobranza
            </CardTitle>
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Período: <span className="font-medium text-[var(--color-text-main)]">{activeMetrics.rangeLabel}</span>
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div
          role="tablist"
          aria-label="Seleccionar período de métricas"
          className="inline-flex rounded-[var(--radius-sm)] bg-[var(--color-bg-soft)] p-1"
        >
          {(["week", "month", "year"] as DashboardPeriodKey[]).map((periodKey) => {
            const isSelected = selectedPeriod === periodKey;
            return (
              <button
                key={periodKey}
                role="tab"
                type="button"
                aria-selected={isSelected}
                onClick={() => setSelectedPeriod(periodKey)}
                className={`rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
                  isSelected
                    ? "bg-[var(--color-surface)] text-[var(--color-text-main)] shadow-xs"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                }`}
              >
                {PERIOD_LABELS[periodKey]}
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <MetricCardGroup columns={4}>
          {/* Completed Work Orders */}
          <StatCard
            label="Trabajos Finalizados"
            value={activeMetrics.completedWorkOrdersCount}
            numericRole="count"
            description="Órdenes completadas en el período"
            icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
            iconVariant="success"
          />

          {/* Labor Billed */}
          <StatCard
            label="Mano de Obra"
            value={formatCents(activeMetrics.completedLaborBilledCents)}
            numericRole="currency"
            description="Mano de obra finalizada facturada"
            icon={<Coins className="h-4 w-4" aria-hidden="true" />}
            iconVariant="info"
          />

          {/* Materials & Refacciones */}
          <StatCard
            label="Materiales y Refacciones"
            value={formatCents(activeMetrics.completedMaterialsBilledCents)}
            numericRole="currency"
            description="Materiales y repuestos finalizados"
            icon={<Boxes className="h-4 w-4" aria-hidden="true" />}
            iconVariant="primary"
          />

          {/* Payments Collected */}
          <StatCard
            label="Cobros Recibidos"
            value={formatCents(activeMetrics.collectedPaymentsTotalCents)}
            numericRole="currency"
            valueClassName="text-[var(--color-status-success)]"
            description={
              <>
                <span data-numeric-role="supporting-count" className="font-medium tabular-nums">
                  {activeMetrics.collectedPaymentsCount}
                </span>{" "}
                pago{activeMetrics.collectedPaymentsCount === 1 ? "" : "s"} registrado
                {activeMetrics.collectedPaymentsCount === 1 ? "" : "s"}
              </>
            }
            icon={<CircleDollarSign className="h-4 w-4" aria-hidden="true" />}
            iconVariant="success"
          />
        </MetricCardGroup>

        <p className="mt-4 text-right text-[11px] text-[var(--color-text-muted)] italic">
          * Los cobros se agrupan según su fecha de registro en el sistema.
        </p>
      </CardContent>
    </Card>
  );
}
