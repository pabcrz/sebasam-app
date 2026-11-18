import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { recordServerTiming } from "@/lib/server-timing";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function initializePrismaClient() {
  const timingEnabled = process.env.SEBASAM_PERF_TIMINGS === "1";
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const client = new PrismaClient({
    adapter,
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

export const prisma = globalForPrisma.prisma ?? initializePrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
