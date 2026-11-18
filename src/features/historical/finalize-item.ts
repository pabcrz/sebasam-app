import { createHash } from "node:crypto";
import type { QuoteItemType } from "@/generated/prisma/enums";
import type { NormalizedHistoricalItem } from "./types";
import { buildItemEmbeddingText, type EmbeddingTextContext } from "./domain";

/** Stable idempotency hash scoped to one batch, work, and item. */
export function computeItemContentHash(
  batchId: string,
  workRef: string,
  item: {
    type: QuoteItemType;
    description: string;
    quantity: number | null;
    customerPriceCents: number | null;
    payrollBaseCents: number | null;
    ratePercent: number | null;
    includeInPayroll: boolean;
    isKit: boolean;
  },
): string {
  const canonical = JSON.stringify({
    batchId,
    workRef,
    type: item.type,
    description: item.description.trim().toLowerCase(),
    quantity: item.quantity ?? null,
    customerPriceCents: item.customerPriceCents ?? null,
    payrollBaseCents: item.payrollBaseCents ?? null,
    ratePercent: item.ratePercent ?? null,
    includeInPayroll: item.includeInPayroll,
    isKit: item.isKit,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

/** Adds the batch/work identity, hash, and embedding text to a normalized item. */
export function finalizeHistoricalItem(
  item: NormalizedHistoricalItem,
  batchId: string,
  workRef: string,
  workContext: EmbeddingTextContext,
): NormalizedHistoricalItem {
  return {
    ...item,
    contentHash: computeItemContentHash(batchId, workRef, item),
    embeddingText: buildItemEmbeddingText(workContext, item),
  };
}
