"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
import { computeHistoricalCommissionCents, computeUnitPriceCents } from "@/features/historical/domain";
import type { AssistantSource } from "@/features/assistant/service";
import { formatCents } from "@/features/quotes/lib/format";
import { ITEM_TYPE_LABELS } from "@/features/historical/types";
import { Button } from "@/components/ui/button";

interface SourcePanelProps {
  source: AssistantSource;
}

/**
 * Expandable panel showing the original captured item content and its work
 * context, plus the derived values (real unit price, generated commission).
 */
export function SourcePanel({ source }: SourcePanelProps) {
  const [open, setOpen] = React.useState(false);

  if (source.provenance === "completed-work") {
    const vehicle = [source.brand, source.model].filter(Boolean).join(" ") || "Sin unidad";
    return (
      <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)]">
        <Button type="button" variant="ghost" size="sm" className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          <span className="min-w-0 flex-1 truncate text-sm"><span className="font-semibold text-[var(--color-text-main)]">Trabajo completado</span><span className="text-[var(--color-text-muted)]"> — {source.description}</span></span>
          <span className="text-[var(--color-text-muted)]" aria-hidden="true">{open ? <Icon name="chevron-down" className="h-4 w-4" /> : <Icon name="chevron-right" className="h-4 w-4" />}</span>
        </Button>
        {open ? <dl className="space-y-1.5 border-t border-[var(--color-border-light)] px-3 py-3 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-[var(--color-text-muted)]">Orden completada</dt><dd className="text-right font-medium">{source.workOrderNumber}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-[var(--color-text-muted)]">Fecha</dt><dd className="text-right font-medium">{source.completedAt}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-[var(--color-text-muted)]">Unidad</dt><dd className="text-right font-medium">{vehicle}{source.plate ? ` (${source.plate})` : ""}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-[var(--color-text-muted)]">Responsable</dt><dd className="text-right font-medium">{source.responsibleWorker}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-[var(--color-text-muted)]">Concepto actual</dt><dd className="text-right font-medium">{formatCents(source.itemTotalCents)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-[var(--color-text-muted)]">Ingreso generado</dt><dd className="text-right font-medium">{formatCents(source.currentQuoteTotalCents)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-[var(--color-text-muted)]">Comisión generada</dt><dd className="text-right font-medium">{formatCents(source.generatedCommissionCents)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-[var(--color-text-muted)]">Similitud</dt><dd className="text-right font-medium">{Math.round(source.similarity * 100)}%</dd></div>
        </dl> : null}
      </div>
    );
  }

  const unitPrice = computeUnitPriceCents(
    source.type,
    source.quantity,
    source.customerPriceCents,
    source.isKit,
  );
  const commission = computeHistoricalCommissionCents(source.payrollBaseCents, source.ratePercent);
  const vehicle = [source.brand, source.model].filter(Boolean).join(" ") || "Sin unidad";

  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)]">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="min-w-0 flex-1 truncate text-sm">
          <span className="font-semibold text-[var(--color-text-main)]">
            Historial importado — {ITEM_TYPE_LABELS[source.type]}
          </span>
          <span className="text-[var(--color-text-muted)]"> — {source.description}</span>
        </span>
        <span className="text-[var(--color-text-muted)]" aria-hidden="true">
          {open ? <Icon name="chevron-down" className="h-4 w-4" /> : <Icon name="chevron-right" className="h-4 w-4" />}
        </span>
      </Button>

      {open ? (
        <dl className="space-y-1.5 border-t border-[var(--color-border-light)] px-3 py-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--color-text-muted)]">Trabajo</dt>
            <dd className="text-right font-medium">{source.workRef}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--color-text-muted)]">Fecha</dt>
            <dd className="text-right font-medium">{source.workDate ?? "Sin fecha"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--color-text-muted)]">Cliente / unidad</dt>
            <dd className="text-right font-medium">
              {source.customerName ?? "Sin cliente"} · {vehicle}
              {source.plate ? ` (${source.plate})` : ""}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--color-text-muted)]">Maestro</dt>
            <dd className="text-right font-medium">{source.masterName ?? "Sin maestro"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--color-text-muted)]">Línea original</dt>
            <dd className="text-right font-medium">
              {source.quantity != null
                ? `${source.quantity} × ${formatCents(source.customerPriceCents)}`
                : formatCents(source.customerPriceCents)}
            </dd>
          </div>
          {source.quantity != null ? (
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--color-text-muted)]">
                Unitario {source.isKit ? "(kit, no se divide)" : "derivado"}
              </dt>
              <dd className="text-right font-medium">{formatCents(unitPrice)}</dd>
            </div>
          ) : null}
          {source.payrollBaseCents != null ? (
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--color-text-muted)]">Base taller</dt>
              <dd className="text-right font-medium">{formatCents(source.payrollBaseCents)}</dd>
            </div>
          ) : null}
          {source.ratePercent != null ? (
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--color-text-muted)]">Comisión generada</dt>
              <dd className="text-right font-medium">
                {formatCents(commission)} ({source.ratePercent}%)
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--color-text-muted)]">Similitud</dt>
            <dd className="text-right font-medium">{Math.round(source.similarity * 100)}%</dd>
          </div>
        </dl>
      ) : null}
    </div>
  );
}
