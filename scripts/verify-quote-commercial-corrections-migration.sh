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

  actual_count="$(psql "$(database_url "$database_name")" -At -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM \"_prisma_migrations\" WHERE migration_name = '${migration_name}' AND finished_at IS NOT NULL")"
  test "$actual_count" = "$expected_count"
}

assert_failed_migration_row() {
  local database_name="$1"
  local actual_count

  actual_count="$(psql "$(database_url "$database_name")" -At -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM \"_prisma_migrations\" WHERE migration_name = '${migration_name}' AND finished_at IS NULL AND rolled_back_at IS NULL")"
  test "$actual_count" = "1"
}

snapshot_monitored_tables() {
  local database_name="$1"

  psql "$(database_url "$database_name")" -Atq -v ON_ERROR_STOP=1 <<'SQL'
WITH table_snapshots AS (
  SELECT 'Quote' AS table_name, jsonb_build_object('count', count(*), 'rows', COALESCE(jsonb_agg(to_jsonb(row_data) ORDER BY row_data.id), '[]'::jsonb)) AS snapshot FROM "Quote" AS row_data
  UNION ALL SELECT 'WorkOrder', jsonb_build_object('count', count(*), 'rows', COALESCE(jsonb_agg(to_jsonb(row_data) ORDER BY row_data.id), '[]'::jsonb)) FROM "WorkOrder" AS row_data
  UNION ALL SELECT 'Payment', jsonb_build_object('count', count(*), 'rows', COALESCE(jsonb_agg(to_jsonb(row_data) ORDER BY row_data.id), '[]'::jsonb)) FROM "Payment" AS row_data
  UNION ALL SELECT 'PaymentApplication', jsonb_build_object('count', count(*), 'rows', COALESCE(jsonb_agg(to_jsonb(row_data) ORDER BY row_data.id), '[]'::jsonb)) FROM "PaymentApplication" AS row_data
  UNION ALL SELECT 'LedgerEntry', jsonb_build_object('count', count(*), 'rows', COALESCE(jsonb_agg(to_jsonb(row_data) ORDER BY row_data.id), '[]'::jsonb)) FROM "LedgerEntry" AS row_data
  UNION ALL SELECT 'PaymentRequest', jsonb_build_object('count', count(*), 'rows', COALESCE(jsonb_agg(to_jsonb(row_data) ORDER BY row_data.id), '[]'::jsonb)) FROM "PaymentRequest" AS row_data
  UNION ALL SELECT 'SettlementAgreement', jsonb_build_object('count', count(*), 'rows', COALESCE(jsonb_agg(to_jsonb(row_data) ORDER BY row_data.id), '[]'::jsonb)) FROM "SettlementAgreement" AS row_data
)
SELECT jsonb_object_agg(table_name, snapshot ORDER BY table_name) FROM table_snapshots;
SQL
}

assert_monitored_tables_unchanged() {
  local database_name="$1"
  local before_snapshot="$2"
  local after_snapshot

  after_snapshot="$(snapshot_monitored_tables "$database_name")"
  if [[ "$after_snapshot" != "$before_snapshot" ]]; then
    printf 'Monitored legacy rows changed while applying %s.\nBefore: %s\nAfter: %s\n' "$migration_name" "$before_snapshot" "$after_snapshot" >&2
    return 1
  fi
}

assert_correction_tables_empty() {
  local database_name="$1"
  local correction_count application_count

  correction_count="$(psql "$(database_url "$database_name")" -Atq -v ON_ERROR_STOP=1 -c 'SELECT count(*) FROM "QuoteCommercialCorrection"')"
  application_count="$(psql "$(database_url "$database_name")" -Atq -v ON_ERROR_STOP=1 -c 'SELECT count(*) FROM "QuoteCommercialCorrectionApplication"')"
  test "$correction_count" = "0"
  test "$application_count" = "0"
}

apply_pending_migrations() {
  local database_name="$1"
  local schema_path="$2"
  local url

  url="$(database_url "$database_name")"
  DATABASE_URL="$url" DIRECT_URL="$url" pnpm exec prisma migrate deploy --schema "$schema_path"
}

historical_schema_path() {
  printf '%s/%s/schema.prisma' "$temporary_root" "$1"
}

