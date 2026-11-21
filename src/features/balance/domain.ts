import type { QuoteItemType } from "@/generated/prisma/client";
import {
  getPeriodRange,
  localMidnightUtc,
  parseCalendarDate,
  shiftStatementAnchor,
  type StatementPeriodUnit,
} from "@/features/customers/customer-statement";

export type IncomeCategory = "labor" | "materials" | "other";

/** LABOR is labor; MATERIAL and REFACCIONES are materials; OTHER stays apart as "Otros" (#718). */
export const INCOME_CATEGORY_BY_ITEM_TYPE: Record<QuoteItemType, IncomeCategory> = {
  LABOR: "labor",
  MATERIAL: "materials",
  REFACCIONES: "materials",
  OTHER: "other",
};

export const INCOME_CATEGORY_LABELS: Record<IncomeCategory, string> = {
  labor: "Mano de obra",
  materials: "Materiales y refacciones",
  other: "Otros",
};

export type CategoryCents = Record<IncomeCategory, number>;

export const emptyCategoryCents = (): CategoryCents => ({ labor: 0, materials: 0, other: 0 });

type BilledItem = {
  id: string;
  type: QuoteItemType;
  quantity: number;
  unitPriceCents: number | null;
  totalCents: number | null;
};

/** Billed amount of each category, as written on the note's lines; an item listed twice counts once. */
export function billedByCategory(items: BilledItem[]): CategoryCents {
  const totals = emptyCategoryCents();
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    const line = item.totalCents ?? (item.unitPriceCents == null ? null : Math.round(item.unitPriceCents * item.quantity));
    if (line != null) totals[INCOME_CATEGORY_BY_ITEM_TYPE[item.type]] += line;
  }
  return totals;
}

type Application = { amountCents: number; createdAt: Date };

/** When the applied payments first covered the whole note; null while it still owes something. */
export function fullSettlementDate(totalCents: number, applications: Application[]): Date | null {
  if (totalCents <= 0) return null;
  let applied = 0;
  for (const application of [...applications].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    applied += application.amountCents;
    if (applied >= totalCents) return application.createdAt;
  }
  return null;
}

export type BalanceNote = {
  completedAt: Date | null;
  totalCents: number;
  billed: CategoryCents;
  applications: Application[];
};

export type PeriodBucket = { label: string; start: Date; end: Date };

export type BalancePeriodRow = {
  label: string;
  /** Full billed amounts of the notes whose settlement completed in this period. */
  settledBilled: CategoryCents;
  /** Balance owed at the end of the period, rebuilt from current records: not verified. */
  receivableAtCloseCents: number;
};

/**
 * Attributes each settled note's whole billed amount to the period its settlement completed,
 * without prorating earlier partial payments, and rebuilds the receivable at each period close.
 */
export function buildBalancePeriods(notes: BalanceNote[], buckets: PeriodBucket[]): BalancePeriodRow[] {
  const settled = notes.map((note) => ({ note, settledAt: fullSettlementDate(note.totalCents, note.applications) }));

  return buckets.map((bucket) => {
    const settledBilled = emptyCategoryCents();
    let receivableAtCloseCents = 0;

    for (const { note, settledAt } of settled) {
      if (settledAt && settledAt >= bucket.start && settledAt < bucket.end) {
        settledBilled.labor += note.billed.labor;
        settledBilled.materials += note.billed.materials;
        settledBilled.other += note.billed.other;
      }
      if (note.completedAt && note.completedAt < bucket.end) {
        const appliedByClose = note.applications
          .filter((application) => application.createdAt < bucket.end)
          .reduce((total, application) => total + application.amountCents, 0);
        receivableAtCloseCents += Math.max(0, note.totalCents - appliedByClose);
      }
    }

    return { label: bucket.label, settledBilled, receivableAtCloseCents };
  });
}

export const COMPARED_PERIODS = 6;

/**
 * The anchor's period and the ones before it, oldest first. Same Mexico City boundaries as the
 * customer statement: Monday-to-Sunday weeks, calendar months and calendar years. "all" compares years.
 */
export function buildPeriodBuckets(view: StatementPeriodUnit, anchor: string, count = COMPARED_PERIODS): PeriodBucket[] {
  const unit = view === "all" ? "year" : view;
  return Array.from({ length: count }, (_, index) => {
    const shifted = shiftStatementAnchor(unit, anchor, index - (count - 1));
    const { start, end, label } = getPeriodRange(unit, parseCalendarDate(shifted));
    return { label, start: localMidnightUtc(start), end: localMidnightUtc(end) };
  });
}
