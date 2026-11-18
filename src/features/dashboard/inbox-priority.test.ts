import { describe, expect, it } from "vitest";
import { buildInboxRows, inboxRowTone, prioritizeInbox, type InboxRow } from "./inbox-priority";

const day = (date: number) => new Date(`2026-11-${String(date).padStart(2, "0")}T12:00:00.000Z`);

describe("prioritizeInbox", () => {
  it("orders approved work first, then active jobs, then sent and draft follow-up", () => {
    const rows: InboxRow[] = [
      { key: "draft", count: 13, at: null, href: "/admin/quotes?status=DRAFT" },
      { key: "active", count: 1, at: null, href: "/admin/work-orders" },
      { key: "sent", count: 1, at: null, href: "/admin/quotes?status=SENT" },
      { key: "approved", count: 2, at: day(3), href: "/admin/quotes?status=APPROVED" },
    ];

    expect(prioritizeInbox(rows).map((row) => row.key)).toEqual(["approved", "active", "sent", "draft"]);
  });

  it("orders approved rows from the oldest to the newest, with undated rows last", () => {
    const rows: InboxRow[] = [
      { key: "approved", count: 1, at: null, href: "undated" },
      { key: "approved", count: 1, at: day(9), href: "newest" },
      { key: "approved", count: 1, at: day(2), href: "oldest" },
    ];

    expect(prioritizeInbox(rows).map((row) => row.href)).toEqual(["oldest", "newest", "undated"]);
  });

  it("keeps the input order for ties", () => {
    const rows: InboxRow[] = [
      { key: "approved", count: 1, at: day(5), href: "first" },
      { key: "approved", count: 1, at: day(5), href: "second" },
      { key: "active", count: 2, at: null, href: "active-a" },
      { key: "active", count: 3, at: null, href: "active-b" },
    ];

    expect(prioritizeInbox(rows).map((row) => row.href)).toEqual(["first", "second", "active-a", "active-b"]);
  });

  it("drops rows with nothing pending and returns an empty list when nothing is pending", () => {
    expect(prioritizeInbox([{ key: "sent", count: 0, at: null, href: "/admin/quotes?status=SENT" }])).toEqual([]);
    expect(prioritizeInbox([])).toEqual([]);
  });

  it("does not mutate the rows it receives", () => {
    const rows: InboxRow[] = [
      { key: "draft", count: 1, at: null, href: "d" },
      { key: "approved", count: 1, at: null, href: "a" },
    ];

    prioritizeInbox(rows);

    expect(rows.map((row) => row.key)).toEqual(["draft", "approved"]);
  });
});

describe("buildInboxRows", () => {
  it("targets the already filtered list for each row", () => {
    const rows = buildInboxRows(
      { draftQuotesCount: 4, sentQuotesCount: 3, approvedQuotesCount: 2, activeExecutionCount: 1 },
      { oldestApprovedAt: day(1), stoppedActiveCount: 0 },
    );
    const hrefByKey = Object.fromEntries(rows.map((row) => [row.key, row.href]));

    expect(hrefByKey).toEqual({
      approved: "/admin/quotes?status=APPROVED",
      active: "/admin/work-orders",
      sent: "/admin/quotes?status=SENT",
      draft: "/admin/quotes?status=DRAFT",
    });
  });

  it("uses the existing queue counts and dates the approved row by its oldest quote", () => {
    const rows = buildInboxRows(
      { draftQuotesCount: 4, sentQuotesCount: 3, approvedQuotesCount: 2, activeExecutionCount: 1 },
      { oldestApprovedAt: day(1) },
    );
    const byKey = Object.fromEntries(rows.map((row) => [row.key, row]));

    expect(byKey.approved).toMatchObject({ count: 2, at: day(1) });
    expect(byKey.active).toMatchObject({ count: 1, at: null });
    expect(byKey.sent).toMatchObject({ count: 3, at: null });
    expect(byKey.draft).toMatchObject({ count: 4, at: null });
  });
});

describe("inboxRowTone", () => {
  it("turns an active row amber only when a job is stopped", () => {
    expect(inboxRowTone({ key: "active", count: 2, at: null, href: "/admin/work-orders", stoppedCount: 1 })).toBe("warning");
    expect(inboxRowTone({ key: "active", count: 2, at: null, href: "/admin/work-orders", stoppedCount: 0 })).toBe("neutral");
    expect(inboxRowTone({ key: "active", count: 2, at: null, href: "/admin/work-orders" })).toBe("neutral");
  });

  it("keeps approved and follow-up rows neutral even when a stopped count is present", () => {
    expect(inboxRowTone({ key: "approved", count: 1, at: null, href: "a", stoppedCount: 1 })).toBe("neutral");
    expect(inboxRowTone({ key: "sent", count: 1, at: null, href: "s", stoppedCount: 1 })).toBe("neutral");
    expect(inboxRowTone({ key: "draft", count: 1, at: null, href: "d", stoppedCount: 1 })).toBe("neutral");
  });
});
