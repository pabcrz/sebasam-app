import type { QuoteItemType } from "@/generated/prisma/client";
import { historicalWorkSchema } from "../schemas";

/**
 * Editable draft representation of a pasted payload. Amounts stay in pesos as
 * strings so corrections happen in forms (never by editing raw JSON).
 */

export interface DraftItem {
  key: string;
  type: QuoteItemType;
  description: string;
  quantity: string;
  customerPrice: string;
  payrollBase: string;
  ratePercent: string;
  includeInPayroll: boolean;
  isKit: boolean;
}

export interface DraftWork {
  key: string;
  ref: string;
  date: string;
  customerName: string;
  plate: string;
  brand: string;
  model: string;
  master: string;
  /** uuid of a resolved existing UserProfile, when unambiguous. */
  masterId: string | null;
  items: DraftItem[];
}

export interface DraftBatch {
  id: string;
  source: "voice" | "text" | "excel";
}

export interface DraftPayload {
  batch: DraftBatch;
  works: DraftWork[];
}

let draftKey = 0;
function nextKey(prefix: string): string {
  draftKey += 1;
  return `${prefix}-${draftKey}`;
}

function toField(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

/** Converts a schema-valid payload into editable drafts. */
export function payloadToDraft(payload: {
  batch: DraftBatch;
  works: Array<{
    ref: string;
    date: string | Date;
    customer?: { name?: string | null; plate?: string | null; brand?: string | null; model?: string | null } | null;
    master?: string | null;
    masterId?: string | null;
    items: Array<{
      type: QuoteItemType;
      description: string;
      quantity?: number | null;
      customerPrice?: number | null;
      payrollBase?: number | null;
      ratePercent?: number | null;
      includeInPayroll?: boolean;
      isKit?: boolean;
    }>;
  }>;
}): DraftPayload {
  return {
    batch: { ...payload.batch },
    works: payload.works.map((work) => ({
      key: nextKey("work"),
      ref: work.ref,
      date: typeof work.date === "string" ? work.date : work.date.toISOString().slice(0, 10),
      customerName: work.customer?.name ?? "",
      plate: work.customer?.plate ?? "",
      brand: work.customer?.brand ?? "",
      model: work.customer?.model ?? "",
      master: work.master ?? "",
      masterId: work.masterId ?? null,
      items: work.items.map((item) => ({
        key: nextKey("item"),
        type: item.type,
        description: item.description,
        quantity: toField(item.quantity),
        customerPrice: toField(item.customerPrice),
        payrollBase: toField(item.payrollBase),
        ratePercent: toField(item.ratePercent),
        includeInPayroll: item.includeInPayroll ?? false,
        isKit: item.isKit ?? false,
      })),
    })),
  };
}

function optionalNumberField(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Rebuilds the schemaVersion 2 payload from the corrected drafts. */
export function draftToPayload(draft: DraftPayload): unknown {
  return {
    schemaVersion: 2,
    batch: { id: draft.batch.id, source: draft.batch.source },
    works: draft.works.map((work) => ({
      ref: work.ref,
      date: work.date,
      customer: {
        name: work.customerName.trim() || undefined,
        plate: work.plate.trim() || undefined,
        brand: work.brand.trim() || undefined,
        model: work.model.trim() || undefined,
      },
      master: work.master.trim() || undefined,
      masterId: work.masterId ?? undefined,
      items: work.items.map((item) => ({
        type: item.type,
        description: item.description,
        quantity: optionalNumberField(item.quantity),
        customerPrice: optionalNumberField(item.customerPrice),
        payrollBase: optionalNumberField(item.payrollBase),
        ratePercent:
          item.ratePercent.trim() === "" ? undefined : Number(item.ratePercent),
        includeInPayroll: item.includeInPayroll,
        isKit: item.isKit,
      })),
    })),
  };
}

/** Per-work validation of the current drafts (mirrors server-side rules). */
export function validateDraftWork(work: DraftWork): string[] {
  const payload = draftToPayload({ batch: { id: "validacion", source: "text" }, works: [work] });
  const parsed = historicalWorkSchema.safeParse(
    (payload as { works: unknown[] }).works[0],
  );
  if (parsed.success) return [];
  return parsed.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return `${path}${issue.message}`;
  });
}

/** Resolves the master profile by exact displayName when unambiguous. */
export function resolveMasterId(
  masterText: string,
  masters: Array<{ id: string; displayName: string }>,
): string | null {
  const normalized = masterText.trim().toLowerCase();
  if (normalized === "") return null;
  const matches = masters.filter((master) => master.displayName.trim().toLowerCase() === normalized);
  return matches.length === 1 ? matches[0].id : null;
}