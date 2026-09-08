# Apply Progress: Correct Completed Work and Payments

## Scope

- **Change**: `correct-completed-work-and-payments`
- **Active work unit**: `final-verification-and-migration`
- **Current remediation work unit**: `payroll-description-assertions`
- **Canonical successful native evidence revision**: `sha256:f779c871525d66509f85908e0f4c76915d5e67e2ddb52811addd2fd606d623a0`
- **Max additional authored changed lines** (this unit): 200
- **Actual additional authored changed lines** (this unit): 83
- **Remediation authored changed lines** (`payroll-description-assertions`): 2
- **Mode**: Strict TDD
- **Delivery strategy**: `exception-ok` (maintainer-approved `size:exception`)
- **Branch**: `feature/484-correct-completed-work-payments`
- **Native settlement**: objective `final-verification-and-migration`, outcome `passed/complete`, native changed_lines `83`, evidence `sha256:f779c871525d66509f85908e0f4c76915d5e67e2ddb52811addd2fd606d623a0`, process evidence `Phase 4 regression test added to src/features/payroll/queries.test.ts; local PostgreSQL concurrency proof passed; lint/typecheck/build passed; Prisma migration deploy verified against hosted Supabase target (no pending migrations).`; parent owns settle; no native attempt lifecycle invoked.

## Native attempt history

| Attempt | Scope | Changed lines | Native outcome | Evidence revision | Notes |
|---|---|---|---|---|---|
| Foundation attempt (1.1, 1.2, 1.4, 2.1, 2.2, 2.3) | Domain/schema/lock wiring | 1,107 | failed | `sha256:08fc4a8242b0f541be3cbcdcafb0303f17003e0da232ea2446e7a0a5cc5f8c77` | Combined changes |
| Foundation remediation (lock protocol fix) | `lockPaymentMutationScope` `FOR UPDATE` | 48 | failed | `sha256:7a9db79de27bf885f5ab1cfa0b1436059a94e40209ed405c94bb8777edc6095b` | Attempted canonical `SELECT ... FOR UPDATE`; native outcome still failed |
| PostgreSQL concurrency proof (1.3) | `src/features/payments/postgres-concurrency.test.ts` | 123 | passed | `sha256:d93634ec4821cb7788a806489abe279fb2575e84792dac3e24873dfe20707f1e` | Did not exceed 200-line cap |
| Evidence sync (artifact reconciliation) | `openspec/changes/correct-completed-work-and-payments/apply-progress.md` | 0 native / 97 pre-repair artifact-authoring | passed | (this artifact) | No application code modified; pre-repair artifact authoring report was 97 lines |
| Phase 3 attempt (3.1–3.4) | Effective reads, actions, and UI | 375 | passed | `sha256:b77c491fbe8e3113f822508a1e7780cceff780202398039f423e6f8bb2d3eeb1` | Authoritative native outcome supplied by parent; parent owns settle |
| Phase 3 evidence sync | Artifact reconciliation for tasks, TDD columns, test counts, and native history | 0 native / artifact-authoring counted below | passed | `sha256:b77c491fbe8e3113f822508a1e7780cceff780202398039f423e6f8bb2d3eeb1` | No source code, migrations, task scope, or deployment modified; Engram #2762 and #2764 synced to OpenSpec |
| Final verification and migration (4.1, 4.2) | `src/features/payroll/queries.test.ts` regression + full proof + migration deploy | 83 | passed | `sha256:f779c871525d66509f85908e0f4c76915d5e67e2ddb52811addd2fd606d623a0` | Payroll stays driven by corrected quote concepts; all quality gates and PostgreSQL concurrency proof pass; migration already applied on hosted target |
| Focused remediation (description assertions) | `src/features/payroll/queries.test.ts` — added two `description` assertions to Task 4.1 regression | 2 | passed | `sha256:a4f5547dc47a092527edb66d9f5b199be946771c18c7e8bce9cb2d354e444bc4` | Automatic-gate fix: corrected descriptions were present in fixtures but not asserted; minimal assertions added; focused payroll test passes |

## Database setup / cleanup evidence

