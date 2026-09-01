import { describe, expect, it } from "vitest";
import { resolveQuoteActionPresentation } from "./quote-action-presentation";

const base = {
  editable: true,
  hasActiveSharedQuote: false,
  hasWorkOrder: false,
  paymentAvailable: false,
};

describe("resolveQuoteActionPresentation", () => {
  it("prioritizes preparing a draft while retaining Edit and Print as frequent actions", () => {
    expect(resolveQuoteActionPresentation({ ...base, status: "DRAFT" })).toEqual({
      primary: "share",
      frequent: ["edit", "print"],
      overflow: ["workOrder", "duplicate", "cancel", "archive"],
      destructive: "delete",
    });
  });

  it("prioritizes authorization for sent quotes and only exposes Share when an active link exists", () => {
    expect(resolveQuoteActionPresentation({ ...base, status: "SENT" })).toMatchObject({
      primary: "authorize",
      frequent: ["edit", "print"],
      overflow: ["workOrder", "duplicate", "cancel", "archive"],
      destructive: "delete",
    });
    expect(resolveQuoteActionPresentation({ ...base, status: "SENT", hasActiveSharedQuote: true }).frequent).toEqual(["edit", "print", "share"]);
  });

  it("prioritizes work-order management for approved quotes and keeps payment links to eligible work", () => {
    expect(resolveQuoteActionPresentation({ ...base, status: "APPROVED" })).toEqual({
      primary: "workOrder",
      frequent: ["edit", "print"],
      overflow: ["correctDecision", "duplicate"],
      destructive: null,
    });
    expect(resolveQuoteActionPresentation({ ...base, status: "APPROVED", hasActiveSharedQuote: true, hasWorkOrder: true, paymentAvailable: true })).toEqual({
      primary: "workOrder",
      frequent: ["edit", "print", "share"],
      overflow: ["paymentLink", "duplicate"],
      destructive: null,
    });
    expect(resolveQuoteActionPresentation({ ...base, status: "APPROVED", editable: false, hasWorkOrder: true, paymentAvailable: false })).toEqual({
      primary: "workOrder",
      frequent: ["print"],
      overflow: ["duplicate"],
      destructive: null,
    });
  });

  it("surfaces a correction only for rejected quotes without a work order", () => {
    expect(resolveQuoteActionPresentation({ ...base, status: "REJECTED" })).toEqual({
      primary: "correctDecision",
      frequent: ["edit", "print"],
      overflow: ["duplicate", "archive"],
      destructive: "delete",
    });
    expect(resolveQuoteActionPresentation({ ...base, status: "REJECTED", hasWorkOrder: true })).toMatchObject({
      primary: null,
      frequent: ["edit", "print"],
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
      frequent: ["edit", "print"],
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
