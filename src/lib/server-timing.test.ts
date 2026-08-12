import { afterEach, describe, expect, it, vi } from "vitest";
import { measureServerTiming, recordServerTiming } from "./server-timing";

describe("server timing", () => {
  afterEach(() => {
    delete process.env.SEBASAM_PERF_TIMINGS;
    vi.restoreAllMocks();
  });

  it("is silent unless explicitly enabled", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await expect(measureServerTiming("auth", "session.user", async () => "ok")).resolves.toBe("ok");

    expect(info).not.toHaveBeenCalled();
  });

  it("logs only bounded stage metadata when enabled", () => {
    process.env.SEBASAM_PERF_TIMINGS = "1";
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    recordServerTiming("prisma", "database.operation", 1.2345);

    expect(info).toHaveBeenCalledWith("[server-timing]", {
      stage: "prisma",
      operation: "database.operation",
      durationMs: 1.23,
      outcome: "success",
    });
  });
});
