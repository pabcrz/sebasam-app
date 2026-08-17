import { spawnSync } from "node:child_process";
import { assertLocalPrismaUrls } from "../src/lib/database-safety";

function main() {
  assertLocalPrismaUrls(process.env);

  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(command, ["exec", "prisma", "migrate", "dev", ...process.argv.slice(2)], {
    stdio: "inherit",
  });

  if (result.error || result.status === null) {
    throw new Error("Prisma could not be started.");
  }
  process.exitCode = result.status;
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Local migration guard failed.");
  process.exitCode = 1;
}
