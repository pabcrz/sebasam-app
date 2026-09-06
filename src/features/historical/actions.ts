"use server";

import { revalidatePath } from "next/cache";
import { requireOperationalRole } from "@/lib/auth/session";
import { ProviderError, createGeminiProvider } from "./provider";
import { HistoricalImportError, importHistoricalPayload, type HistoricalImportReport } from "./importer";
import { listExistingRefs } from "./repository";

const historicalPath = "/admin/historical";

export type ImportActionResult =
  | { ok: true; report: HistoricalImportReport }
  | { ok: false; error: string };

/**
 * Authoritative import entry point for the mobile flow. Validates the payload
 * again server-side, generates embeddings and saves every work inside its own
 * transaction. Never called with a dry run from the UI.
 */
export async function importHistoricalBatchAction(payload: unknown): Promise<ImportActionResult> {
  await requireOperationalRole();

  try {
    const provider = createGeminiProvider();
    const report = await importHistoricalPayload({ payload, dryRun: false, provider });
    revalidatePath(historicalPath);
    return { ok: true, report };
  } catch (error) {
    if (error instanceof ProviderError || error instanceof HistoricalImportError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

/** Returns the work refs already imported for a batch (confirm-step duplicate check). */
export async function checkHistoricalDuplicatesAction(batchId: string): Promise<{
  batchId: string;
  refs: string[];
}> {
  await requireOperationalRole();

  const refs = await listExistingRefs(batchId);
  return { batchId, refs: Array.from(refs) };
}