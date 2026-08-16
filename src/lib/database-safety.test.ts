import { describe, expect, it } from "vitest";
import { assertLocalPrismaUrls, assertNonEmptyFiles, readBackupDestination } from "./database-safety";

const localUrl = "postgresql://user:password@localhost:5432/sebasam";

describe("assertLocalPrismaUrls", () => {
  it.each(["localhost", "127.0.0.1", "[::1]"])("allows the explicit local host %s", (host) => {
    expect(() =>
      assertLocalPrismaUrls({
        DATABASE_URL: `postgresql://user:password@${host}:5432/sebasam`,
        DIRECT_URL: localUrl,
      }),
    ).not.toThrow();
  });

  it.each([
    "postgresql://user:password@db.project.supabase.co:5432/sebasam",
    "postgresql://user:password@aws-0-us-east-1.pooler.supabase.com:5432/sebasam",
    "postgresql://user:password@database.internal:5432/sebasam",
    "not a url",
  ])("rejects remote or malformed URLs", (databaseUrl) => {
    expect(() => assertLocalPrismaUrls({ DATABASE_URL: databaseUrl, DIRECT_URL: localUrl })).toThrow();
  });

  it("requires both Prisma connection URLs", () => {
    expect(() => assertLocalPrismaUrls({ DATABASE_URL: localUrl })).toThrow("DIRECT_URL is required");
  });
});

describe("backup validation", () => {
  it("requires one absolute destination", () => {
    expect(() => readBackupDestination([])).toThrow();
    expect(() => readBackupDestination(["--destination", "backups"])).toThrow();
    expect(() => readBackupDestination(["--destination", "/Volumes/USB", "--destination", "/tmp/other"])).toThrow();
    expect(readBackupDestination(["--destination=/Volumes/USB/SEBASAM"])).toBe("/Volumes/USB/SEBASAM");
  });

  it("accepts only non-empty required output files", () => {
    const files = ["public-schema.sql", "public-data.sql", "manifest.json", "SHA256SUMS"];
    expect(() => assertNonEmptyFiles(files, () => 1)).not.toThrow();
    expect(() => assertNonEmptyFiles(files, (file) => (file === "public-data.sql" ? 0 : 1))).toThrow(
      "public-data.sql",
    );
    expect(() => assertNonEmptyFiles(files, () => {
      throw new Error("not found");
    })).toThrow("public-schema.sql");
  });
});