| Step | Action | Result |
|---|---|---|
| Roles | `CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;` | Created |
| Database | `CREATE DATABASE "sebasam_test_foundation_1788808653"` | Disposable |
| Migrations | `DATABASE_URL=postgresql://pabcrz@localhost:5432/sebasam_test_foundation_1788808653?schema=public DIRECT_URL=... pnpm exec prisma migrate deploy` | 41 applied |
| Generate | `pnpm exec prisma generate` | Success |
| Cleanup | `DROP DATABASE "sebasam_test_foundation_1788808653"` | Done |
| Final concurrency database | `CREATE DATABASE "sebasam_test_final_1788854333_78899"` | Disposable |
| Final migrations | `DATABASE_URL=postgresql://pabcrz@localhost:5432/sebasam_test_final_1788854333_78899?schema=public DIRECT_URL=... pnpm exec prisma migrate deploy` | 41 applied |
| pgvector check | `CREATE EXTENSION IF NOT EXISTS vector;` | Available |
| Final cleanup | `DROP DATABASE "sebasam_test_final_1788854333_78899"` | Done |
| Remote deploy target | Hosted Supabase PostgreSQL (`aws-1-us-east-1.pooler.supabase.com:5432`) | Migration `20260907025958_add_payment_corrections` already applied; `pnpm db:migrate:deploy` reported no pending migrations |

No `.env` or committed file was modified; credentials passed via shell only. `pnpm db:migrate:deploy` and `pnpm exec prisma migrate deploy` were run against the disposable/local test databases shown above, except for the final repository-approved `pnpm db:migrate:deploy` which used the configured hosted target. The raw `DATABASE_URL`/`DIRECT_URL` values were never printed.

## Task status

- [x] 1.1 RED: quote correction tests
- [x] 1.2 RED: payment correction tests
- [x] 1.3 RED: PostgreSQL concurrency proof
- [x] 1.4 Additive schema/migration/Prisma generate
- [x] 2.1 GREEN: `lockPaymentMutationScope` + wiring
- [x] 2.2 GREEN: atomic `correctPayment` + action
- [x] 2.3 GREEN: `correctCompletedWorkQuote[FromWorkspace]`
- [x] 3.1 RED: effective reads/action tests
- [x] 3.2 GREEN: query/read-model updates
- [x] 3.3 RED: correction-dialog UI tests
- [x] 3.4 GREEN: correction dialog + wiring
- [x] 4.1 Verify payroll remains based on corrected quote concepts and historical date/reference and closed-period behavior remain out of scope.
- [x] 4.2 Run focused tests, PostgreSQL proof, `pnpm lint`, `pnpm typecheck`, `pnpm prisma generate`, and `pnpm build`; stop at 800 authored changed lines and hand off if reached.

**Cumulative progress**: 13/13 tasks complete.

## Test count reconciliation

| Run | Command | Result |
|---|---|---|
| Earlier foundation focused run | `DATABASE_URL=postgresql://pabcrz@localhost:5432/sebasam_test_foundation_1788808653?schema=public DIRECT_URL=... pnpm test:ui src/features/payments/domain.test.ts src/features/payments/actions.test.ts src/features/quotes/actions.test.ts` | 97 passed, 0 skipped, 0 failed |
| Current foundation regression run | Same foundation-focused command | 98 passed, 0 skipped, 0 failed |
| PostgreSQL concurrency proof | `DATABASE_URL=postgresql://pabcrz@localhost:5432/sebasam_test_final_1788854333_78899?schema=public DIRECT_URL=... pnpm test:ui src/features/payments/postgres-concurrency.test.ts --testTimeout=20000` | 4 passed, 0 skipped, 0 failed |
| Phase 3 focused run | `pnpm test:ui src/features/payments/actions.test.ts src/features/work-orders/queries.test.ts src/features/customers/queries.test.ts src/features/payments/components/payment-correction-dialog.test.tsx src/features/work-orders/components/work-order-completed-list.test.tsx src/features/customers/components/customer-account-statement.test.tsx src/app/admin/(protected)/customers/[id]/page.test.tsx src/app/admin/(protected)/notas/page.test.tsx` | 8 test files, 42 tests passed, 0 failed |
| Payroll regression test | `pnpm test:ui src/features/payroll/queries.test.ts` | 3 passed, 0 skipped, 0 failed |
| Payroll description-assertion remediation | `pnpm test:ui src/features/payroll/queries.test.ts` | 3 passed, 0 skipped, 0 failed |
| Final full focused proof | `pnpm test:ui src/features/payments/domain.test.ts src/features/payments/actions.test.ts src/features/quotes/actions.test.ts src/features/work-orders/queries.test.ts src/features/customers/queries.test.ts src/features/payments/components/payment-correction-dialog.test.tsx src/features/work-orders/components/work-order-completed-list.test.tsx src/features/customers/components/customer-account-statement.test.tsx src/app/admin/(protected)/customers/[id]/page.test.tsx src/app/admin/(protected)/notas/page.test.tsx src/features/payroll/domain.test.ts src/features/payroll/queries.test.ts src/features/payroll/actions.test.ts` | 13 test files, 165 tests passed, 0 failed |
| **Final combined total** | 165 focused + 4 PostgreSQL concurrency | **169 passed** |

