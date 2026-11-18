import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins conditional class names", () => {
    expect(cn("px-2", false && "hidden", undefined, { "font-medium": true })).toBe("px-2 font-medium");
  });

  it("lets later Tailwind classes override conflicting earlier ones", () => {
    expect(cn("h-9 px-2", "h-[var(--tap-min-height)] px-4")).toBe("h-[var(--tap-min-height)] px-4");
  });

  it("keeps token text colors and font sizes together", () => {
    expect(cn("text-sm text-[var(--color-text-main)]")).toBe("text-sm text-[var(--color-text-main)]");
  });
});
