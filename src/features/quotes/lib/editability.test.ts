import { describe, expect, it } from "vitest";
import { isQuoteEditable } from "./editability";

const futureDate = new Date("2026-12-31T00:00:00.000Z");
const pastDate = new Date("2020-01-01T00:00:00.000Z");
const now = new Date("2026-06-15T00:00:00.000Z");

const baseQuote = {
  status: "DRAFT" as const,
  validUntil: futureDate,
  workOrder: null,
};

describe("isQuoteEditable", () => {
  describe("status checks", () => {
    it("returns true for DRAFT", () => {
      expect(isQuoteEditable({ ...baseQuote, status: "DRAFT" }, now)).toBe(true);
    });

    it("returns true for SENT", () => {
      expect(isQuoteEditable({ ...baseQuote, status: "SENT" }, now)).toBe(true);
    });

    it("returns true for APPROVED", () => {
      expect(isQuoteEditable({ ...baseQuote, status: "APPROVED" }, now)).toBe(true);
    });

    it("returns true for REJECTED", () => {
      expect(isQuoteEditable({ ...baseQuote, status: "REJECTED" }, now)).toBe(true);
    });

    it("returns false for CANCELLED", () => {
      expect(isQuoteEditable({ ...baseQuote, status: "CANCELLED" }, now)).toBe(false);
    });
  });

  describe("expiry checks", () => {
    it("returns false when validUntil is in the past", () => {
      expect(
        isQuoteEditable({ ...baseQuote, validUntil: pastDate }, now),
      ).toBe(false);
    });

    it("returns true when validUntil is in the future", () => {
      expect(
        isQuoteEditable({ ...baseQuote, validUntil: futureDate }, now),
      ).toBe(true);
    });

    it("returns true when validUntil is null (no expiry)", () => {
      expect(
        isQuoteEditable({ ...baseQuote, validUntil: null }, now),
      ).toBe(true);
    });
  });

  describe("work order checks", () => {
    it("returns false when workOrder is COMPLETED", () => {
      expect(
        isQuoteEditable({ ...baseQuote, workOrder: { status: "COMPLETED" } }, now),
      ).toBe(false);
    });

    it("returns false when workOrder is CANCELLED", () => {
      expect(
        isQuoteEditable({ ...baseQuote, workOrder: { status: "CANCELLED" } }, now),
      ).toBe(false);
    });

    it("returns true when workOrder is PLANNED", () => {
      expect(
        isQuoteEditable({ ...baseQuote, workOrder: { status: "PLANNED" } }, now),
      ).toBe(true);
    });

    it("returns false when workOrder is ASSIGNED", () => {
      expect(
        isQuoteEditable({ ...baseQuote, workOrder: { status: "ASSIGNED" } }, now),
      ).toBe(false);
    });

    it("returns false when workOrder is IN_PROGRESS", () => {
      expect(
        isQuoteEditable({ ...baseQuote, workOrder: { status: "IN_PROGRESS" } }, now),
      ).toBe(false);
    });

    it("returns true when workOrder is null", () => {
      expect(
        isQuoteEditable({ ...baseQuote, workOrder: null }, now),
      ).toBe(true);
    });
  });

  describe("compound scenarios", () => {
    it("returns false when CANCELLED and not expired and no workOrder", () => {
      expect(
        isQuoteEditable({ ...baseQuote, status: "CANCELLED" }, now),
      ).toBe(false);
    });

    it("returns false when DRAFT but expired", () => {
      expect(
        isQuoteEditable({ ...baseQuote, validUntil: pastDate }, now),
      ).toBe(false);
    });

    it("returns false when APPROVED with COMPLETED workOrder", () => {
      expect(
        isQuoteEditable({
          ...baseQuote,
          status: "APPROVED",
          workOrder: { status: "COMPLETED" },
        }, now),
      ).toBe(false);
    });

    it("returns true when SENT with PLANNED workOrder and not expired", () => {
      expect(
        isQuoteEditable({
          ...baseQuote,
          status: "SENT",
          workOrder: { status: "PLANNED" },
        }, now),
      ).toBe(true);
    });
  });
});
