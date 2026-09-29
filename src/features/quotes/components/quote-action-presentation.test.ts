import { describe, expect, it } from "vitest";
import { resolveQuoteActionPresentation } from "./quote-action-presentation";

const base = {
  editable: true,
  hasWorkOrder: false,
  hasPayableNote: false,
  paymentAvailable: false,
  hasSharedQuote: true,
};

describe("resolveQuoteActionPresentation", () => {
  it("prioritizes work-order conversion for draft quotes", () => {
    expect(resolveQuoteActionPresentation({ ...base, status: "DRAFT" })).toEqual({
      primary: "workOrder",
      frequent: ["edit", "print", "share"],
      overflow: ["duplicate", "cancel", "archive"],
      destructive: "delete",
    });
  });

  it("prioritizes work-order conversion for sent quotes while keeping authorization available", () => {
    expect(resolveQuoteActionPresentation({ ...base, status: "SENT" })).toMatchObject({
      primary: "workOrder",
      frequent: ["edit", "print", "share"],
      overflow: ["authorize", "duplicate", "cancel", "archive"],
      destructive: "delete",
    });
  });

  it("prioritizes sharing before a quote has been shared", () => {
    expect(resolveQuoteActionPresentation({ ...base, hasSharedQuote: false, status: "SENT" })).toMatchObject({
      primary: "share",
      overflow: ["authorize", "workOrder", "duplicate", "cancel", "archive"],
    });
  });

  it("promotes sharing when a payable note makes work-order actions unavailable", () => {
    expect(resolveQuoteActionPresentation({ ...base, hasPayableNote: true, status: "SENT" })).toMatchObject({
      primary: "share",
      frequent: ["edit", "print"],
      overflow: ["authorize", "workOrder", "duplicate", "cancel", "archive"],
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
    expect(resolveQuoteActionPresentation({ ...base, status: "APPROVED", hasPayableNote: true, hasWorkOrder: true })).toMatchObject({
      primary: "workOrder",
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