## Work Unit Evidence

### Foundation + PostgreSQL (Units 1–2)

| Evidence | Result |
|---|---|
| **Focused test command** | `DATABASE_URL=postgresql://pabcrz@localhost:5432/sebasam_test_foundation_1788808653?schema=public DIRECT_URL=... pnpm test:ui src/features/payments/domain.test.ts src/features/payments/actions.test.ts src/features/quotes/actions.test.ts` |
| **Earlier focused test result** | 97 passed, 0 skipped, 0 failed |
| **Current foundation regression result** | 98 passed, 0 skipped, 0 failed |
| **PostgreSQL concurrency proof** | `DATABASE_URL=postgresql://pabcrz@localhost:5432/sebasam_test_foundation_1788808653?schema=public DIRECT_URL=... pnpm test:ui src/features/payments/postgres-concurrency.test.ts` → 4 passed |
| **Runtime harness** | Local PostgreSQL 16 with pgvector; disposable DB; 41 migrations; concurrent edit/capture, edit/credit, correction/reversal, idempotent correction |
| **Typecheck** | `pnpm typecheck` passes |
| **Lint** | `pnpm lint` passes (0 errors; 12 pre-existing warnings) |
| **Prisma generate** | `pnpm exec prisma generate` succeeds |
| **Rollback boundary** | Revert `src/features/payments/domain.ts` lock-protocol changes and `src/features/payments/postgres-concurrency.test.ts`; test mocks revert with production changes. |

### Phase 3 (Unit 3)

| Evidence | Result |
|---|---|
| **Focused test command** | `pnpm test:ui src/features/payments/actions.test.ts src/features/work-orders/queries.test.ts src/features/customers/queries.test.ts src/features/payments/components/payment-correction-dialog.test.tsx src/features/work-orders/components/work-order-completed-list.test.tsx src/features/customers/components/customer-account-statement.test.tsx src/app/admin/(protected)/customers/[id]/page.test.tsx src/app/admin/(protected)/notas/page.test.tsx` |
| **Focused test result** | 8 test files, 42 tests passed, 0 failed |
| **Runtime harness** | `pnpm db:migrate:deploy` and `pnpm exec prisma generate` against the disposable/local test database; admin `/admin/notas` correction and customer statement audit scenario |
| **Typecheck** | `pnpm typecheck` passes |
| **Lint** | `pnpm lint` passes (0 errors; 13 pre-existing warnings) |
| **Build** | `pnpm build` succeeds |
| **Rollback boundary** | Revert Unit 3 files: `src/features/payments/components/payment-correction-dialog.tsx`, `payment-correction-dialog.test.tsx`, `src/features/work-orders/components/work-order-completed-list.tsx`+test, `src/features/customers/components/customer-account-statement.tsx`+test, `src/app/admin/(protected)/notas/page.tsx`, `src/app/admin/(protected)/customers/[id]/page.tsx`, plus query/read-model additions in `src/features/work-orders/queries.ts`, `src/features/payments/queries.ts`, `src/features/customers/queries.ts` and their tests. Unit 1/2 foundation files remain untouched. |

