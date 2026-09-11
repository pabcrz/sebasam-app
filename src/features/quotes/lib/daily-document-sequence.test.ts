import { describe, expect, it, vi } from "vitest";
import {
  formatDailyDocumentFolio,
  allocateDailyDocumentFolio,
  type SequenceTransactionClient,
} from "./daily-document-sequence";

describe("daily-document-sequence", () => {
  describe("formatDailyDocumentFolio", () => {
    it("formats quote folio as C-DDMMYY-NN with zero padding", () => {
      expect(formatDailyDocumentFolio("C", "2026-09-09", 1)).toBe("C-090926-01");
      expect(formatDailyDocumentFolio("C", "2026-09-09", 9)).toBe("C-090926-09");
      expect(formatDailyDocumentFolio("C", "2026-09-09", 42)).toBe("C-090926-42");
    });

    it("formats note folio as N-DDMMYY-NN with zero padding", () => {
      expect(formatDailyDocumentFolio("N", "2026-09-09", 1)).toBe("N-090926-01");
      expect(formatDailyDocumentFolio("N", "2026-09-09", 99)).toBe("N-090926-99");
    });

    it("never truncates values above 99", () => {
      expect(formatDailyDocumentFolio("C", "2026-09-09", 100)).toBe("C-090926-100");
      expect(formatDailyDocumentFolio("N", "2026-09-09", 1234)).toBe("N-090926-1234");
    });

    it("formats date with DDMMYY convention (day first, 2-digit year)", () => {
      // 15 January 2027
      expect(formatDailyDocumentFolio("C", "2027-01-15", 3)).toBe("C-150127-03");
      // 31 December 2026
      expect(formatDailyDocumentFolio("N", "2026-12-31", 1)).toBe("N-311226-01");
    });

    it("throws error when business date format is invalid", () => {
      expect(() => formatDailyDocumentFolio("C", "invalid-date", 1)).toThrow("Invalid business date format");
    });
  });

  describe("allocateDailyDocumentFolio", () => {
    it("passes atomic ON CONFLICT DO UPDATE RETURNING query to PostgreSQL", async () => {
      const mockQueryRaw = vi.fn().mockResolvedValue([{ lastSequence: 1 }]);
      const mockTx: SequenceTransactionClient = { $queryRaw: mockQueryRaw };

      // Noon in Mexico City on 2026-09-09 (UTC-6)
      const testDate = new Date("2026-09-09T18:00:00.000Z");

      const result = await allocateDailyDocumentFolio(mockTx, "C", testDate);

      expect(result).toEqual({
        folio: "C-090926-01",
        businessDate: "2026-09-09",
        sequence: 1,
        issuedAt: testDate,
      });

      expect(mockQueryRaw).toHaveBeenCalledOnce();
      const [strings, id, type, businessDate] = mockQueryRaw.mock.calls[0];
      const sql = Array.from(strings as TemplateStringsArray).join("?");

      expect(sql).toContain('INSERT INTO "DailyDocumentSequence"');
      expect(sql).toContain('ON CONFLICT ("documentType", "businessDate")');
      expect(sql).toContain('DO UPDATE SET');
      expect(sql).toContain('"lastSequence" = "DailyDocumentSequence"."lastSequence" + 1');
      expect(sql).toContain('RETURNING "lastSequence"');
      expect(typeof id).toBe("string");
      expect(type).toBe("C");
      expect(businessDate).toBe("2026-09-09");
    });

    it("uses Mexico City business date (UTC-6) without UTC date drift", async () => {
      const mockQueryRaw = vi.fn().mockResolvedValue([{ lastSequence: 5 }]);
      const mockTx: SequenceTransactionClient = { $queryRaw: mockQueryRaw };

      // 2026-09-09 at 23:30 in Mexico City is 2026-09-10T05:30:00Z in UTC
      const lateEveningDate = new Date("2026-09-10T05:30:00.000Z");

      const result = await allocateDailyDocumentFolio(mockTx, "N", lateEveningDate);

      expect(result.businessDate).toBe("2026-09-09");
      expect(result.folio).toBe("N-090926-05");
      expect(result.sequence).toBe(5);
    });

    it("handles day rollover when business date advances", async () => {
      const mockQueryRaw = vi.fn()
        .mockResolvedValueOnce([{ lastSequence: 42 }])
        .mockResolvedValueOnce([{ lastSequence: 1 }]);
      const mockTx: SequenceTransactionClient = { $queryRaw: mockQueryRaw };

      const day1 = new Date("2026-09-09T18:00:00.000Z");
      const day2 = new Date("2026-09-10T18:00:00.000Z");

      const result1 = await allocateDailyDocumentFolio(mockTx, "C", day1);
      const result2 = await allocateDailyDocumentFolio(mockTx, "C", day2);

      expect(result1.folio).toBe("C-090926-42");
      expect(result2.folio).toBe("C-100926-01");
    });
  });
});
