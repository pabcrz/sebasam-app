import { PrismaClient } from "@prisma/client";
import { recordServerTiming } from "@/lib/server-timing";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const timingEnabled = process.env.SEBASAM_PERF_TIMINGS === "1";
  const client = new PrismaClient({
    log: timingEnabled
      ? [{ emit: "event", level: "query" }, "error", "warn"]
      : process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

  if (timingEnabled) {
    client.$on("query", (event) => {
      recordServerTiming("prisma", "database.operation", event.duration);
    });
  }

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