### Phase 4 (Verification)

| Evidence | Result |
|---|---|
| **Focused test command** | `pnpm test:ui src/features/payroll/queries.test.ts` |
| **Focused test result** | 3 passed, 0 skipped, 0 failed (including new description assertions for both corrected items) |
| **Description assertion evidence** | `expect(weldedItem?.description).toBe("Soldadura de escape corregida");` and `expect(generalItem?.description).toBe("Alineación corregida");` |
| **Runtime harness** | Local PostgreSQL 16 with pgvector; disposable DB `sebasam_test_final_1788854333_78899`; 41 migrations applied; PostgreSQL concurrency proof passed |
| **PostgreSQL concurrency proof command** | `DATABASE_URL=postgresql://pabcrz@localhost:5432/sebasam_test_final_1788854333_78899?schema=public DIRECT_URL=... pnpm test:ui src/features/payments/postgres-concurrency.test.ts --testTimeout=20000` |
| **PostgreSQL concurrency proof result** | 4 passed, 0 skipped, 0 failed |
| **Full focused proof command** | `pnpm test:ui src/features/payments/domain.test.ts src/features/payments/actions.test.ts src/features/quotes/actions.test.ts src/features/work-orders/queries.test.ts src/features/customers/queries.test.ts src/features/payments/components/payment-correction-dialog.test.tsx src/features/work-orders/components/work-order-completed-list.test.tsx src/features/customers/components/customer-account-statement.test.tsx src/app/admin/(protected)/customers/[id]/page.test.tsx src/app/admin/(protected)/notas/page.test.tsx src/features/payroll/domain.test.ts src/features/payroll/queries.test.ts src/features/payroll/actions.test.ts` |
| **Full focused proof result** | 13 test files, 165 tests passed, 0 failed |
| **Typecheck** | `pnpm typecheck` passes |
| **Lint** | `pnpm lint` passes (0 errors; 13 warnings) |
| **Prisma generate** | `pnpm exec prisma generate` succeeds |
| **Build** | `pnpm build` succeeds |
| **Migration deploy** | `pnpm db:migrate:deploy` using configured Prisma target (hosted Supabase PostgreSQL). Output: `No pending migrations to apply.` Migration `20260907025958_add_payment_corrections` already applied; schema up to date. |
| **Rollback boundary** | Revert only `src/features/payroll/queries.test.ts` (the Phase 4 regression test). No production code was changed in this unit. |

## TDD Cycle Evidence (Strict TDD)

