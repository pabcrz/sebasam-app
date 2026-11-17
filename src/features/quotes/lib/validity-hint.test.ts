import { describe, expect, it } from "vitest";
import { quoteValidityHint } from "./validity-hint";

const now = new Date("2026-11-17T18:00:00Z");

describe("quoteValidityHint", () => {
  it.each([
    ["2026-11-24T18:00:00Z", "7 días", "muted"],
    ["2026-11-20T18:00:00Z", "3 días", "warning"],
    ["2026-11-18T18:00:00Z", "1 día", "warning"],
    ["2026-11-17T20:00:00Z", "Vence hoy", "warning"],
    ["2026-11-16T18:00:00Z", "Vencida", "danger"],
  ])("%s -> %s", (validUntil, label, tone) => {
    expect(quoteValidityHint(new Date(validUntil), now)).toEqual({ label, tone });
  });
});
