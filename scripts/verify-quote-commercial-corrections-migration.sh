#!/usr/bin/env bash
set -euo pipefail

readonly migration_name="20260912190000_add_quote_commercial_corrections"
readonly migration_file="prisma/migrations/${migration_name}/migration.sql"
readonly postgres_host="${POSTGRES_HOST:-127.0.0.1}"
readonly postgres_port="${POSTGRES_PORT:-5432}"
readonly postgres_user="${POSTGRES_USER:-postgres}"
readonly admin_url="postgresql://${postgres_user}@${postgres_host}:${postgres_port}/postgres"
readonly temporary_root="$(mktemp -d)"

case "$postgres_host" in
  127.0.0.1|localhost|::1) ;;
  *)
    printf 'Migration evidence only supports an isolated local PostgreSQL host.\n' >&2
    exit 1
    ;;
esac

ensure_supabase_migration_roles() {
  psql "$admin_url" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$$;
SQL
}

database_url() {
  local database_name="$1"
  printf 'postgresql://%s@%s:%s/%s' "$postgres_user" "$postgres_host" "$postgres_port" "$database_name"
}

drop_database() {
  local database_name="$1"
  psql "$admin_url" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"${database_name}\" WITH (FORCE)" >/dev/null
}

create_database() {
  local database_name="$1"
  drop_database "$database_name"
  psql "$admin_url" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${database_name}\"" >/dev/null
}

assert_migration_row() {
  local database_name="$1"
  local expected_count="$2"
  local actual_count

  actual_count="$(psql "$(database_url "$database_name")" -At -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM \"_prisma_migrations\" WHERE migration_name = '${migration_name}'")"
  test "$actual_count" = "$expected_count"
}

apply_pending_migrations() {
  local database_name="$1"
  local schema_path="$2"
  local url

  url="$(database_url "$database_name")"
  DATABASE_URL="$url" DIRECT_URL="$url" pnpm exec prisma migrate deploy --schema "$schema_path"
}

prepare_pre_migration_schema() {
  local database_name="$1"
  local baseline_root="${temporary_root}/${database_name}"

  cp -R prisma "$baseline_root"
  rm -rf "${baseline_root}/migrations/${migration_name}"
  apply_pending_migrations "$database_name" "${baseline_root}/schema.prisma"
}

apply_migration_sql_without_history() {
  local database_name="$1"
  psql "$(database_url "$database_name")" -v ON_ERROR_STOP=1 -f "$migration_file" >/dev/null
}

cleanup() {
  drop_database quote_commercial_corrections_clean || true
  drop_database quote_commercial_corrections_legacy || true
  drop_database quote_commercial_corrections_drifted || true
  rm -rf "$temporary_root"
}

trap cleanup EXIT

test -f "$migration_file"
ensure_supabase_migration_roles

printf 'Verifying clean database migration...\n'
create_database quote_commercial_corrections_clean
apply_pending_migrations quote_commercial_corrections_clean prisma/schema.prisma
assert_migration_row quote_commercial_corrections_clean 1

printf 'Verifying exact legacy tables without migration history...\n'
create_database quote_commercial_corrections_legacy
prepare_pre_migration_schema quote_commercial_corrections_legacy
apply_migration_sql_without_history quote_commercial_corrections_legacy
assert_migration_row quote_commercial_corrections_legacy 0
apply_pending_migrations quote_commercial_corrections_legacy prisma/schema.prisma
assert_migration_row quote_commercial_corrections_legacy 1

printf 'Verifying drifted legacy tables are rejected...\n'
create_database quote_commercial_corrections_drifted
prepare_pre_migration_schema quote_commercial_corrections_drifted
apply_migration_sql_without_history quote_commercial_corrections_drifted
psql "$(database_url quote_commercial_corrections_drifted)" -v ON_ERROR_STOP=1 -c 'ALTER TABLE "QuoteCommercialCorrection" ADD COLUMN "unexpectedDrift" TEXT' >/dev/null
assert_migration_row quote_commercial_corrections_drifted 0

if apply_pending_migrations quote_commercial_corrections_drifted prisma/schema.prisma >"${temporary_root}/drifted.log" 2>&1; then
  printf 'Expected the drifted legacy schema to fail migration validation.\n' >&2
  exit 1
fi

grep -Fq 'Quote commercial correction table columns do not match the Prisma schema' "${temporary_root}/drifted.log"
assert_migration_row quote_commercial_corrections_drifted 0

printf 'Quote commercial correction migration evidence passed.\n'
