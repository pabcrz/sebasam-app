# Design: Correct Completed Work and Payments

## Technical Approach

Add a state-preserving completed-work edit and an administrator-only, atomic payment replacement. Both use Prisma serializable transactions and one shared locking/guard protocol; rollback remains separate. This implements both delta specs while preserving current operational data.

## Architecture Decisions

| Decision | Alternatives / tradeoff | Choice and rationale |
|---|---|---|
| Completed edit | Reuse `updateDraftQuote`; rollback | Add `correctCompletedWorkQuote[FromWorkspace]`, reusing its commercial builders but preserving quote lifecycle fields and all `WorkOrder` operational fields. |
| Effective-payment protocol | Lock only capture; rely on serializable reads | `lockPaymentMutationScope` locks affected `Payment` source rows, then affected `Quote` rows in ascending ID with `FOR UPDATE`; it re-reads active applications and balances after locking. Completed edit locks its quote first, then rejects an active (`PAID`, unreversed) application for that note. `recordPayment`, `applyCustomerCredit`, reversal, correction, and completed edit all use it. Serializable lock conflicts are returned as “refresh and retry,” not automatically retried. Thus concurrent capture/application and edit share the target quote lock: one transaction commits and the other aborts, rather than committing an edit alongside a newly effective payment. |
| Correction audit | Infer pairing from operation keys | Add `PaymentCorrection` (unique operation/original/replacement IDs, reason, actor, timestamp) and ordered `PaymentCorrectionApplication` rows linking each original application, its nullable replacement application, target work order, original/replacement amounts, and shortfall. This makes replay and history durable. |
| Cross-note replacement | Reject applications outside the payment quote | Reverse every active application. Reapply in original `createdAt, id` order across the same target notes, allocating `min(original amount, replacement remaining, current target balance)`. A smaller replacement succeeds atomically with recorded per-target shortfalls; a larger one leaves the excess as normal customer credit. Invalid/replaced targets or any write failure abort the whole correction. |
| Effective reads and audit views | Quote-level capture totals; separate audit screen | Completed balances use unreversed applications whose payment is unreversed `PAID`. Extend the customer statement and completed-work context with correction history, while summaries count only active rows. |

## Data Flow

```text
edit/capture/credit/reversal/correction
  -> lock source payments + quote rows (canonical order)
  -> re-read active applications/balances
  -> guard or mutate -> commit

payment correction -> reverse capture/apps + linked debit ledger rows
  -> replacement capture -> ordered replacement apps/maps + credit ledger rows
  -> PaymentCorrection -> audit views
```

Same-key correction returns its stored result; a different key for an already corrected original is rejected. Reversal ledger rows set existing `reversedMovementId` links to their original movements.

## File Changes

| File | Action | Description |
|---|---|---|
| `prisma/schema.prisma`, `prisma/migrations/<timestamp>_add_payment_corrections/migration.sql` | Modify/Create | Correction and per-application mapping relations/constraints. |
| `src/features/payments/domain.ts`, `actions.ts` | Modify | Shared lock protocol; capture, credit, reversal, and replacement mutations; admin action. |
| `src/features/quotes/actions.ts`, `lib/editability.ts` | Modify | Completed unpaid commercial correction and shared guard. |
| `src/features/work-orders/queries.ts` | Modify | Active-application totals and correction-context query. |
| `src/features/customers/queries.ts`, `components/customer-account-statement.tsx` | Modify | Administrator correction-history query/panel showing original/replacement amount/method, reason, actor, time, target allocation, and shortfall. |
| `src/app/admin/(protected)/customers/[id]/page.tsx`, `src/app/admin/(protected)/work-orders/[id]/page.tsx`, `src/app/admin/(protected)/notas/page.tsx`, `src/features/work-orders/components/work-order-completed-list.tsx` | Modify | Reuse customer statement and completed detail for history; expose edit or correction action. |
| `src/features/payments/components/payment-correction-dialog.tsx`, focused tests | Create/Modify | Accessible replacement flow and RED regressions. |

## Interfaces / Contracts

```ts
type CorrectPaymentInput = {
  originalPaymentId: string; amountCents: number; method: PaymentMethod;
  reason: string; operationKey: string; actorId: string;
};
// PaymentCorrectionApplication preserves ordered original-to-replacement allocation.
```

`requireOperationalRole` authorizes unpaid completed edits; `requireAdmin` authorizes correction and audit detail. UI maps stale/active/invalid errors without exposing Prisma errors.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Domain | RED: edit races separately with capture and credit application; reversal/correction races; guard re-read; ordered multi-note reapply, shortfall/excess, rollback, linkage, replay | Stateful doubles plus PostgreSQL concurrent-transaction tests for row locks/serializable aborts. |
| Query/action | Active applications exclude reversed rows; completed filters; admin audit authorization/data | Extend payment, quote, work-order, and customer query/action tests. |
| UI | Notes/detail actions; customer statement and completed detail show linked history, shortfall, reason/actor | Testing Library tests. |
| Document | Print uses current commercial data and active totals only | `getCompletedWorkOrderById` regression. |

## Risks

Lock ordering must remain canonical to avoid deadlocks; cross-note corrections may expose expected outstanding balances after a smaller replacement. Payroll remains based on current quote items; closed-period policy is unchanged.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

Additive migration only; no backfill. Generate Prisma, deploy, then enable entry points. The repository policy threshold remains 400 changed lines (additions + deletions). For issue #484, the maintainer explicitly approved `size:exception`, so `delivery_strategy` is `exception-ok`: one PR is permitted even when the forecast exceeds 400 changed lines. Commit domain+migration+tests and UI+tests as coherent work units; stop the implementation session at 800 changed lines and hand off remaining work. Roll back UI/query code without deleting audit rows.

## Open Questions

- [ ] None.
