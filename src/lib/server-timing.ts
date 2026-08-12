export type ServerTimingStage = "auth" | "profile" | "prisma" | "action" | "post-action" | "render";

function isServerTimingEnabled() {
  return process.env.SEBASAM_PERF_TIMINGS === "1";
}

export function recordServerTiming(
  stage: ServerTimingStage,
  operation: string,
  durationMs: number,
  outcome: "success" | "error" = "success",
) {
  if (!isServerTimingEnabled()) return;

  const boundedDuration = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
  console.info("[server-timing]", {
    stage,
    operation,
    durationMs: Math.round(boundedDuration * 100) / 100,
    outcome,
  });
}

export async function measureServerTiming<T>(
  stage: ServerTimingStage,
  operation: string,
  callback: () => Promise<T>,
): Promise<T> {
  if (!isServerTimingEnabled()) return callback();

  const startedAt = performance.now();
  try {
    const result = await callback();
    recordServerTiming(stage, operation, performance.now() - startedAt);
    return result;
  } catch (error) {
    recordServerTiming(stage, operation, performance.now() - startedAt, "error");
    throw error;
  }
}
