import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assertNonEmptyFiles, readBackupDestination } from "../src/lib/database-safety";

function fileSize(file: string) {
  const stat = statSync(file);
  return stat.isFile() ? stat.size : 0;
}

function sha256(file: string) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function runDump(file: string, dataOnly = false) {
  const args = ["db", "dump", "--linked", "--schema", "public", "--file", file];
  if (dataOnly) args.push("--data-only");

  const result = spawnSync("supabase", args, { stdio: "inherit" });
  if (result.error || result.status !== 0) {
    throw new Error("Supabase public backup failed.");
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

  mkdirSync(output, { recursive: false });
  runDump(schema);
  runDump(data, true);
  assertNonEmptyFiles([schema, data], fileSize);

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
