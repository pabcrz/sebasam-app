import { describe, expect, it } from "vitest";
import { quoteFormInputSchema, quoteLifecycleReasonSchema } from "./schemas";

describe("quoteLifecycleReasonSchema", () => {
  it("requires a meaningful, bounded lifecycle reason", () => {
    expect(quoteLifecycleReasonSchema.safeParse("  ").success).toBe(false);
    expect(quoteLifecycleReasonSchema.parse("keep for reference")).toBe("keep for reference");
    expect(quoteLifecycleReasonSchema.safeParse("x".repeat(501)).success).toBe(false);
  });
});

describe("quote meaningful text validation", () => {
  const validQuote = {
    customerId: "customer-1",
    vehicle: {},
    title: "Servicio general",
    sections: [{
      name: "General",
      items: [{ type: "LABOR", description: "Cambio de aceite", quantity: "1", unitPriceCents: "100" }],
    }],
  };

  it.each(["xyz", "..."])("rejects placeholder %s in item descriptions", (description) => {
    expect(quoteFormInputSchema.safeParse({
      ...validQuote,
      sections: [{ ...validQuote.sections[0], items: [{ ...validQuote.sections[0].items[0], description }] }],
    }).success).toBe(false);
  });

  it.each(["xyz", "..."])("rejects placeholder %s in titles", (title) => {
    expect(quoteFormInputSchema.safeParse({ ...validQuote, title }).success).toBe(false);
  });
});