| Task | Test file(s) | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `src/features/quotes/actions.test.ts` | Unit | Historical safety-net output unavailable — prior quote tests not preserved. | Historical RED output unavailable — tests written before `correctCompletedWorkQuote[FromWorkspace]` implementation. | `pnpm test:ui src/features/quotes/actions.test.ts` → 70 passed | Historical triangulation output unavailable — scenario list retained: unpaid, reversed-only, active-payment rejection, capture-race, state preservation. | Historical refactor step output unavailable — focused tests still passed; `pnpm lint` clean. |
| 1.2 | `src/features/payments/domain.test.ts` `actions.test.ts` | Unit | Historical safety-net output unavailable — prior payment tests not preserved. | Historical RED output unavailable — tests written before correction domain/action implementation. | `pnpm test:ui src/features/payments/domain.test.ts src/features/payments/actions.test.ts` → 23 passed | Historical triangulation output unavailable — scenario list retained: admin authorization, actor/reason/time, rollback, replay, durable linkage, ordered mapping, shortfall, excess credit. | Historical refactor step output unavailable — focused tests still passed; `pnpm lint` clean. |
| 1.3 | `src/features/payments/postgres-concurrency.test.ts` | Runtime DB | Historical safety-net output unavailable — full-suite baseline not preserved. | Historical RED output unavailable — test written before `FOR UPDATE` lock change. | `DATABASE_URL=postgresql://pabcrz@localhost:5432/sebasam_test_final_1788854333_78899?schema=public DIRECT_URL=... pnpm test:ui src/features/payments/postgres-concurrency.test.ts` → 4 passed | Historical triangulation output unavailable — scenario list retained: concurrent edit/capture, edit/credit, correction/reversal, idempotent correction. | Refactor verified by same focused test command → 4 passed; retry helpers extracted. |
| 1.4 | N/A | N/A | N/A | N/A | `pnpm exec prisma migrate deploy` → 41 applied; `pnpm exec prisma generate` → success. | N/A | N/A |
| 2.1 | `src/features/payments/domain.test.ts` | Unit | Historical safety-net output unavailable — prior domain tests not preserved. | Historical RED output unavailable — tests written before `lockPaymentMutationScope` implementation. | `pnpm test:ui src/features/payments/domain.test.ts` → 15 passed | Historical triangulation output unavailable — scenario list retained: lock order, active re-read. | Historical refactor step output unavailable — focused tests still passed; `pnpm lint` clean. |
| 2.2 | `src/features/payments/domain.test.ts` `actions.test.ts` | Unit | Historical safety-net output unavailable — prior domain/action tests not preserved. | Historical RED output unavailable — tests written before atomic `correctPayment` implementation. | `pnpm test:ui src/features/payments/domain.test.ts src/features/payments/actions.test.ts` → 23 passed | Historical triangulation output unavailable — scenario list retained: retry, shortfall, excess, ledger links. | Historical refactor step output unavailable — post-lock active re-read verified by focused tests; `pnpm lint` clean. |
| 2.3 | `src/features/quotes/actions.test.ts` | Unit | Historical safety-net output unavailable — prior quote tests not preserved. | Historical RED output unavailable — tests written before completed-work quote correction wiring. | `pnpm test:ui src/features/quotes/actions.test.ts` → 70 passed | Historical triangulation output unavailable — scenario list retained: active-payment guard, state preservation. | Historical refactor step output unavailable — focused tests still passed; `pnpm lint` clean. |
| 3.1 | `src/features/work-orders/queries.test.ts` `src/features/payments/queries.test.ts` `src/features/customers/queries.test.ts` | Unit | Historical safety-net output unavailable — no preserved Unit 3 baseline; current foundation regression `pnpm test:ui src/features/payments/domain.test.ts src/features/payments/actions.test.ts src/features/quotes/actions.test.ts` → 98 passed. | Historical RED failure output unavailable — tests for active-only totals, completed filters, corrected note/quote data, print data, audit authorization, and customer statement history were added before query implementation. | `pnpm test:ui src/features/work-orders/queries.test.ts` → 9 passed; `pnpm test:ui src/features/payments/queries.test.ts` → 3 passed; `pnpm test:ui src/features/customers/queries.test.ts` → 8 passed | Historical triangulation output unavailable — scenario list retained: active-only balances, completed filters, corrected note/quote data, print data, audit authorization, customer statement history. | Consolidated active payment aggregation into a single raw query; verified by focused tests: `pnpm test:ui src/features/work-orders/queries.test.ts` → 9 passed; `pnpm test:ui src/features/payments/queries.test.ts` → 3 passed; `pnpm test:ui src/features/customers/queries.test.ts` → 8 passed. |
| 3.2 | `src/features/payments/domain.test.ts` | Unit | Historical safety-net output unavailable — no preserved Unit 3 baseline; current foundation regression `pnpm test:ui src/features/payments/domain.test.ts src/features/payments/actions.test.ts src/features/quotes/actions.test.ts` → 98 passed. | Historical RED failure output unavailable — audit-field expectations (`reason`, `actorId`, `actorName`, `createdAt`, `applications`) were added before extending `CorrectPaymentResult`. | `pnpm test:ui src/features/payments/domain.test.ts` → 16 passed | Historical triangulation output unavailable — scenario list retained: admin authorization, actor/reason/time, rollback, replay, durable linkage, ordered mapping, shortfall, excess credit. | Extracted `buildCorrectPaymentResult`; verified by focused tests: `pnpm test:ui src/features/payments/domain.test.ts` → 16 passed. |
| 3.3 | `src/features/payments/components/payment-correction-dialog.test.tsx` | Unit | Historical safety-net output unavailable — no preserved Unit 3 baseline; current foundation regression `pnpm test:ui src/features/payments/domain.test.ts src/features/payments/actions.test.ts src/features/quotes/actions.test.ts` → 98 passed. | Historical RED output unavailable — 6 UI tests covering context, validation, busy state, errors, audit rendering, and focus were added before component implementation. | `pnpm test:ui src/features/payments/components/payment-correction-dialog.test.tsx` → 6 passed | Historical triangulation output unavailable — scenario list retained: context, validation, busy/focus behavior, stale/active/invalid errors, linked audit rendering. | Fixed duplicate-text queries to use scoped matchers and regex matching for localized labels; verified by focused tests: `pnpm test:ui src/features/payments/components/payment-correction-dialog.test.tsx` → 6 passed. |
| 3.4 | `src/features/payments/components/payment-correction-dialog.tsx` | Component | N/A (new component file); foundation regression `pnpm test:ui src/features/payments/domain.test.ts src/features/payments/actions.test.ts src/features/quotes/actions.test.ts` → 98 passed. | Tests from 3.3 provided the RED contract; no separate failure log was preserved. | `pnpm test:ui src/features/payments/components/payment-correction-dialog.test.tsx` → 6 passed; wired into `WorkOrderCompletedList`, `CustomerAccountStatement`, `notas` and `customers/[id]` pages. | Historical triangulation output unavailable — scenario list retained: original/replacement amounts/methods, actor, reason, time, allocations, shortfalls. | Added `router.refresh()` after success; aligned action prop types with `CorrectPaymentResult`; verified by focused tests: `pnpm test:ui src/features/payments/components/payment-correction-dialog.test.tsx` → 6 passed; `pnpm typecheck` passes; `pnpm build` succeeds. |
| 4.1 | `src/features/payroll/queries.test.ts` | Unit | ✅ 36/36 payroll baseline (`pnpm test:ui src/features/payroll/domain.test.ts src/features/payroll/queries.test.ts src/features/payroll/actions.test.ts`) | ✅ Written — regression contract asserting payroll reads corrected quote item description, total, and custom payroll base; remediated to add the two missing `description` assertions after automatic-gate detection | ✅ `pnpm test:ui src/features/payroll/queries.test.ts` → 3 passed | ➖ Single scenario with two corrected items (welding + general); covers both categories, custom base, and now both corrected descriptions | ➖ None needed |
| 4.2 | N/A | Verification | N/A | N/A | All quality gates and migration deploy passed (see Work Unit Evidence Phase 4) | N/A | N/A |

