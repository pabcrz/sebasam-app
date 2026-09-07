import type { QuoteItemType } from "@prisma/client";

export type HistoricalSource = "voice" | "text" | "excel";

/** Spanish UI labels for item types (same taxonomy as quotes). */
export const ITEM_TYPE_LABELS: Record<QuoteItemType, string> = {
  LABOR: "Mano de obra",
  MATERIAL: "Material",
  REFACCIONES: "Refacciones",
  OTHER: "Otro",
};

/**
 * Raw JSON payload contract (schemaVersion 2). Amounts are LINE TOTALS in
 * pesos (decimal); they are converted to integer cents at ingestion.
 */
export interface HistoricalImportPayload {
  schemaVersion: 2;
  batch: {
    id: string;
    source: HistoricalSource;
  };
  works: RawHistoricalWork[];
}

export interface RawHistoricalWork {
  ref: string;
  date: string; // YYYY-MM-DD
  customer?: {
    name?: string | null;
    plate?: string | null;
    brand?: string | null;
    model?: string | null;
  } | null;
  master?: string | null;
  /** Optional: uuid of an existing UserProfile resolved by displayName in the UI. */
  masterId?: string | null;
  items: RawHistoricalItem[];
}

export interface RawHistoricalItem {
  type: QuoteItemType;
  description: string;
  /** Only for material/refacción (and OTHER outside payroll). */
  quantity?: number | null;
  /** Line total in pesos. */
  customerPrice?: number | null;
  /** Taller payroll base in pesos (labor concepts only). */
  payrollBase?: number | null;
  /** Commission percentage (1-100); derived from description when omitted. */
  ratePercent?: number | null;
  includeInPayroll?: boolean;
  isKit?: boolean;
}

/** Normalized item ready for storage. All amounts are integer cents. */
export interface NormalizedHistoricalItem {
  type: QuoteItemType;
  description: string;
  quantity: number | null;
  customerPriceCents: number | null;
  payrollBaseCents: number | null;
  ratePercent: number | null;
  includeInPayroll: boolean;
  isKit: boolean;
  sortOrder: number;
  contentHash: string;
  /** Derived real per-piece price (null when not applicable). */
  unitPriceCents: number | null;
  /** Derived commission (never stored); null when not applicable. */
  commissionCents: number | null;
  /** Text indexed for semantic search. */
  embeddingText: string;
  /** pgvector embedding values (1536 dims), produced by the provider at import. */
  embedding: number[];
  metadata: Record<string, unknown>;
}

export interface NormalizedHistoricalWork {
  batchId: string;
  workRef: string;
  workDate: Date;
  customerName: string | null;
  plate: string | null;
  brand: string | null;
  model: string | null;
  masterName: string | null;
  masterId: string | null;
  source: HistoricalSource;
  items: NormalizedHistoricalItem[];
}