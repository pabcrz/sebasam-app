import { describe, expect, it } from "vitest";
import { resolveQuoteTitle } from "./quote-title";

const sections = [{ items: [{ description: "  " }, { description: " Cambio de percha " }] }];

describe("resolveQuoteTitle", () => {
  it("keeps what the user typed, even a single dot", () => {
    expect(resolveQuoteTitle(" . ", sections)).toBe(".");
  });
  it("falls back to the first non-empty concept", () => {
    expect(resolveQuoteTitle("  ", sections)).toBe("Cambio de percha");
  });
  it("falls back to a neutral label with no concepts", () => {
    expect(resolveQuoteTitle("", [])).toBe("Sin descripción");
  });
  it("caps the fallback at the title limit", () => {
    expect(resolveQuoteTitle("", [{ items: [{ description: "a".repeat(300) }] }])).toHaveLength(160);
  });
});
