import type { HistoricalProvider } from "./provider";
import { finalizeHistoricalItem, normalizeHistoricalItem } from "./domain";
import { insertWorkWithItems, listExistingRefs } from "./repository";
import { formatZodIssues, historicalBatchSchema, historicalWorkSchema } from "./schemas";

export class HistoricalImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HistoricalImportError";
  }
}

export interface ImportWorkResult {
  ref: string;
  status: "imported" | "duplicate" | "error";
  error: string | null;
  itemsImported: number;
  itemsDuplicated: number;
}

export interface HistoricalImportReport {
  schemaVersion: number | null;
  batchId: string | null;
  source: string | null;
  parseError: string | null;
  detectedWorks: number;
  validWorks: number;
  duplicateWorks: number;
  errorWorks: number;
  importedWorks: number;
  importedItems: number;
  duplicatedItems: number;
  distinctItemTypes: string[];
  distinctDescriptions: string[];
  works: ImportWorkResult[];
}

export interface ImportHistoricalInput {
  /** Raw JSON payload (schemaVersion 2). Validated and normalized here. */
  payload: unknown;
  /** Dry-run reports everything but never inserts nor calls the provider. */
  dryRun?: boolean;
  /** Required when not a dry run. */
  provider?: HistoricalProvider;
  /** Preloaded (batchId, workRef) pairs; loaded from the DB when omitted. */
  existingRefs?: Set<string>;
}

function emptyReport(): HistoricalImportReport {
  return {
    schemaVersion: null,
    batchId: null,
    source: null,
    parseError: null,
    detectedWorks: 0,
    validWorks: 0,
    duplicateWorks: 0,
    errorWorks: 0,
    importedWorks: 0,
    importedItems: 0,
    duplicatedItems: 0,
    distinctItemTypes: [],
    distinctDescriptions: [],
    works: [],
  };
}

/**
 * Validates and imports a schemaVersion 2 payload.
 *
 * - One work is saved completely inside one transaction; a failing item fails
 *   the whole work (no half-saved works, no orphan concepts).
 * - Idempotency: works already present for the batch (batchId + workRef) are
 *   skipped as duplicates; repeated items inside a work (same content hash)
 *   are skipped as item duplicates.
 * - Items are embedded per item with the provider (skipped on dry run).
 */
export async function importHistoricalPayload(
  input: ImportHistoricalInput,
): Promise<HistoricalImportReport> {
  if (!input.dryRun && !input.provider) {
    throw new HistoricalImportError(
      "Se requiere un provider para importar (GEMINI_API_KEY). Usá --dry-run para validar sin insertar.",
    );
  }

  const report = emptyReport();
  const batchParsed = historicalBatchSchema.safeParse(
    (input.payload as { batch?: unknown })?.batch,
  );

  if (!batchParsed.success) {
    report.parseError = formatZodIssues(batchParsed.error.issues).join("; ");
    return report;
  }

  const batch = batchParsed.data;
  report.batchId = batch.id;
  report.source = batch.source;

  const payload = input.payload as { schemaVersion?: unknown; works?: unknown };
  if (payload.schemaVersion !== 2) {
    report.parseError = `schemaVersion debe ser 2 (recibido: ${String(payload.schemaVersion ?? "ninguno")}).`;
    return report;
  }
  report.schemaVersion = 2;
  if (!Array.isArray(payload.works) || payload.works.length === 0) {
    report.parseError = "El archivo debe contener al menos un trabajo (works).";
    return report;
  }

  const existingRefs = input.existingRefs ?? (await listExistingRefs(batch.id));
  const seenItemHashes = new Set<string>();
  const distinctItemTypes = new Set<string>();
  const distinctDescriptions = new Set<string>();

  for (const rawWork of payload.works) {
    report.detectedWorks += 1;

    const workParsed = historicalWorkSchema.safeParse(rawWork);
    if (!workParsed.success) {
      report.errorWorks += 1;
      report.works.push({
        ref: typeof (rawWork as { ref?: unknown })?.ref === "string" ? String((rawWork as { ref: string }).ref) : "(sin referencia)",
        status: "error",
        error: formatZodIssues(workParsed.error.issues).join("; "),
        itemsImported: 0,
        itemsDuplicated: 0,
      });
      continue;
    }

    const work = workParsed.data;
    const workRef = work.ref;
    const workContext = {
      workRef,
      customerName: work.customer?.name ?? null,
      plate: work.customer?.plate ?? null,
      brand: work.customer?.brand ?? null,
      model: work.customer?.model ?? null,
      masterName: work.master ?? null,
    };

    const items = work.items.map((rawItem, index) => {
      const normalized = normalizeHistoricalItem(rawItem, index);
      return finalizeHistoricalItem(normalized, batch.id, workRef, workContext);
    });

    for (const item of items) {
      distinctItemTypes.add(item.type);
      distinctDescriptions.add(item.description);
    }

    if (existingRefs.has(workRef)) {
      report.duplicateWorks += 1;
      report.works.push({
        ref: workRef,
        status: "duplicate",
        error: null,
        itemsImported: 0,
        itemsDuplicated: 0,
      });
      continue;
    }

    report.validWorks += 1;

    if (input.dryRun) {
      report.works.push({
        ref: workRef,
        status: "imported",
        error: null,
        itemsImported: 0,
        itemsDuplicated: 0,
      });
      continue;
    }

    // Embed every item first; one failure fails the whole work so a work is
    // never saved with missing embeddings.
    const insertItems: typeof items = [];
    let duplicatedItems = 0;
    let embeddingError: string | null = null;
    for (const item of items) {
      if (seenItemHashes.has(item.contentHash)) {
        duplicatedItems += 1;
        continue;
      }
      try {
        const embedding = await input.provider!.embedText(item.embeddingText);
        seenItemHashes.add(item.contentHash);
        insertItems.push({ ...item, embedding });
      } catch (error) {
        embeddingError = `No se pudo generar el embedding de "${item.description}": ${error instanceof Error ? error.message : String(error)}`;
        break;
      }
    }

    if (embeddingError) {
      report.errorWorks += 1;
      report.works.push({
        ref: workRef,
        status: "error",
        error: embeddingError,
        itemsImported: 0,
        itemsDuplicated: 0,
      });
      continue;
    }

    try {
      await insertWorkWithItems(
        {
          batchId: batch.id,
          workRef,
          workDate: new Date(work.date),
          customerName: work.customer?.name ?? null,
          plate: work.customer?.plate ?? null,
          brand: work.customer?.brand ?? null,
          model: work.customer?.model ?? null,
          masterName: work.master ?? null,
          masterId: work.masterId ?? null,
          source: batch.source,
          items: insertItems,
        },
        insertItems,
      );

      report.importedWorks += 1;
      report.importedItems += insertItems.length;
      report.duplicatedItems += duplicatedItems;
      report.works.push({
        ref: workRef,
        status: "imported",
        error: null,
        itemsImported: insertItems.length,
        itemsDuplicated: duplicatedItems,
      });
    } catch (error) {
      report.errorWorks += 1;
      report.works.push({
        ref: workRef,
        status: "error",
        error: `No se pudo guardar el trabajo: ${error instanceof Error ? error.message : String(error)}`,
        itemsImported: 0,
        itemsDuplicated: 0,
      });
    }
  }

  report.distinctItemTypes = Array.from(distinctItemTypes).sort();
  report.distinctDescriptions = Array.from(distinctDescriptions).sort((a, b) => a.localeCompare(b, "es"));
  return report;
}