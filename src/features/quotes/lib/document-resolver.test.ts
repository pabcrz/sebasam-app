import { describe, expect, it } from "vitest";
import { WorkOrderStatus } from "@prisma/client";
import {
  resolveDocumentFolio,
  resolveAntecedentQuoteFolio,
} from "./document-resolver";

describe("document-resolver", () => {
  describe("resolveDocumentFolio", () => {
    it("returns N folio for a completed work order with folio", () => {
      const workOrder = {
        status: WorkOrderStatus.COMPLETED,
        folio: "N-090926-01",
        quote: {
          number: "0626-001",
          folio: "C-090926-01",
        },
      };

      expect(resolveDocumentFolio(workOrder)).toBe("N-090926-01");
    });

    it("returns N folio for a quote whose linked work order is completed with folio", () => {
      const quote = {
        number: "0626-001",
        folio: "C-090926-01",
        workOrder: {
          status: WorkOrderStatus.COMPLETED,
          folio: "N-090926-02",
        },
      };

      expect(resolveDocumentFolio(quote)).toBe("N-090926-02");
    });

    it("returns C folio for an active quote with folio", () => {
      const quote = {
        number: "0626-001",
        folio: "C-090926-01",
        workOrder: null,
      };

      expect(resolveDocumentFolio(quote)).toBe("C-090926-01");
    });

    it("returns C folio for a quote with an in-progress/assigned work order", () => {
      const quote = {
        number: "0626-001",
        folio: "C-090926-01",
        workOrder: {
          status: WorkOrderStatus.ASSIGNED,
          folio: null,
        },
      };

      expect(resolveDocumentFolio(quote)).toBe("C-090926-01");
    });

    it("falls back to legacy Quote.number for historic quote without folio", () => {
      const historicQuote = {
        number: "0626-042",
        folio: null,
        workOrder: null,
      };

      expect(resolveDocumentFolio(historicQuote)).toBe("0626-042");
    });

    it("falls back to legacy Quote.number for historic completed note without folio", () => {
      const historicCompletedNote = {
        status: WorkOrderStatus.COMPLETED,
        folio: null,
        quote: {
          number: "0626-099",
          folio: null,
        },
      };

      expect(resolveDocumentFolio(historicCompletedNote)).toBe("0626-099");
    });

    it("falls back to legacy Quote.number for direct non-completed work order before completion", () => {
      const directWorkOrder = {
        status: WorkOrderStatus.ASSIGNED,
        folio: null,
        quote: {
          number: "0626-100",
          folio: null, // Technical quote without C
        },
      };

      expect(resolveDocumentFolio(directWorkOrder)).toBe("0626-100");
    });

    it("returns empty string for null or undefined", () => {
      expect(resolveDocumentFolio(null)).toBe("");
      expect(resolveDocumentFolio(undefined)).toBe("");
    });
  });

  describe("resolveAntecedentQuoteFolio", () => {
    it("returns C folio of antecedent quote when present", () => {
      const note = {
        status: WorkOrderStatus.COMPLETED,
        folio: "N-090926-01",
        quote: {
          number: "0626-001",
          folio: "C-090926-01",
        },
      };

      expect(resolveAntecedentQuoteFolio(note)).toBe("C-090926-01");
    });

    it("falls back to legacy Quote.number when antecedent quote has no C folio", () => {
      const note = {
        status: WorkOrderStatus.COMPLETED,
        folio: "N-090926-01",
        quote: {
          number: "0626-001",
          folio: null,
        },
      };

      expect(resolveAntecedentQuoteFolio(note)).toBe("0626-001");
    });
  });
});
