import "dotenv/config";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assertNonEmptyFiles, pgConnectionEnv, readBackupDestination } from "../src/lib/database-safety";

function fileSize(file: string) {
  const stat = statSync(file);
  return stat.isFile() ? stat.size : 0;
}

function sha256(file: string) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function runDump(file: string, connection: Record<string, string>, dataOnly = false) {
  const args = ["--schema=public", "--no-owner", "--no-privileges", `--file=${file}`, ...(dataOnly ? ["--data-only", "--disable-triggers"] : ["--schema-only"])];

  const result = spawnSync(process.env.PG_DUMP ?? "pg_dump", args, { stdio: ["ignore", "inherit", "inherit"], env: { ...process.env, ...connection } });
  if (result.error) {
    throw new Error("pg_dump is not available. Install the PostgreSQL client (version >= the server's) or set PG_DUMP to its path.");
  }
  if (result.status !== 0) {
    throw new Error("Public backup failed.");
  }
}

function main() {
  const destination = readBackupDestination(process.argv.slice(2));
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const output = join(destination, `sebasam-public-${timestamp}`);
  const schema = join(output, "public-schema.sql");
  const data = join(output, "public-data.sql");
  const manifest = join(output, "manifest.json");
  const checksums = join(output, "SHA256SUMS");

  const connection = pgConnectionEnv(process.env.DIRECT_URL);

  mkdirSync(output, { recursive: false });
  try {
    runDump(schema, connection);
    runDump(data, connection, true);
    assertNonEmptyFiles([schema, data], fileSize);
  } catch (error) {
    // Never leave a partial or empty backup that looks usable.
    rmSync(output, { recursive: true, force: true });
    throw error;
  }

  const hashes = {
    "public-schema.sql": sha256(schema),
    "public-data.sql": sha256(data),
  };
  writeFileSync(
    manifest,
    `${JSON.stringify({ createdAt: new Date().toISOString(), scope: "public schema and data", files: Object.keys(hashes), hashes }, null, 2)}\n`,
  );
  writeFileSync(checksums, Object.entries(hashes).map(([file, hash]) => `${hash}  ${file}`).join("\n") + "\n");
  assertNonEmptyFiles([schema, data, manifest, checksums], fileSize);

  console.log(`Created verified public backup at ${output}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Public backup failed.");
  process.exitCode = 1;
}
