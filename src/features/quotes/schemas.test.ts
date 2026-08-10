import { describe, expect, it } from "vitest";
import { quoteLifecycleReasonSchema } from "./schemas";

describe("quoteLifecycleReasonSchema", () => {
  it("requires a meaningful, bounded lifecycle reason", () => {
    expect(quoteLifecycleReasonSchema.safeParse("  ").success).toBe(false);
    expect(quoteLifecycleReasonSchema.parse("keep for reference")).toBe("keep for reference");
    expect(quoteLifecycleReasonSchema.safeParse("x".repeat(501)).success).toBe(false);
  });
});
