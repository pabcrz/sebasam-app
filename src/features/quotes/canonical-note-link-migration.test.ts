import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("canonical Note link migration", () => {
  it("preserves only an active, unexpired completed Note token and enforces one active canonical link", async () => {
    const sql = await readFile(
      resolve(process.cwd(), "prisma/migrations/20260911164200_add_canonical_token_to_shared_quote/migration.sql"),
      "utf8",
    );

    expect(sql).toContain('JOIN "WorkOrder" wo ON wo."quoteId" = sq."quoteId"');
    expect(sql).toContain("WHERE wo.status = 'COMPLETED'");
    expect(sql).toContain('AND sq."expiresAt" >= CURRENT_TIMESTAMP');
    expect(sql).toContain('"expiresAt" = TIMESTAMPTZ \'2099-12-31 23:59:59+00\'');
    expect(sql).toContain('CREATE UNIQUE INDEX "SharedQuote_one_active_canonical_per_quote_unique"');
    expect(sql).toContain('WHERE "isCanonical" = true AND "revokedAt" IS NULL');
  });
});
