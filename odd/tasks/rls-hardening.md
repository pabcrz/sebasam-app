# Operational Table RLS Hardening — Issue #702

## Objective

Enable row-level security on every Prisma operational table and prevent future migrations from adding unprotected tables.

## Problem and rationale

The global `public`-table privilege revocation migration predates six operational tables that do not explicitly enable RLS: `PaymentCorrection`, `PaymentCorrectionApplication`, `DailyDocumentSequence`, `QuoteCommercialCorrection`, `QuoteCommercialCorrectionApplication`, and `PayableNote`. Current `anon`/`authenticated` revocations reduce exposure, but explicit RLS provides the intended second boundary for future grants and role changes.

## Scope and constraints

- Work only in `feature/702-rls-hardening` for issue #702.
- Base: local `origin/develop` snapshot `4e761502d56a02ca237499fc6d0cabb563e47460`.
- Add a forward-only Prisma SQL migration enabling RLS on the six uncovered tables.
- Add an automated static regression check that compares Prisma model tables with RLS enable statements in migrations and fails for a model table missing RLS.
- Preserve current grants, role behavior, historical-table policies, and the Prisma server access model.
- Do not add policies, `FORCE ROW LEVEL SECURITY`, new grants, or client database access.
- Do not connect to, inspect, or mutate a remote or production database. Do not run migrations unless a disposable local PostgreSQL database is positively identified and authorized.
- Keep quote-link, Prisma upgrade, and browser-header work in their own issues/worktrees.

## Effective TDD and checks

- **Mode:** Strict TDD enabled by `openspec/config.yaml` (`strict_tdd: true`).
- **Configured test runner:** `pnpm test:ui`.
- **TDD plan:** add the static regression test first and observe it fail on the six missing RLS tables; add the migration and observe the same test pass.
- **Additional checks:** `pnpm test:ui`, `pnpm typecheck`, `pnpm lint`, and Prisma schema validation if available without database access.
- **Database harness:** no remote database. The repository's migration-evidence CI workflow may validate the migration against its own PostgreSQL fixture; no remote CI is triggered from this worktree.

## Authorized scope and acceptance criteria

- The six uncovered operational tables have RLS enabled by a new migration.
- A regression check fails when a Prisma model table has no RLS enable statement in migration history.
- No policy, role, grant, migration-history, or business behavior changes beyond this RLS boundary.
- Applicable tests and static checks pass; unavailable database validation is recorded honestly.
- Complete one Conventional Commit work unit and record its identity below; no PR or delivery operation without explicit instruction.

## Tasks

- [ ] **RLS-1 — Protect uncovered tables and prevent recurrence** (implemented and locally verified; work-unit commit remains pending). Forecast: approximately 150 authored changed lines, excluding generated artifacts. Delivery strategy: `ask-on-risk`.

## Progress and verification evidence

- Route: delegated direct; one writer owns all source changes. No SDD artifacts or phase execution.
- Branch/worktree: `feature/702-rls-hardening` / `issue-702-rls-hardening`.
- Baseline mapping evidence: before RLS-1, migration history had 28 explicit RLS enables; six of 13 tables created after `20260907000000_enable_rls_public_tables` lacked RLS. Existing role revocations/default revocations remain in the baseline migration. No `FORCE` statements were found.
- RLS-1 files changed:
  - `src/lib/rls-coverage.test.ts` — static Vitest check derives physical names from Prisma `model` declarations and optional `@@map`, then compares them with RLS-enable statements across all migration SQL.
  - `prisma/migrations/20260930100000_enable_rls_for_remaining_operational_tables/migration.sql` — enables RLS on `PaymentCorrection`, `PaymentCorrectionApplication`, `DailyDocumentSequence`, `QuoteCommercialCorrection`, `QuoteCommercialCorrectionApplication`, and `PayableNote`.
  - `odd/tasks/rls-hardening.md` — task and verification evidence.
- TDD evidence:
  - RED — `pnpm exec vitest run src/lib/rls-coverage.test.ts`: failed as expected; missing list contained exactly the six tables above.
  - GREEN — same command after adding the migration: 1 test passed.
- Verification:
  - `pnpm exec prisma generate --schema prisma/schema.prisma` — passed; generated the local Prisma Client needed by tests/typecheck, without connecting to a database.
  - `DATABASE_URL= DIRECT_URL= pnpm test:ui` — passed: 199 files passed, 3 skipped; 1,661 tests passed, 30 skipped. Empty database URL variables ensured DB-gated suites stayed skipped.
  - `pnpm lint` — passed.
  - `pnpm typecheck` — passed.
  - `DATABASE_URL=postgresql://user:password@127.0.0.1:5432/sebasam DIRECT_URL=postgresql://user:password@127.0.0.1:5432/sebasam pnpm exec prisma validate --schema prisma/schema.prisma` — passed; schema valid. The placeholder URLs were for validation only; Prisma did not connect.
  - Migration-evidence CI (`.github/workflows/prisma-migration-evidence.yml`) — unavailable locally by scope: its script uses PostgreSQL/`psql`, creates and drops fixture databases, and runs migrations. It was not run; no database connection was opened and no remote CI was triggered.
  - No policy, `FORCE ROW LEVEL SECURITY`, grant, role, schema-model, or application-authorization changes were made; historical migrations were not edited. No migration was applied to a database.
- Work-unit commit: pending; the delegated writer was instructed not to commit so the parent can perform the native RDD flow. RLS-1 remains unchecked until the parent creates the work-unit commit and completes the applicable review transition.
- RDD: enabled by default; assess the committed work unit and follow native review consent/transitions.

## Next step

Run the parent spot-check, create the Conventional Commit work unit, then perform the native RDD risk assessment/review. Do not run the database-backed migration-evidence workflow without explicit database authorization.
