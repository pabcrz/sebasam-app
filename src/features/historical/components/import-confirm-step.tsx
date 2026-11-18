"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
import type { HistoricalImportReport } from "../importer";
import type { DraftPayload } from "./import-draft";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ImportConfirmStepProps {
  draft: DraftPayload;
  duplicateRefs: string[] | null;
  busy: boolean;
  report: HistoricalImportReport | null;
  actionError: string | null;
  onConfirm: () => void;
  onBack: () => void;
  onReset: () => void;
}

function dateRange(works: DraftPayload["works"]): string {
  const dates = works
    .map((work) => work.date)
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort();
  if (dates.length === 0) return "sin fechas";
  return `${dates[0]} → ${dates[dates.length - 1]}`;
}

/** Step 3: summary, possible duplicates and the explicit confirm button. */
export function ImportConfirmStep({
  draft,
  duplicateRefs,
  busy,
  report,
  actionError,
  onConfirm,
  onBack,
  onReset,
}: ImportConfirmStepProps) {
  const itemCount = draft.works.reduce((total, work) => total + work.items.length, 0);
  const duplicates = duplicateRefs ?? [];

  if (report) {
    return (
      <Card>
        <CardHeader>
          <CardTitle as="h2">Resultado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2 font-semibold text-[var(--color-text-main)]">
              <Icon name="check-circle" className="h-4 w-4 text-[var(--color-status-success)]" aria-hidden="true" />
              Trabajos importados: {report.importedWorks} · Conceptos: {report.importedItems}
            </p>
            {report.duplicateWorks > 0 || report.duplicatedItems > 0 ? (
              <p className="flex items-center gap-2 text-[var(--color-text-main)]">
                <Icon name="warning" className="h-4 w-4 text-[var(--color-status-warning)]" aria-hidden="true" />
                Duplicados: {report.duplicateWorks} trabajos · {report.duplicatedItems} conceptos
              </p>
            ) : null}
            {report.errorWorks > 0 ? (
              <p className="flex items-center gap-2 text-[var(--color-status-danger)]">
                <Icon name="x-circle" className="h-4 w-4" aria-hidden="true" />
                Con error: {report.errorWorks} trabajos
              </p>
            ) : null}
          </div>

          {report.works.length > 0 ? (
            <ul className="mt-4 space-y-1 text-sm">
              {report.works.map((work) => (
                <li key={work.ref} className="flex items-center justify-between gap-2">
                  <span className="font-medium text-[var(--color-text-main)]">{work.ref}</span>
                  <span className={work.status === "error" ? "text-[var(--color-status-danger)]" : "text-[var(--color-text-muted)]"}>
                    {work.status === "imported"
                      ? `importado (${work.itemsImported})`
                      : work.status === "duplicate"
                        ? "duplicado"
                        : work.error ?? "error"}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-6">
            <Button type="button" onClick={onReset} className="w-full">
              Importar otro lote
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Confirmar</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--color-text-muted)]">Lote</dt>
            <dd className="font-medium text-[var(--color-text-main)]">
              {draft.batch.id} · fuente: {draft.batch.source}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--color-text-muted)]">Trabajos</dt>
            <dd className="font-medium text-[var(--color-text-main)]">{draft.works.length}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--color-text-muted)]">Conceptos</dt>
            <dd className="font-medium text-[var(--color-text-main)]">{itemCount}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--color-text-muted)]">Fechas</dt>
            <dd className="font-medium text-[var(--color-text-main)]">{dateRange(draft.works)}</dd>
          </div>
        </dl>

        {duplicates.length > 0 ? (
          <div className="mt-4 rounded-[var(--radius-sm)] border border-[var(--color-status-warning)] bg-[var(--color-bg-soft)] p-3 text-sm" role="alert">
            <p className="flex items-center gap-2 font-semibold text-[var(--color-text-main)]">
              <Icon name="warning" className="h-4 w-4 text-[var(--color-status-warning)]" aria-hidden="true" />
              Posibles duplicados en este lote
            </p>
            <p className="mt-1 text-[var(--color-text-muted)]">
              Ya existen estos trabajos para el lote: {duplicates.join(", ")}. Se omitirán sin
              insertarse.
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--color-text-muted)]">
            Sin duplicados detectados para este lote.
          </p>
        )}

        {actionError ? (
          <p className="mt-3 text-sm text-[var(--color-status-danger)]" role="alert">
            {actionError}
          </p>
        ) : null}

        <div className="mt-6 flex justify-between gap-3">
          <Button type="button" variant="outline" onClick={onBack} disabled={busy}>
            Volver
          </Button>
          <Button type="button" onClick={onConfirm} disabled={busy} loading={busy}>
            Confirmar importación
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}