apply_target_migration_with_history() {
  local database_name="$1"
  local schema_path
  local migration_root migration_dir migration_dir_name

  schema_path="$(historical_schema_path "$database_name")"
  migration_root="$(dirname "$schema_path")/migrations"
  if [[ -e "${migration_root}/${migration_name}" ]]; then
    printf 'Target migration %s unexpectedly exists before it is restored.\n' "$migration_name" >&2
    return 1
  fi

  cp -R "prisma/migrations/${migration_name}" "$migration_root/"

  for migration_dir in "$migration_root"/*; do
    [[ -d "$migration_dir" ]] || continue
    migration_dir_name="${migration_dir##*/}"
    if [[ "$migration_dir_name" > "$migration_name" ]]; then
      printf 'Refusing historical validation with newer migration present: %s\n' "$migration_dir_name" >&2
      return 1
    fi
  done

  if [[ ! -d "${migration_root}/${migration_name}" ]]; then
    printf 'Target migration %s is missing from the restored historical migration set.\n' "$migration_name" >&2
    return 1
  fi

  apply_pending_migrations "$database_name" "$schema_path"
}

prepare_pre_migration_schema() {
  local database_name="$1"
  local baseline_root="${temporary_root}/${database_name}"
  local migration_dir migration_dir_name

  cp -R prisma "$baseline_root"
  for migration_dir in "${baseline_root}"/migrations/*; do
    [[ -d "$migration_dir" ]] || continue
    migration_dir_name="${migration_dir##*/}"
    if [[ "$migration_dir_name" > "$migration_name" || "$migration_dir_name" == "$migration_name" ]]; then
      rm -rf "$migration_dir"
    fi
  done

  for migration_dir in "${baseline_root}"/migrations/*; do
    [[ -d "$migration_dir" ]] || continue
    migration_dir_name="${migration_dir##*/}"
    if [[ "$migration_dir_name" > "$migration_name" ]]; then
      printf 'Unexpected migration after %s in prepared historical schema: %s\n' "$migration_name" "$migration_dir_name" >&2
      return 1
    fi
  done

  apply_pending_migrations "$database_name" "${baseline_root}/schema.prisma"
}

apply_migration_sql_without_history() {
  local database_name="$1"
  psql "$(database_url "$database_name")" -v ON_ERROR_STOP=1 -f "$migration_file" >/dev/null
}

