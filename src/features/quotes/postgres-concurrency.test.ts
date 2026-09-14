import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { allocateDailyDocumentFolio } from "./lib/daily-document-sequence";

const databaseUrl = process.env.DATABASE_URL ?? process.env.DIRECT_URL;

describe.skipIf(!databaseUrl)("PostgreSQL daily document sequence concurrency", { timeout: 30000 }, () => {
  const prisma = databaseUrl
    ? new PrismaClient({
        datasources: {
          db: { url: databaseUrl },
        },
      })
    : (null as unknown as PrismaClient);

  // Use distinct future business dates for isolation
  const testDate1 = new Date("2099-01-15T12:00:00Z");
  const testDate2 = new Date("2099-01-16T12:00:00Z");
  const businessDate1 = "2099-01-15";
  const businessDate2 = "2099-01-16";

  let tableExists = false;

  beforeAll(async () => {
    if (!prisma) return;
    try {
      const check = await prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'DailyDocumentSequence'
        ) as "exists"
      `;
      tableExists = Boolean(check[0]?.exists);
    } catch {
      tableExists = false;
    }
  });

  afterAll(async () => {
    if (prisma) {
      try {
        if (tableExists) {
          await prisma.dailyDocumentSequence.deleteMany({
            where: {
              businessDate: { in: [businessDate1, businessDate2] },
            },
          });
        }
        await prisma.$disconnect();
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  it("handles 20 concurrent C folio allocations producing contiguous unique sequences", async () => {
    if (!tableExists) {
      console.warn("Skipping test: DailyDocumentSequence migration not applied to remote database.");
      return;
    }

    const concurrency = 20;

    const results = await Promise.all(
      Array.from({ length: concurrency }, () =>
        prisma.$transaction(
          async (tx) => {
            return allocateDailyDocumentFolio(tx, "C", testDate1);
          },
          {
            isolationLevel: "ReadCommitted",
          },
        ),
      ),
    );

    expect(results).toHaveLength(concurrency);

    const folios = results.map((r) => r.folio);

    // All folios must be unique
    const uniqueFolios = new Set(folios);
    expect(uniqueFolios.size).toBe(concurrency);

    // Format must match C-150199-NN
    for (const folio of folios) {
      expect(folio).toMatch(/^C-150199-\d{2,}$/);
    }

    // Sequence numbers must cover 1 through 20 contiguously
    const seqNumbers = results
      .map((r) => r.sequence)
      .sort((a, b) => a - b);

    const expectedSeqs = Array.from({ length: concurrency }, (_, i) => i + 1);
    expect(seqNumbers).toEqual(expectedSeqs);
  });

  it("handles concurrent C and N folio allocations independently on the same date", async () => {
    if (!tableExists) {
      console.warn("Skipping test: DailyDocumentSequence migration not applied to remote database.");
      return;
    }

    const count = 10;

    const [cResults, nResults] = await Promise.all([
      Promise.all(
        Array.from({ length: count }, () =>
          prisma.$transaction(
            async (tx) => allocateDailyDocumentFolio(tx, "C", testDate2),
            { isolationLevel: "ReadCommitted" },
          ),
        ),
      ),
      Promise.all(
        Array.from({ length: count }, () =>
          prisma.$transaction(
            async (tx) => allocateDailyDocumentFolio(tx, "N", testDate2),
            { isolationLevel: "ReadCommitted" },
          ),
        ),
      ),
    ]);

    expect(cResults).toHaveLength(count);
    expect(nResults).toHaveLength(count);

    const cSeqs = cResults
      .map((r) => r.sequence)
      .sort((a, b) => a - b);
    const nSeqs = nResults
      .map((r) => r.sequence)
      .sort((a, b) => a - b);

    const expectedSeqs = Array.from({ length: count }, (_, i) => i + 1);
    expect(cSeqs).toEqual(expectedSeqs);
    expect(nSeqs).toEqual(expectedSeqs);
  });
});
