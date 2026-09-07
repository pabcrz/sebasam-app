import type { HistoricalProvider } from "./provider";
import { importHistoricalPayload, type HistoricalImportReport } from "./importer";
import {
  aggregateHistoricalItems,
  matchHistoricalItems,
  type AggregateHistoricalItemsInput,
  type HistoricalAggregateRow,
  type HistoricalMatchSource,
  type MatchHistoricalItemsInput,
} from "./repository";

/** Imports a batch from the UI or CLI (dry-run supported). */
export async function importHistoricalBatch(
  payload: unknown,
  options: { dryRun?: boolean; provider?: HistoricalProvider },
): Promise<HistoricalImportReport> {
  return importHistoricalPayload({ payload, dryRun: options.dryRun, provider: options.provider });
}

/** Semantic search over item embeddings for the assistant. */
export async function semanticSearchHistoricalItems(
  input: MatchHistoricalItemsInput,
): Promise<HistoricalMatchSource[]> {
  return matchHistoricalItems(input);
}

/** Exact SQL aggregation over real columns for the assistant. */
export async function aggregateHistoricalItemsForAssistant(
  input: AggregateHistoricalItemsInput,
): Promise<HistoricalAggregateRow[]> {
  return aggregateHistoricalItems(input);
}