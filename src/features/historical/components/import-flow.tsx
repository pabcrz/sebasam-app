"use client";

import * as React from "react";
import { checkHistoricalDuplicatesAction, importHistoricalBatchAction } from "../actions";
import type { HistoricalImportReport } from "../importer";
import { historicalBatchSchema } from "../schemas";
import {
  draftToPayload,
  payloadToDraft,
  resolveMasterId,
  validateDraftWork,
  type DraftPayload,
} from "./import-draft";
import { ImportConfirmStep } from "./import-confirm-step";
import { ImportPasteStep } from "./import-paste-step";
import { ImportReviewStep } from "./import-review-step";

type Step = "paste" | "review" | "confirm";

interface ImportFlowProps {
  masters: Array<{ id: string; displayName: string }>;
}

/**
 * Mobile-first full-page import flow: paste/upload → editable review →
 * confirm. Corrections happen in forms, never by editing raw JSON.
 */
export function ImportFlow({ masters }: ImportFlowProps) {
  const [step, setStep] = React.useState<Step>("paste");
  const [rawText, setRawText] = React.useState("");
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<DraftPayload | null>(null);
  const [workErrors, setWorkErrors] = React.useState<Record<string, string[]>>({});
  const [duplicateRefs, setDuplicateRefs] = React.useState<string[] | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [report, setReport] = React.useState<HistoricalImportReport | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const analyze = () => {
    setParseError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      setParseError("El texto no es JSON válido. Revisá el formato y volvé a intentar.");
      return;
    }

    // Structural checks only; per-work rules are validated in the review step
    // so every work's issues can be corrected in forms.
    const record = parsed as { schemaVersion?: unknown; batch?: unknown; works?: unknown };
    if (record.schemaVersion !== 2) {
      setParseError(`schemaVersion debe ser 2 (recibido: ${String(record.schemaVersion ?? "ninguno")}).`);
      return;
    }
    const batchParsed = historicalBatchSchema.safeParse(record.batch);
    if (!batchParsed.success) {
      setParseError("El lote no es válido: falta un id y/o una fuente (voice | text | excel).");
      return;
    }
    if (!Array.isArray(record.works) || record.works.length === 0) {
      setParseError("El archivo debe contener al menos un trabajo (works).");
      return;
    }

    const nextDraft = payloadToDraft(record as Parameters<typeof payloadToDraft>[0]);
    setDraft(resolveDraftMasters(nextDraft, masters));
    setWorkErrors(validateAllWorks(nextDraft));
    setStep("review");
  };

  const canContinue =
    draft !== null &&
    draft.works.length > 0 &&
    Object.values(workErrors).every((issues) => issues.length === 0);

  const handleDraftChange = (next: DraftPayload) => {
    const withResolved = resolveDraftMasters(next, masters);
    setDraft(withResolved);
    setWorkErrors(validateAllWorks(withResolved));
  };

  const enterConfirm = () => {
    setDuplicateRefs(null);
    setReport(null);
    setActionError(null);
    setStep("confirm");
  };

  const confirm = async () => {
    if (!draft) return;
    setBusy(true);
    setActionError(null);
    try {
      const result = await importHistoricalBatchAction(draftToPayload(draft));
      if (result.ok) {
        setReport(result.report);
      } else {
        setActionError(result.error);
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Ocurrió un error al importar.");
    } finally {
      setBusy(false);
    }
  };

  // Duplicate check when entering the confirm step.
  React.useEffect(() => {
    if (step !== "confirm" || !draft) return;
    let cancelled = false;
    checkHistoricalDuplicatesAction(draft.batch.id)
      .then((result) => {
        if (!cancelled) setDuplicateRefs(result.refs);
      })
      .catch(() => {
        if (!cancelled) setDuplicateRefs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [step, draft]);

  const reset = () => {
    setStep("paste");
    setRawText("");
    setFileName(null);
    setParseError(null);
    setDraft(null);
    setWorkErrors({});
    setDuplicateRefs(null);
    setReport(null);
    setActionError(null);
  };

  if (step === "paste" || draft === null) {
    return (
      <ImportPasteStep
        rawText={rawText}
        fileName={fileName}
        error={parseError}
        onRawTextChange={setRawText}
        onFile={(text, name) => {
          setRawText(text);
          setFileName(name);
        }}
        onAnalyze={analyze}
      />
    );
  }

  if (step === "review") {
    return (
      <ImportReviewStep
        draft={draft}
        masters={masters}
        workErrors={workErrors}
        onDraftChange={handleDraftChange}
        onBack={() => setStep("paste")}
        onContinue={enterConfirm}
        canContinue={canContinue}
      />
    );
  }

  return (
    <ImportConfirmStep
      draft={draft}
      duplicateRefs={duplicateRefs}
      busy={busy}
      report={report}
      actionError={actionError}
      onConfirm={confirm}
      onBack={() => setStep("review")}
      onReset={reset}
    />
  );
}

function validateAllWorks(draft: DraftPayload): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const work of draft.works) {
    errors[work.key] = validateDraftWork(work);
  }
  return errors;
}

/** Resolves master profiles by exact displayName when unambiguous. */
function resolveDraftMasters(
  draft: DraftPayload,
  masters: Array<{ id: string; displayName: string }>,
): DraftPayload {
  return {
    ...draft,
    works: draft.works.map((work) => ({
      ...work,
      masterId: work.masterId ?? resolveMasterId(work.master, masters),
    })),
  };
}