## Files changed

### Foundation + PostgreSQL (Units 1–2)

`prisma/schema.prisma`, `prisma/migrations/20260907025958_add_payment_corrections/migration.sql`, `src/features/payments/domain.ts`, `src/features/payments/actions.ts`, `src/features/payments/domain.test.ts`, `src/features/payments/actions.test.ts`, `src/features/payments/postgres-concurrency.test.ts`, `src/features/quotes/actions.ts`, `src/features/quotes/lib/editability.ts`, `src/features/quotes/actions.test.ts`.

### Phase 3 (Unit 3)

`src/features/payments/components/payment-correction-dialog.tsx` (created), `src/features/payments/components/payment-correction-dialog.test.tsx` (created), `src/features/work-orders/components/work-order-completed-list.tsx`, `src/features/work-orders/components/work-order-completed-list.test.tsx`, `src/features/customers/components/customer-account-statement.tsx`, `src/features/customers/components/customer-account-statement.test.tsx`, `src/app/admin/(protected)/notas/page.tsx`, `src/app/admin/(protected)/notas/page.test.tsx`, `src/app/admin/(protected)/customers/[id]/page.tsx`, `src/app/admin/(protected)/customers/[id]/page.test.tsx`, `src/features/work-orders/queries.ts`, `src/features/work-orders/queries.test.ts`, `src/features/payments/queries.ts`, `src/features/payments/queries.test.ts` (created), `src/features/customers/queries.test.ts`, `src/features/payments/domain.ts` (audit fields on `CorrectPaymentResult`), `src/features/payments/domain.test.ts`.

