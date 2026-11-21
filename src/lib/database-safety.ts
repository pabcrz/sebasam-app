import { basename, isAbsolute } from "node:path";

const localPostgresHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
const prismaConnectionVariables = ["DATABASE_URL", "DIRECT_URL"] as const;

type Environment = Record<string, string | undefined>;

export function assertLocalPrismaUrls(environment: Environment) {
  for (const name of prismaConnectionVariables) {
    const value = environment[name]?.trim();
    if (!value) throw new Error(`${name} is required for local development migrations.`);

    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`${name} must be a valid local PostgreSQL URL.`);
    }

    if (
      url.protocol !== "postgresql:" ||
      !url.pathname ||
      url.pathname === "/" ||
      !localPostgresHosts.has(url.hostname.toLowerCase())
    ) {
      throw new Error(`${name} must use localhost, 127.0.0.1, or [::1].`);
    }
  }
}

export function readBackupDestination(args: string[]) {
  let destination: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    // pnpm forwards the "--" in `pnpm run script -- --flag`; it is a separator, not an argument.
    if (argument === "--") continue;
    const value =
      argument === "--destination"
        ? args[++index]
        : argument?.startsWith("--destination=")
          ? argument.slice("--destination=".length)
          : undefined;

    if (!value || destination) {
      throw new Error("Use one --destination <absolute-path> option.");
    }
    destination = value;
  }

  if (!destination || !isAbsolute(destination)) {
    throw new Error("Backup destination must be an absolute path, such as /Volumes/USB/SEBASAM.");
  }

  return destination;
}

export function assertNonEmptyFiles(files: readonly string[], getSize: (file: string) => number) {
  for (const file of files) {
    let size = 0;
    try {
      size = getSize(file);
    } catch {
      // Treat unreadable paths as invalid output without exposing their contents.
    }
    if (!Number.isFinite(size) || size <= 0) {
      throw new Error(`Backup output is missing or empty: ${basename(file)}.`);
    }
  }
}

/** Splits a PostgreSQL URL into PG* variables so pg_dump never receives credentials in its arguments. */
export function pgConnectionEnv(url: string | undefined) {
  if (!url) throw new Error("DIRECT_URL is required for the public backup.");
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("DIRECT_URL is not a valid PostgreSQL URL.");
  }
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error("DIRECT_URL is not a valid PostgreSQL URL.");
  }

  const env: Record<string, string> = {
    PGHOST: parsed.hostname.replace(/^\[|\]$/g, ""),
    PGPORT: parsed.port || "5432",
    PGUSER: decodeURIComponent(parsed.username),
    PGPASSWORD: decodeURIComponent(parsed.password),
    PGDATABASE: decodeURIComponent(parsed.pathname.replace(/^\//, "")) || "postgres",
  };
  const sslmode = parsed.searchParams.get("sslmode");
  if (sslmode) env.PGSSLMODE = sslmode;
  return env;
}
