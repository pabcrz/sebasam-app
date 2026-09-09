# Tasks: Correct Completed Work and Payments

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 850–1,050 authored lines (generated Prisma output excluded) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes; retain coherent work-unit commits |
| Suggested split | Unit 1 domain/schema; Unit 2 reads/actions; Unit 3 UI |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Schema, locks, correction domain | PR 1 | `pnpm test:ui -- src/features/payments/domain.test.ts src/features/quotes/actions.test.ts` | PostgreSQL concurrent transactions | Prisma migration and payment/quote domain files |
| 2 | Effective reads and authorized actions | PR 1 | `pnpm test:ui -- src/features/payments/actions.test.ts src/features/work-orders/queries.test.ts src/features/customers/queries.test.ts` | `pnpm db:migrate:deploy` | Query/action changes and their tests |
| 3 | Completed-work UI, audit views, final proof | PR 1 | `pnpm test:ui -- src/features/payments/components/payment-correction-dialog.test.tsx src/features/work-orders/components/work-order-completed-list.test.tsx src/features/customers/components/customer-account-statement.test.tsx` | Admin `/admin/notas` correction and customer statement audit scenario | Entry points, dialog, audit rendering, and UI tests |

## Phase 1: RED Contracts and Persistence Foundation

- [x] 1.1 RED: extend `src/features/quotes/actions.test.ts` for unpaid, reversed-only, active-payment rejection, capture-race, and state preservation.
- [x] 1.2 RED: extend payment domain/action tests for admin authorization, actor/reason/time, rollback, replay, durable linkage, ordered mapping, shortfall, and excess credit.
- [x] 1.3 RED: add `src/features/payments/postgres-concurrency.test.ts` proving canonical locks and serializable aborts across edit, capture, credit, reversal, and correction; threat matrix is N/A.
- [x] 1.4 Add additive `prisma/schema.prisma` models/constraints for `PaymentCorrection` and ordered `PaymentCorrectionApplication`, create the migration, and run `pnpm prisma generate`.

## Phase 2: GREEN Domain and Completed Correction

- [x] 2.1 GREEN: implement `lockPaymentMutationScope` in `src/features/payments/domain.ts`; re-read active applications/balances and wire capture, credit, reversal, correction, and edit to it.
- [x] 2.2 GREEN: implement atomic payment correction in `src/features/payments/domain.ts`/`actions.ts`, reversing captures/applications/ledger links, replaying applications in `createdAt,id` order, persisting mappings, and enforcing admin/error contracts.
- [x] 2.3 GREEN: implement state-preserving `correctCompletedWorkQuote[FromWorkspace]` in `src/features/quotes/actions.ts`/`lib/editability.ts` with transaction-time active-payment guard and unchanged operational/lifecycle fields.

## Phase 3: Effective Reads, Actions, and UI

- [x] 3.1 RED: add query/action tests for active-only balances, completed filters, corrected note/quote data, print data, audit authorization, and customer statement history.
- [x] 3.2 GREEN: update `src/features/work-orders/queries.ts`, `src/features/customers/queries.ts`, and payment read models to use active applications/payments and expose correction audit data.
- [x] 3.3 RED: add accessible UI tests for one correction dialog, validation, busy/focus behavior, stale/active/invalid errors, and linked audit rendering.
- [x] 3.4 GREEN: create `src/features/payments/components/payment-correction-dialog.tsx`; wire completed list/detail, `notas`, customer statement, and admin pages; show original/replacement amounts/methods, actor, reason, time, allocations, and shortfalls.

## Phase 4: Verification

- [x] 4.1 Verify payroll remains based on corrected quote concepts and historical date/reference and closed-period behavior remain out of scope.
- [x] 4.2 Run focused tests, PostgreSQL proof, `pnpm lint`, `pnpm typecheck`, `pnpm prisma generate`, and `pnpm build`; stop at 800 authored changed lines and hand off if reached.