### Phase 4 (Verification)

`src/features/payroll/queries.test.ts` (+83 lines — regression test proving payroll remains driven by corrected quote concepts; +2 lines in focused remediation adding the two missing `description` assertions).

## Issues found

- pgvector must be available for the disposable PostgreSQL database.
- `SERIALIZABLE` + `FOR UPDATE` can raise `40001`; test retries per design.
- PostgreSQL concurrency proof requires `--testTimeout=20000` because retry-heavy correction/reversal tests exceed the default 5000ms.
- `PaymentCorrection` table was missing before running `pnpm db:migrate:deploy`; migration `20260907025958_add_payment_corrections` applied successfully against the local/disposable test database only in earlier attempts; the final repository-approved deploy against the configured hosted target confirmed the migration was already present.
- Initial dialog tests matched duplicate "Efectivo" strings (original method label and `<option>` text); fixed by using scoped label queries.
- Historical RED failure logs and Safety Net baselines for Units 1–3 were not preserved; unavailable output is explicitly marked in the TDD table above rather than replaced with bare checkmarks.
- `pnpm test:db` and `pnpm test:integration` are not configured in `package.json`; the requested real PostgreSQL concurrency and integration coverage was executed through `pnpm test:ui`.
- Automatic gate detected that Task 4.1 regression fixtures included corrected descriptions (`Soldadura de escape corregida`, `Alineación corregida`) but assertions only verified category, totals, payroll bases, and commissions; the two missing `description` assertions were added in the focused remediation.

## Remaining tasks

All 13 tasks complete. No remaining implementation work for this change.

## Workload / PR boundary

- **Mode**: `size:exception` (maintainer-approved)
- **Current work unit**: `final-verification-and-migration`
- **Focused remediation work unit**: `payroll-description-assertions`
- **Boundary**: Phase 4 verification and migration deploy; only the payroll regression test in `src/features/payroll/queries.test.ts` was added. The focused remediation adds only the two missing `description` assertions to the existing Task 4.1 regression.
- **Budget impact**: The final-verification unit added 83 authored lines, within the 200-line cap. The focused remediation added 2 authored lines, well within the 40-line correction cap. Cumulative change remains under the maintainer-approved `size:exception`.

## Bounded remediation: completed-work correction entry point

- **Work unit**: `sdd-final-verification`, attempt 2/2; parent binding `sha256:050000ef03f87dc2caa904f1a4634cb294ebe3d1a99bb7e6d5be441858562fae`.
- **Remediates failed evidence**: `sha256:f59ce500c6cd7de7dbf2f0ba22e268390883af6779ec15f65c70b7fdda902dd5`.
- **Canonical remediation evidence revision**: `sha256:0fcf350efd1f059c1f6409dc2d037354aa32a3bb01c46506a997cefbd4ad0da4`.
- **Result**: unpaid completed work now exposes `Corregir trabajo` through `correctCompletedWorkQuoteFromWorkspace`; active-payment work hides commercial correction and directs users to payment correction in Notas.

| Task | Test file | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| UI remediation | `src/app/admin/(protected)/work-orders/[id]/page.test.tsx` | Component | 2/2 passed | 1/2 failed: correction action absent | 2/2 passed after wiring | 3/3 passed: unpaid action shown; paid action hidden | None needed |

| Evidence | Result |
|---|---|
| Focused command | `pnpm test:ui "src/app/admin/(protected)/work-orders/[id]/page.test.tsx" src/features/work-orders/queries.test.ts src/features/quotes/actions.test.ts` → 3 files, 82 tests passed |
| Static checks | `pnpm typecheck` passed; focused ESLint passed with no output |
| Runtime harness | N/A — no E2E harness is configured; jsdom page rendering and the guarded server-action regressions cover the available boundary |
| Rollback boundary | Revert only the detail page/test and its active-payment projection in `src/features/work-orders/queries.ts` |

The failed `verify-report.md` remains unchanged for independent re-verification. No lifecycle settlement, migration, commit, push, PR, archive, or RDD action was performed.
