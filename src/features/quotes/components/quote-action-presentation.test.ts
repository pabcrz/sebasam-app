import { describe, expect, it } from "vitest";
import { resolveQuoteActionPresentation } from "./quote-action-presentation";

const base = {
  editable: true,
  hasWorkOrder: false,
  paymentAvailable: false,
};

describe("resolveQuoteActionPresentation", () => {
  it.each(["DRAFT", "SENT", "APPROVED", "REJECTED", "CANCELLED", "ARCHIVED"] as const)(
    "keeps the four mobile action slots stable for %s quotes",
    (status) => {
      const presentation = resolveQuoteActionPresentation({ ...base, status, hasSharedQuote: true });

      expect(presentation).toMatchObject({
        primary: "workOrder",
        sharePrimary: false,
        frequent: ["edit", "share", "print"],
      });
      expect(presentation.frequent).not.toContain("workOrder");
      expect(presentation.overflow).not.toContain("print");
    },
  );

  it("toggles only the flow and Share color decision with shared state", () => {
    const unshared = resolveQuoteActionPresentation({ ...base, status: "SENT", hasSharedQuote: false });
    const shared = resolveQuoteActionPresentation({ ...base, status: "SENT", hasSharedQuote: true });

    expect(unshared).toMatchObject({ primary: "workOrder", sharePrimary: true, frequent: ["edit", "share", "print"] });
    expect(shared).toMatchObject({ primary: "workOrder", sharePrimary: false, frequent: ["edit", "share", "print"] });
  });

  it("keeps quote-specific actions in overflow without altering the fixed mobile controls", () => {
    expect(resolveQuoteActionPresentation({ ...base, status: "SENT", hasSharedQuote: true })).toMatchObject({
      overflow: ["authorize", "duplicate", "cancel", "archive"],
    });
    expect(resolveQuoteActionPresentation({ ...base, status: "APPROVED", hasSharedQuote: true, paymentAvailable: true })).toMatchObject({
      overflow: ["paymentLink", "correctDecision", "duplicate"],
    });
  });
});
