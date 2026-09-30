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
      const presentation = resolveQuoteActionPresentation({ ...base, status });

      expect(presentation).toMatchObject({
        primary: "workOrder",
        frequent: ["edit", "print", "share"],
      });
      expect(presentation.frequent).not.toContain("workOrder");
      expect(presentation.overflow).not.toContain("print");
    },
  );

  it("uses the requested fixed compact action order", () => {
    const presentation = resolveQuoteActionPresentation({ ...base, status: "SENT" });

    expect(presentation.frequent).toEqual(["edit", "print", "share"]);
  });

  it("keeps authorization available for corrected DRAFT quotes", () => {
    expect(resolveQuoteActionPresentation({ ...base, status: "DRAFT" }).overflow).toContain("authorize");
  });

  it("keeps quote-specific actions in overflow without altering the fixed mobile controls", () => {
    expect(resolveQuoteActionPresentation({ ...base, status: "SENT" })).toMatchObject({
      overflow: ["authorize", "duplicate", "cancel", "archive"],
    });
    expect(resolveQuoteActionPresentation({ ...base, status: "APPROVED", paymentAvailable: true })).toMatchObject({
      overflow: ["paymentLink", "correctDecision", "duplicate"],
    });
  });
});
