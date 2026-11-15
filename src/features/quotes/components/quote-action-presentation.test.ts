import { describe, expect, it } from "vitest";
import { resolveQuoteActionPresentation } from "./quote-action-presentation";

const base = {
  editable: true,
  hasWorkOrder: false,
  paymentAvailable: false,
};

describe("resolveQuoteActionPresentation", () => {
  it.each([
    { status: "DRAFT" as const, primary: "share", frequent: ["edit", "print"], overflow: ["authorize", "workOrder", "duplicate", "cancel", "archive"] },
    { status: "SENT" as const, primary: "authorize", frequent: ["edit", "print", "share"], overflow: ["workOrder", "duplicate", "cancel", "archive"] },
    { status: "APPROVED" as const, primary: "workOrder", frequent: ["edit", "print", "share"], overflow: ["correctDecision", "duplicate"] },
    { status: "REJECTED" as const, primary: "correctDecision", frequent: ["edit", "print", "share"], overflow: ["duplicate", "archive"] },
    { status: "ARCHIVED" as const, primary: "restore", frequent: ["edit", "print", "share"], overflow: ["duplicate"] },
    { status: "CANCELLED" as const, primary: null, frequent: ["edit", "print"], overflow: ["duplicate", "archive"] },
  ])("chooses $primary as the primary action for $status quotes", ({ status, primary, frequent, overflow }) => {
    const presentation = resolveQuoteActionPresentation({ ...base, status });

    expect(presentation.primary).toBe(primary);
    expect(presentation.frequent).toEqual(frequent);
    expect(presentation.overflow).toEqual(overflow);
    expect(presentation.frequent).not.toContain(primary);
    expect(presentation.overflow).not.toContain(primary);
  });

  it("never offers print or share as the primary action", () => {
    for (const status of ["DRAFT", "SENT", "APPROVED", "REJECTED", "CANCELLED", "ARCHIVED"] as const) {
      const { primary } = resolveQuoteActionPresentation({ ...base, status });
      expect(primary).not.toBe("print");
    }
  });

  it("does not offer a correction as primary once a work order exists", () => {
    expect(resolveQuoteActionPresentation({ ...base, status: "REJECTED", hasWorkOrder: true })).toMatchObject({
      primary: null,
    });
  });

  it("keeps payment links in overflow for approved quotes", () => {
    expect(resolveQuoteActionPresentation({ ...base, status: "APPROVED", paymentAvailable: true })).toMatchObject({
      primary: "workOrder",
      overflow: ["paymentLink", "correctDecision", "duplicate"],
    });
  });

  it("keeps delete as the destructive action outside the primary and overflow slots", () => {
    expect(resolveQuoteActionPresentation({ ...base, status: "DRAFT" })).toMatchObject({ destructive: "delete" });
    expect(resolveQuoteActionPresentation({ ...base, status: "APPROVED" })).toMatchObject({ destructive: null });
  });
});
