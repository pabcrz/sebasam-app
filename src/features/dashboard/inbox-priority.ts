import type { QueueMetrics } from "./types";

export type InboxRowKey = "approved" | "active" | "sent" | "draft";
export type InboxTone = "neutral" | "warning";

export interface InboxRow {
  key: InboxRowKey;
  /** Items behind the row; rows with nothing pending are dropped. */
  count: number;
  /** Orders rows of the same key from oldest to newest; null sorts last. */
  at: Date | null;
  /** Active jobs flagged as stopped. Any stopped job turns the active row amber. */
  stoppedCount?: number;
  /** Already-filtered list the row opens. */
  href: string;
}

/** Work first: approved quotes, then active jobs, then commercial follow-up. */
const KEY_RANK: Record<InboxRowKey, number> = {
  approved: 0,
  active: 1,
  sent: 2,
  draft: 3,
};

const LIST_HREF: Record<InboxRowKey, string> = {
  approved: "/admin/quotes?status=APPROVED",
  active: "/admin/work-orders",
  sent: "/admin/quotes?status=SENT",
  draft: "/admin/quotes?status=DRAFT",
};

/**
 * Builds one row per queue from the existing counts. The approved row is dated
 * by its oldest quote so rows sort the same way the featured job is chosen.
 */
export function buildInboxRows(
  queues: QueueMetrics,
  options: { oldestApprovedAt: Date | null; stoppedActiveCount?: number },
): InboxRow[] {
  return [
    { key: "approved", count: queues.approvedQuotesCount, at: options.oldestApprovedAt, href: LIST_HREF.approved },
    { key: "active", count: queues.activeExecutionCount, at: null, stoppedCount: options.stoppedActiveCount ?? 0, href: LIST_HREF.active },
    { key: "sent", count: queues.sentQuotesCount, at: null, href: LIST_HREF.sent },
    { key: "draft", count: queues.draftQuotesCount, at: null, href: LIST_HREF.draft },
  ];
}

/**
 * Orders rows by work priority: rank by key, then oldest first within the same
 * key (undated last), then input order. Returns a new array and drops empty rows.
 */
export function prioritizeInbox(rows: InboxRow[]): InboxRow[] {
  return rows
    .filter((row) => row.count > 0)
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const rankDiff = KEY_RANK[left.row.key] - KEY_RANK[right.row.key];
      if (rankDiff !== 0) return rankDiff;
      const leftTime = left.row.at?.getTime() ?? Number.POSITIVE_INFINITY;
      const rightTime = right.row.at?.getTime() ?? Number.POSITIVE_INFINITY;
      if (leftTime !== rightTime) return leftTime < rightTime ? -1 : 1;
      return left.index - right.index;
    })
    .map(({ row }) => row);
}

/** Only active jobs can be amber; approved and follow-up rows stay neutral. */
export function inboxRowTone(row: InboxRow): InboxTone {
  return row.key === "active" && (row.stoppedCount ?? 0) > 0 ? "warning" : "neutral";
}
