import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationDirectory = resolve(process.cwd(), "prisma/migrations");

async function readPrismaTableNames() {
  const schema = await readFile(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const models = [...schema.matchAll(/^\s*model\s+(\w+)\s*\{([\s\S]*?)^\s*\}/gm)];

  return models.map(([, modelName, body]) => {
    const mappedName = body.match(/^\s*@@map\(\s*"([^"]+)"\s*\)\s*$/m)?.[1];
    return mappedName ?? modelName;
  });
}

async function readMigrationSql() {
  const entries = await readdir(migrationDirectory, { withFileTypes: true });
  const migrationFiles = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(migrationDirectory, entry.name, "migration.sql"));

  return (await Promise.all(migrationFiles.map((file) => readFile(file, "utf8")))).join("\n");
}

function readRlsEnabledTableNames(sql: string) {
  const uncommentedSql = sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");
  const statement = /\bALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?(?:(?:"(?:[^"]|"")+"|[A-Za-z_][\w$]*)\s*\.\s*)?(?:"((?:[^"]|"")*)"|([A-Za-z_][\w$]*))\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY\b/gi;

  return new Set(
    [...uncommentedSql.matchAll(statement)].map(([, quotedName, unquotedName]) =>
      quotedName === undefined ? unquotedName.toLowerCase() : quotedName.replaceAll('""', '"'),
    ),
  );
}

describe("Prisma table RLS coverage", () => {
  it("enables RLS for every Prisma model table in migration history", async () => {
    const [tableNames, migrationSql] = await Promise.all([readPrismaTableNames(), readMigrationSql()]);
    const enabledTableNames = readRlsEnabledTableNames(migrationSql);
    const tablesWithoutRls = tableNames.filter((tableName) => !enabledTableNames.has(tableName));

    expect(tablesWithoutRls).toEqual([]);
  });
});
