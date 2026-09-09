import { describe, expect, it } from "vitest";
import { workerInputSchema, workerSearchSchema } from "./schemas";

describe("worker schemas", () => {
  it("normalizes usernames and generates the internal email", () => {
    expect(
      workerInputSchema.parse({
        displayName: "  Ana López ",
        username: " Ana.Lopez ",
        workerKind: "MASTER",
      }),
    ).toEqual({
      displayName: "Ana López",
      username: "ana.lopez",
      email: "ana.lopez@sebasam.local",
      workerKind: "MASTER",
      fixedWeeklyPayCents: null,
      fixedDailyPayCents: null,
    });
  });

  it("requires a valid username and worker classification", () => {
    expect(() =>
      workerInputSchema.parse({
        displayName: "Ana",
        username: "ana",
        workerKind: "ADMIN",
      }),
    ).toThrow();
  });

  it("defaults worker searches to all statuses", () => {
    expect(workerSearchSchema.parse({})).toEqual({ query: "", status: "ALL" });
  });
});