create_historical_completed_note_fixture() {
  local database_name="$1"

  # A note is its Quote plus the unique completed WorkOrder. This fixture covers
  # both folio states; one note also has the financial records allowed by the
  # current schema so #599 must preserve existing operational history.
  psql "$(database_url "$database_name")" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
INSERT INTO "Customer" ("id", "name", "updatedAt")
VALUES ('fixture-customer', 'Historical note customer', '2026-09-12T00:00:00Z');

INSERT INTO "UserProfile" ("id", "email", "displayName", "username", "updatedAt")
VALUES ('11111111-1111-1111-1111-111111111111', 'fixture-note@example.test', 'Historical note actor', 'fixture-note-actor', '2026-09-12T00:00:00Z');

INSERT INTO "Quote" ("id", "customerId", "number", "folio", "issuedAt", "status", "title", "subtotalCents", "taxCents", "totalCents", "taxEnabled", "operationalDate", "createdAt", "updatedAt")
VALUES
  ('fixture-note-with-folio', 'fixture-customer', 'Q-FIXTURE-001', 'N-20260912-001', '2026-09-12T00:00:00Z', 'APPROVED', 'Historical completed note with folio', 10000, 1600, 11600, true, '2026-09-12', '2026-09-12T00:00:00Z', '2026-09-12T00:00:00Z'),
  ('fixture-note-without-folio', 'fixture-customer', 'Q-FIXTURE-002', NULL, NULL, 'APPROVED', 'Historical completed note without folio', 5000, 800, 5800, true, '2026-09-12', '2026-09-12T00:00:00Z', '2026-09-12T00:00:00Z');

INSERT INTO "WorkOrder" ("id", "quoteId", "number", "folio", "issuedAt", "status", "completedAt", "createdAt", "updatedAt")
VALUES
  ('fixture-work-order-with-folio', 'fixture-note-with-folio', 'WO-FIXTURE-001', 'N-20260912-001', '2026-09-12T00:00:00Z', 'COMPLETED', '2026-09-12T01:00:00Z', '2026-09-12T00:00:00Z', '2026-09-12T01:00:00Z'),
  ('fixture-work-order-without-folio', 'fixture-note-without-folio', 'WO-FIXTURE-002', NULL, NULL, 'COMPLETED', '2026-09-12T01:00:00Z', '2026-09-12T00:00:00Z', '2026-09-12T01:00:00Z');

INSERT INTO "PaymentRequest" ("id", "token", "status", "customerId", "quoteId", "workOrderId", "expiresAt", "createdAt", "updatedAt")
VALUES ('fixture-payment-request', 'fixture-payment-request-token', 'READY_TO_PAY', 'fixture-customer', 'fixture-note-with-folio', 'fixture-work-order-with-folio', '2026-10-12T00:00:00Z', '2026-09-12T00:00:00Z', '2026-09-12T00:00:00Z');

INSERT INTO "Payment" ("id", "operationKey", "customerId", "quoteId", "paymentRequestId", "method", "amountCents", "status", "createdAt", "updatedAt")
VALUES ('fixture-payment', 'fixture-payment-operation', 'fixture-customer', 'fixture-note-with-folio', 'fixture-payment-request', 'TRANSFER', 11600, 'PAID', '2026-09-12T00:00:00Z', '2026-09-12T00:00:00Z');

INSERT INTO "PaymentApplication" ("id", "operationKey", "paymentId", "workOrderId", "amountCents", "createdAt")
VALUES ('fixture-payment-application', 'fixture-payment-application-operation', 'fixture-payment', 'fixture-work-order-with-folio', 11600, '2026-09-12T00:00:00Z');

INSERT INTO "LedgerEntry" ("id", "customerId", "type", "movementType", "amountCents", "resultingBalanceCents", "paymentId", "paymentApplicationId", "workOrderId", "createdAt")
VALUES ('fixture-ledger-entry', 'fixture-customer', 'CREDIT', 'PAYMENT_APPLICATION', 11600, 0, 'fixture-payment', 'fixture-payment-application', 'fixture-work-order-with-folio', '2026-09-12T00:00:00Z');

INSERT INTO "SettlementAgreement" ("id", "quoteId", "status", "nominalSubtotalCents", "nominalTaxCents", "nominalTotalCents", "settlementBaseCents", "settlementTaxCents", "settlementTotalCents", "reason", "actorId", "createdAt", "updatedAt")
VALUES ('fixture-settlement-agreement', 'fixture-note-with-folio', 'ACTIVE', 10000, 1600, 11600, 10000, 1600, 11600, 'Historical completed note fixture', '11111111-1111-1111-1111-111111111111', '2026-09-12T00:00:00Z', '2026-09-12T00:00:00Z');
SQL
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
assert_correction_tables_empty quote_commercial_corrections_clean

printf 'Verifying legacy completed notes and exact tables without migration history...\n'
create_database quote_commercial_corrections_legacy
prepare_pre_migration_schema quote_commercial_corrections_legacy
create_historical_completed_note_fixture quote_commercial_corrections_legacy
legacy_snapshot="$(snapshot_monitored_tables quote_commercial_corrections_legacy)"
apply_migration_sql_without_history quote_commercial_corrections_legacy
assert_monitored_tables_unchanged quote_commercial_corrections_legacy "$legacy_snapshot"
assert_correction_tables_empty quote_commercial_corrections_legacy
assert_migration_row quote_commercial_corrections_legacy 0
apply_target_migration_with_history quote_commercial_corrections_legacy
assert_migration_row quote_commercial_corrections_legacy 1
assert_monitored_tables_unchanged quote_commercial_corrections_legacy "$legacy_snapshot"
assert_correction_tables_empty quote_commercial_corrections_legacy

printf 'Verifying drifted legacy tables are rejected...\n'
create_database quote_commercial_corrections_drifted
prepare_pre_migration_schema quote_commercial_corrections_drifted
apply_migration_sql_without_history quote_commercial_corrections_drifted
psql "$(database_url quote_commercial_corrections_drifted)" -v ON_ERROR_STOP=1 -c 'ALTER TABLE "QuoteCommercialCorrection" ADD COLUMN "unexpectedDrift" TEXT' >/dev/null
assert_migration_row quote_commercial_corrections_drifted 0

if apply_target_migration_with_history quote_commercial_corrections_drifted >"${temporary_root}/drifted.log" 2>&1; then
  printf 'Expected the drifted legacy schema to fail migration validation.\n' >&2
  exit 1
fi
assert_failed_migration_row quote_commercial_corrections_drifted

if ! grep -Fq 'Quote commercial correction table columns do not match the Prisma schema' "${temporary_root}/drifted.log"; then
  printf 'Drift rejection did not report the expected structural validation failure.\n' >&2
  cat "${temporary_root}/drifted.log" >&2
  exit 1
fi
assert_migration_row quote_commercial_corrections_drifted 0

printf 'Quote commercial correction migration evidence passed.\n'
