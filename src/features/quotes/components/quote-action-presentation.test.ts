import { describe, expect, it } from "vitest";
import { resolveQuoteActionPresentation } from "./quote-action-presentation";

const base = {
  editable: true,
  hasWorkOrder: false,
  paymentAvailable: false,
};

describe("resolveQuoteActionPresentation", () => {
  it("determines primary action for draft: share when commercially ready, edit when not", () => {
    expect(resolveQuoteActionPresentation({ ...base, status: "DRAFT", isCommercialReady: true })).toEqual({
      primary: "share",
      frequent: ["edit", "print"],
      overflow: ["workOrder", "duplicate", "cancel", "archive"],
      destructive: "delete",
    });

    expect(resolveQuoteActionPresentation({ ...base, status: "DRAFT", isCommercialReady: false })).toEqual({
      primary: "edit",
      frequent: ["print", "share"],
      overflow: ["workOrder", "duplicate", "cancel", "archive"],
      destructive: "delete",
    });
  });

  it("prioritizes authorization for sent quotes while keeping Share available", () => {
    expect(resolveQuoteActionPresentation({ ...base, status: "SENT" })).toMatchObject({
      primary: "authorize",
      frequent: ["edit", "print", "share"],
      overflow: ["workOrder", "duplicate", "cancel", "archive"],
      destructive: "delete",
    });
  });

  it("prioritizes work-order management for approved quotes and keeps payment links to eligible work", () => {
    expect(resolveQuoteActionPresentation({ ...base, status: "APPROVED" })).toEqual({
      primary: "workOrder",
      frequent: ["edit", "print", "share"],
      overflow: ["correctDecision", "duplicate"],
      destructive: null,
    });
    expect(resolveQuoteActionPresentation({ ...base, status: "APPROVED", hasWorkOrder: true, paymentAvailable: true })).toEqual({
      primary: "workOrder",
      frequent: ["edit", "print", "share"],
      overflow: ["paymentLink", "duplicate"],
      destructive: null,
    });
    expect(resolveQuoteActionPresentation({ ...base, status: "APPROVED", editable: false, hasWorkOrder: true, paymentAvailable: false })).toEqual({
      primary: "workOrder",
      frequent: ["print", "share"],
      overflow: ["duplicate"],
      destructive: null,
    });
  });

  it("surfaces a correction only for rejected quotes without a work order", () => {
    expect(resolveQuoteActionPresentation({ ...base, status: "REJECTED" })).toEqual({
      primary: "correctDecision",
      frequent: ["edit", "print", "share"],
      overflow: ["duplicate", "archive"],
      destructive: "delete",
    });
    expect(resolveQuoteActionPresentation({ ...base, status: "REJECTED", hasWorkOrder: true })).toMatchObject({
      primary: null,
      frequent: ["edit", "print", "share"],
      overflow: ["duplicate", "archive"],
    });
  });

  it("does not surface forbidden actions for cancelled or archived quotes", () => {
    expect(resolveQuoteActionPresentation({ ...base, status: "CANCELLED", editable: false })).toEqual({
      primary: null,
      frequent: ["print"],
      overflow: ["duplicate", "archive"],
      destructive: "delete",
    });
    expect(resolveQuoteActionPresentation({ ...base, status: "ARCHIVED" })).toEqual({
      primary: "restore",
      frequent: ["edit", "print", "share"],
      overflow: ["duplicate"],
      destructive: "delete",
    });
  });

  it("keeps print frequent in every status and never repeats it in overflow", () => {
    for (const status of ["DRAFT", "SENT", "APPROVED", "REJECTED", "CANCELLED", "ARCHIVED"] as const) {
      const result = resolveQuoteActionPresentation({ ...base, status });
      expect(result.frequent).toContain("print");
      expect(result.overflow).not.toContain("print");
    }
  });
});
