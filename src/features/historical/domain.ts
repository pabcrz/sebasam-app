import { createHash } from "node:crypto";
import { QuoteItemType } from "@prisma/client";
import {
  computeCommissionCents,
  detectLaborCategory,
  getDefaultLaborRate,
} from "@/features/payroll/domain";
import { formatCents } from "@/features/quotes/lib/format";
import type { NormalizedHistoricalItem, RawHistoricalItem } from "./types";

/**
 * Converts a peso amount (line total, decimal) to integer cents.
 * Money is always stored and computed in integer cents.
 */
export function pesosToCents(pesos: number): number {
  return Math.round(pesos * 100);
}

/**
 * A concept is part of payroll when it is LABOR (always commissionable, same
 * semantics as the payroll domain) or an OTHER concept explicitly opted in.
 */
export function isPayrollConcept(type: QuoteItemType, includeInPayroll: boolean): boolean {
  if (type === QuoteItemType.LABOR) return true;
  return type === QuoteItemType.OTHER && includeInPayroll;
}

/**
 * A concept carries quantity (material/refacción, and OTHER outside payroll).
 * LABOR and payroll-OTHER are line totals without quantity.
 */
export function hasQuantityConcept(type: QuoteItemType, includeInPayroll: boolean): boolean {
  return !isPayrollConcept(type, includeInPayroll);
}

/**
 * A kit is never divided: when the description mentions "kit" or the flag is
 * set, the line total IS the unit price.
 */
export function detectKit(description: string, isKit: boolean): boolean {
  return isKit || /\bkit\b/i.test(description);
}

/**
 * Resolves the commission percentage: explicit override wins; otherwise the
 * payroll default derived from the description (50 general / 40 welding).
 * Returns null when the concept is not a payroll concept.
 */
export function resolveRatePercent(
  type: QuoteItemType,
  description: string,
  includeInPayroll: boolean,
  explicitRate: number | null,
): number | null {
  if (!isPayrollConcept(type, includeInPayroll)) return null;
  if (explicitRate != null) return explicitRate;
  return getDefaultLaborRate(detectLaborCategory(description));
}

/**
 * Derives the real per-piece price for parts: line total ÷ quantity.
 * Kits and labor are never divided (kit unit price = line total; labor has no
 * quantity). Returns null when not derivable.
 */
export function computeUnitPriceCents(
  type: QuoteItemType,
  quantity: number | null,
  customerPriceCents: number | null,
  isKit: boolean,
): number | null {
  if (isKit) return customerPriceCents;
  if (quantity == null || quantity <= 0 || customerPriceCents == null) return null;
  return Math.round(customerPriceCents / quantity);
}

/**
 * Commission is never stored: it is derived from the payroll base and the
 * stored rate at query time. Null when either input is unknown.
 */
export function computeHistoricalCommissionCents(
  payrollBaseCents: number | null,
  ratePercent: number | null,
): number | null {
  if (payrollBaseCents == null || ratePercent == null) return null;
  return computeCommissionCents(payrollBaseCents, ratePercent);
}

/**
 * Stable content hash for idempotency. It includes the batch and work ref so
 * identical concepts in different works never collide on the global unique
 * constraint, while an accidentally repeated line inside one work is detected.
 */
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

export interface EmbeddingTextContext {
  workRef: string;
  customerName: string | null;
  plate: string | null;
  brand: string | null;
  model: string | null;
  masterName: string | null;
}

/**
 * Builds the Spanish text embedded per item so semantic search can match
 * questions like "cuánto cobramos por cambiar bujes".
 */
export function buildItemEmbeddingText(
  work: EmbeddingTextContext,
  item: {
    type: QuoteItemType;
    description: string;
    quantity: number | null;
    customerPriceCents: number | null;
    payrollBaseCents: number | null;
    ratePercent: number | null;
    isKit: boolean;
  },
): string {
  const vehicle = [work.brand, work.model].filter(Boolean).join(" ");
  const parts = [
    `Trabajo ${work.workRef}`,
    work.customerName ? `Cliente ${work.customerName}` : "",
    vehicle || "",
    work.plate ? `Placas ${work.plate}` : "",
    work.masterName ? `Maestro ${work.masterName}` : "",
    `${item.type}: ${item.description}`,
    item.quantity != null ? `Cantidad ${item.quantity}` : "",
    item.customerPriceCents != null ? `Importe ${formatCents(item.customerPriceCents)}` : "",
    item.payrollBaseCents != null ? `Taller ${formatCents(item.payrollBaseCents)}` : "",
    item.ratePercent != null ? `${item.ratePercent}%` : "",
    item.isKit ? "kit" : "",
  ].filter((part) => part !== "");
  return parts.join(". ");
}

/** Normalizes a schema-valid raw item into its cents-based storage shape. */
export function normalizeHistoricalItem(
  raw: RawHistoricalItem,
  sortOrder: number,
): NormalizedHistoricalItem {
  const type = raw.type;
  const includeInPayroll = raw.includeInPayroll ?? false;
  const isKit = detectKit(raw.description, raw.isKit ?? false);
  const quantity = raw.quantity ?? null;
  const customerPriceCents = raw.customerPrice != null ? pesosToCents(raw.customerPrice) : null;
  const payrollBaseCents = raw.payrollBase != null ? pesosToCents(raw.payrollBase) : null;
  const ratePercent = resolveRatePercent(type, raw.description, includeInPayroll, raw.ratePercent ?? null);

  return {
    type,
    description: raw.description,
    quantity,
    customerPriceCents,
    payrollBaseCents,
    ratePercent,
    includeInPayroll,
    isKit,
    sortOrder,
    contentHash: "",
    unitPriceCents: computeUnitPriceCents(type, quantity, customerPriceCents, isKit),
    commissionCents: computeHistoricalCommissionCents(payrollBaseCents, ratePercent),
    embeddingText: "",
    embedding: [],
    metadata: {},
  };
}

/**
 * Applies the batch/work identity to a normalized item: computes the final
 * content hash (batch + work ref) and the embedding text.
 */
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