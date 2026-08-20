import { describe, expect, it } from "vitest";
import { isQuoteEditable } from "./editability";

describe("isQuoteEditable", () => {
  describe("editable statuses — only CANCELLED locks editing", () => {
    it("returns true for DRAFT", () => {
      expect(isQuoteEditable({ status: "DRAFT" })).toBe(true);
    });

    it("returns true for SENT", () => {
      expect(isQuoteEditable({ status: "SENT" })).toBe(true);
    });

    it("returns true for APPROVED", () => {
      expect(isQuoteEditable({ status: "APPROVED" })).toBe(true);
    });

    it("returns true for REJECTED", () => {
      expect(isQuoteEditable({ status: "REJECTED" })).toBe(true);
    });

    it("returns false for CANCELLED", () => {
      expect(isQuoteEditable({ status: "CANCELLED" })).toBe(false);
    });
  });

  describe("editable with any work order state (admin can always correct data)", () => {
    it("returns true when workOrder is ASSIGNED", () => {
      expect(isQuoteEditable({ status: "APPROVED", workOrder: { status: "ASSIGNED" } })).toBe(true);
    });

    it("keeps a draft editable after its work order is assigned", () => {
      expect(isQuoteEditable({ status: "DRAFT", workOrder: { status: "ASSIGNED" } })).toBe(true);
    });

    it("returns true when workOrder is IN_PROGRESS", () => {
      expect(isQuoteEditable({ status: "APPROVED", workOrder: { status: "IN_PROGRESS" } })).toBe(true);
    });

    it("returns true when workOrder is COMPLETED", () => {
      expect(isQuoteEditable({ status: "APPROVED", workOrder: { status: "COMPLETED" } })).toBe(true);
    });

    it("returns true when workOrder is PLANNED", () => {
      expect(isQuoteEditable({ status: "APPROVED", workOrder: { status: "PLANNED" } })).toBe(true);
    });

    it("returns true when workOrder is null", () => {
      expect(isQuoteEditable({ status: "DRAFT", workOrder: null })).toBe(true);
    });
  });

  describe("compound scenarios", () => {
    it("returns false when CANCELLED regardless of work order", () => {
      expect(isQuoteEditable({ status: "CANCELLED", workOrder: null })).toBe(false);
      expect(isQuoteEditable({ status: "CANCELLED", workOrder: { status: "PLANNED" } })).toBe(false);
    });

    it("returns true when APPROVED with COMPLETED workOrder", () => {
      expect(
        isQuoteEditable({ status: "APPROVED", workOrder: { status: "COMPLETED" } }),
      ).toBe(true);
    });

    it("returns true when SENT with PLANNED workOrder", () => {
      expect(
        isQuoteEditable({ status: "SENT", workOrder: { status: "PLANNED" } }),
      ).toBe(true);
    });
  });
});
